// 前端统一的 API 调用封装：所有请求集中在此，带类型，便于复用与维护。
import type {
  ApiKeyEntry,
  ChannelStat,
  LogFilters,
  LogsResponse,
  ModelStat,
  OverviewStats,
  ProviderInfo,
  TimeseriesRange,
  TimeseriesResponse,
} from "@/lib/types"

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
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

const key = (apiKey: string) => encodeURIComponent(apiKey)

export const api = {
  overview: (apiKey: string) => getJson<OverviewStats>(`/api/stats/overview?apiKey=${key(apiKey)}`),
  timeseries: (apiKey: string, range: TimeseriesRange) =>
    getJson<TimeseriesResponse>(`/api/stats/timeseries?apiKey=${key(apiKey)}&range=${range}`),
  modelStats: (apiKey: string) => getJson<ModelStat[]>(`/api/stats/models?apiKey=${key(apiKey)}`),
  channelStats: (apiKey: string) => getJson<ChannelStat[]>(`/api/stats/channels?apiKey=${key(apiKey)}`),
  filters: (apiKey: string) => getJson<{ models: string[]; providers: string[] }>(`/api/filters?apiKey=${key(apiKey)}`),

  logs: (apiKey: string, page: number, limit: number, filters: LogFilters) => {
    const params = new URLSearchParams({ apiKey, page: String(page), limit: String(limit) })
    if (filters.model) params.set("model", filters.model)
    if (filters.provider) params.set("provider", filters.provider)
    if (filters.status) params.set("status", filters.status)
    return getJson<LogsResponse>(`/api/logs?${params.toString()}`)
  },

  validateKey: (apiKey: string) => postJson<{ valid: boolean; role?: string }>("/api/auth/validate-key", { apiKey }),
  availableKeys: (adminKey: string) => postJson<{ keys: ApiKeyEntry[] }>("/api/auth/available-keys", { adminKey }),

  loadConfig: (apiKey: string) => getJson<{ config: string }>(`/api/config/load?apiKey=${key(apiKey)}`),
  saveConfig: (apiKey: string, config: string) => postJson<{ success: boolean }>("/api/config/save", { apiKey, config }),

  providers: (apiKey: string) => getJson<{ providers: ProviderInfo[] }>(`/api/providers/list?apiKey=${key(apiKey)}`),
  testProvider: (payload: { apiKey: string; provider: string; base_url: string; api: string; model: string }) =>
    postJson<{ success: boolean; message: string; responseTime?: number }>("/api/providers/test", payload),
}
