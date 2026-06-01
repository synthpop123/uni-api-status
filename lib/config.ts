import fs from "node:fs"
import yaml from "js-yaml"
import { ApiError } from "@/lib/api-helpers"
import type { ApiKeyEntry, ProviderInfo } from "@/lib/types"

interface UniApiConfig {
  api_keys?: ApiKeyEntry[]
  providers?: RawProvider[]
  [key: string]: unknown
}

interface RawProvider {
  provider: string
  base_url: string
  api: string
  model?: Array<string | Record<string, string>>
}

const getApiYamlPath = () => process.env.API_YAML_PATH || "/app/data/api.yaml"

/** 读取并解析 api.yaml，返回原始文本与解析后的配置；文件缺失或格式非法时抛 ApiError */
export function readConfig(): { raw: string; config: UniApiConfig } {
  const path = getApiYamlPath()
  if (!fs.existsSync(path)) {
    throw new ApiError(500, "Configuration file not found")
  }
  const raw = fs.readFileSync(path, "utf8")
  const config = yaml.load(raw) as UniApiConfig
  if (!config?.api_keys || !Array.isArray(config.api_keys)) {
    throw new ApiError(500, "Invalid configuration")
  }
  return { raw, config }
}

/** 校验 apiKey 是否存在，返回对应条目；不存在抛 403 */
export function requireKey(apiKey: string): ApiKeyEntry {
  const { config } = readConfig()
  const entry = config.api_keys!.find((e) => e.api === apiKey)
  if (!entry) throw new ApiError(403, "Unauthorized")
  return entry
}

/** 校验 apiKey 是否为管理员，返回对应条目；否则抛 403 */
export function requireAdmin(apiKey: string): ApiKeyEntry {
  const entry = requireKey(apiKey)
  if (entry.role !== "admin") throw new ApiError(403, "Unauthorized")
  return entry
}

/** 仅校验有效性并返回角色（用于登录），无效返回 null */
export function validateKey(apiKey: string): { valid: boolean; role?: string } {
  const { config } = readConfig()
  const entry = config.api_keys!.find((e) => e.api === apiKey)
  return entry ? { valid: true, role: entry.role || "user" } : { valid: false }
}

/** 管理员获取全部可查看的 Key 列表 */
export function listKeys(adminKey: string): ApiKeyEntry[] {
  requireAdmin(adminKey)
  const { config } = readConfig()
  return config.api_keys!.map((e) => ({ api: e.api, role: e.role || "user", name: e.name }))
}

/** 解析 providers 列表（用于渠道测试）；需校验调用者持有有效 Key */
export function listProviders(apiKey: string): ProviderInfo[] {
  requireKey(apiKey)
  const { config } = readConfig()
  if (!Array.isArray(config.providers)) return []

  return config.providers.map((provider) => {
    const models = (provider.model ?? []).flatMap((entry) => {
      if (typeof entry === "string") return [{ original: entry, display: entry }]
      return Object.entries(entry).map(([original, display]) => ({ original, display: display as string }))
    })

    const supported = Boolean(
      provider.base_url &&
        (provider.base_url.includes("/chat/completions") || provider.base_url.includes("/v1/messages")),
    )

    return { provider: provider.provider, base_url: provider.base_url, api: provider.api, models, supported }
  })
}

/** 管理员保存 api.yaml；会先校验权限与 YAML 语法 */
export function saveConfig(adminKey: string, content: string): void {
  requireAdmin(adminKey)
  try {
    yaml.load(content)
  } catch {
    throw new ApiError(400, "Invalid YAML syntax")
  }
  fs.writeFileSync(getApiYamlPath(), content, "utf8")
}
