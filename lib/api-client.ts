// 前端统一的 API 调用封装：所有请求集中在此，带类型，便于复用与维护。
//
// 鉴权模型：浏览器只持有 admin key，作为 `x-api-key` 头随每个请求发送（服务端逐次校验）。
// 统计类接口额外接受一个 viewKey —— 决定查看「哪个 Key 的用量」，为 null 时聚合全部，
// 通过 `?key=` 查询参数传递（服务端会校验它是 api.yaml 中真实存在的 Key）。
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

async function getJson<T>(url: string, apiKey?: string): Promise<T> {
  // 通过请求头传递密钥，避免其出现在 URL / 访问日志 / 浏览器历史中
  const res = await fetch(url, apiKey ? { headers: { "x-api-key": apiKey } } : undefined)
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

// 把 viewKey 拼成 `?key=` / `&key=`；null（查看全部）时原样返回。
function withKey(url: string, viewKey: string | null): string {
  if (!viewKey) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}key=${encodeURIComponent(viewKey)}`
}

export const api = {
  overview: (adminKey: string, viewKey: string | null) =>
    getJson<OverviewStats>(withKey(`/api/stats/overview`, viewKey), adminKey),
  timeseries: (adminKey: string, viewKey: string | null, range: TimeseriesRange) =>
    getJson<TimeseriesResponse>(withKey(`/api/stats/timeseries?range=${range}`, viewKey), adminKey),
  modelStats: (adminKey: string, viewKey: string | null) =>
    getJson<ModelStat[]>(withKey(`/api/stats/models`, viewKey), adminKey),
  channelStats: (adminKey: string, viewKey: string | null) =>
    getJson<ChannelStat[]>(withKey(`/api/stats/channels`, viewKey), adminKey),
  filters: (adminKey: string, viewKey: string | null) =>
    getJson<{ models: string[]; providers: string[] }>(withKey(`/api/filters`, viewKey), adminKey),

  logs: (adminKey: string, viewKey: string | null, page: number, limit: number, filters: LogFilters) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filters.model) params.set("model", filters.model)
    if (filters.provider) params.set("provider", filters.provider)
    if (filters.status) params.set("status", filters.status)
    return getJson<LogsResponse>(withKey(`/api/logs?${params.toString()}`, viewKey), adminKey)
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
