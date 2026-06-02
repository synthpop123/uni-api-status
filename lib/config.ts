import fs from "node:fs"
import yaml from "js-yaml"
import { ApiError } from "@/lib/api-helpers"
import type { ApiKeyEntry, ProviderInfo, ProviderModel } from "@/lib/types"

interface UniApiConfig {
  api_keys?: ApiKeyEntry[]
  providers?: RawProvider[]
  [key: string]: unknown
}

interface RawProvider {
  provider: string
  base_url: string
  api: string | string[]
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

/** 展开 provider 的 model 配置（字符串或 {original: display} 映射）为统一结构 */
function parseModels(provider: RawProvider): ProviderModel[] {
  return (provider.model ?? []).flatMap((entry) => {
    if (typeof entry === "string") return [{ original: entry, display: entry }]
    return Object.entries(entry).map(([original, display]) => ({ original, display: display as string }))
  })
}

function parseEndpoint(baseUrl?: string): URL | null {
  if (!baseUrl) return null
  try {
    const url = new URL(baseUrl)
    if (!["https:", "http:"].includes(url.protocol)) return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

const isSupportedEndpoint = (baseUrl?: string): boolean => {
  const url = parseEndpoint(baseUrl)
  if (!url) return false
  return url.pathname.endsWith("/chat/completions") || url.pathname.endsWith("/v1/messages")
}

/**
 * 解析 providers 列表（用于渠道测试）；需校验调用者持有有效 Key。
 * 注意：故意不返回上游 `api` 密钥——它是机密，绝不能下发到浏览器；
 * 渠道测试时由服务端按 provider 名称从 api.yaml 重新解析（见 resolveTestTarget）。
 */
export function listProviders(apiKey: string): ProviderInfo[] {
  requireKey(apiKey)
  const { config } = readConfig()
  if (!Array.isArray(config.providers)) return []

  return config.providers.map((provider) => ({
    provider: provider.provider,
    base_url: provider.base_url,
    models: parseModels(provider),
    supported: isSupportedEndpoint(provider.base_url),
  }))
}

export interface TestTarget {
  base_url: string
  api: string
  model: string
}

/**
 * 渠道测试目标解析：服务端按 provider 名称从 api.yaml 取出 base_url 与上游密钥，
 * 客户端只能指定要测试的渠道名与模型，无法注入任意 URL / 密钥（防 SSRF 与密钥外泄）。
 */
export function resolveTestTarget(apiKey: string, providerName: string, modelDisplay: string): TestTarget {
  requireKey(apiKey)
  const { config } = readConfig()
  const provider = Array.isArray(config.providers)
    ? config.providers.find((p) => p.provider === providerName)
    : undefined
  if (!provider) throw new ApiError(404, "Provider not found")
  const endpoint = parseEndpoint(provider.base_url)
  if (!endpoint || !isSupportedEndpoint(provider.base_url)) throw new ApiError(400, "Unsupported endpoint type")

  const models = parseModels(provider)
  // 只允许测试该渠道实际声明的模型，按 display 或 original 匹配后回传真实 original
  const model = models.find((m) => m.display === modelDisplay || m.original === modelDisplay)
  if (!model) throw new ApiError(400, "Model not found for this provider")

  const api = Array.isArray(provider.api) ? provider.api[0] : provider.api
  if (!api) throw new ApiError(400, "Provider has no API key configured")

  return { base_url: endpoint.toString(), api, model: model.original }
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
