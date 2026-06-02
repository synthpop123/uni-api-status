// 前端统一的 API 调用封装：所有请求集中在此，带类型，便于复用与维护。
//
// 鉴权模型：浏览器只持有 admin key，作为 `x-api-key` 头随每个请求发送（服务端逐次校验）。
// 统计类接口额外接受一个 viewKey 标识 —— 决定查看「哪个 Key 的用量」，为 null 时聚合全部。
// 该标识是 Key 的不透明摘要（非密钥本身，见 lib/config.ts 的 keyId），通过 `x-view-key`
// 请求头传递（不进 URL / 访问日志 / 浏览器历史），服务端再用 resolveViewKey 映射回真实密钥过滤。
import type {
  ChannelStat,
  KeyUsage,
  LogFilters,
  LogsResponse,
  ModelStat,
  OverviewStats,
  ProviderInfo,
  TimeseriesRange,
  TimeseriesResponse,
} from "@/lib/types"

async function getJson<T>(url: string, apiKey?: string, viewKeyId?: string | null): Promise<T> {
  // 通过请求头传递凭证与 viewKey 标识，避免它们出现在 URL / 访问日志 / 浏览器历史中。
  // x-api-key 为 admin 密钥；x-view-key 为「查看哪个 Key 用量」的不透明标识（非密钥本身）。
  const headers: Record<string, string> = {}
  if (apiKey) headers["x-api-key"] = apiKey
  if (viewKeyId) headers["x-view-key"] = viewKeyId
  const res = await fetch(url, Object.keys(headers).length ? { headers } : undefined)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `请求失败 (${res.status})`)
  }
  return res.json() as Promise<T>
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || body.message || `请求失败 (${res.status})`)
  return body as T
}

export const api = {
  // 统计类接口的 viewKey 参数是 Key 的不透明标识（KeyUsage.id），经 x-view-key 头下传；
  // 为 null 时聚合全部。它从不进入 URL，因此不会泄露到访问日志 / 浏览器历史。
  overview: (adminKey: string, viewKey: string | null) =>
    getJson<OverviewStats>(`/api/stats/overview`, adminKey, viewKey),
  timeseries: (adminKey: string, viewKey: string | null, range: TimeseriesRange) =>
    getJson<TimeseriesResponse>(`/api/stats/timeseries?range=${range}`, adminKey, viewKey),
  modelStats: (adminKey: string, viewKey: string | null) =>
    getJson<ModelStat[]>(`/api/stats/models`, adminKey, viewKey),
  channelStats: (adminKey: string, viewKey: string | null) =>
    getJson<ChannelStat[]>(`/api/stats/channels`, adminKey, viewKey),
  filters: (adminKey: string, viewKey: string | null) =>
    getJson<{ models: string[]; providers: string[] }>(`/api/filters`, adminKey, viewKey),

  logs: (adminKey: string, viewKey: string | null, page: number, limit: number, filters: LogFilters) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filters.model) params.set("model", filters.model)
    if (filters.provider) params.set("provider", filters.provider)
    if (filters.status) params.set("status", filters.status)
    return getJson<LogsResponse>(`/api/logs?${params.toString()}`, adminKey, viewKey)
  },

  // 有实际请求的 Key 用量列表（首页右上角切换器）
  keyUsage: (adminKey: string) => getJson<{ keys: KeyUsage[] }>(`/api/stats/keys`, adminKey),

  validateKey: (apiKey: string) => postJson<{ valid: boolean; role?: string }>("/api/auth/validate-key", { apiKey }),

  loadConfig: (apiKey: string) => getJson<{ config: string }>(`/api/config/load`, apiKey),
  saveConfig: (apiKey: string, config: string) => postJson<{ success: boolean }>("/api/config/save", { apiKey, config }),

  providers: (apiKey: string) => getJson<{ providers: ProviderInfo[] }>(`/api/providers/list`, apiKey),
  // 仅传渠道名与模型；base_url 与上游密钥由服务端解析（防 SSRF / 密钥外泄）
  testProvider: (payload: { apiKey: string; provider: string; model: string }) =>
    postJson<{ success: boolean; message: string; responseTime?: number }>("/api/providers/test", payload),
}
