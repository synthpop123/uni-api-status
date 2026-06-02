"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { LogFilters, TimeseriesRange } from "@/lib/types"

const LOGS_PER_PAGE = 30

// 所有统计 hook 都接收 (adminKey, viewKey)：adminKey 是鉴权凭证；viewKey 是「查看哪个 Key 用量」
// 的不透明标识（非密钥本身，由 GET /api/stats/keys 下发，null = 全部聚合），经请求头发送。
// viewKey 进入 queryKey，切换时自动重新拉取。

export function useOverview(adminKey: string, viewKey: string | null) {
  return useQuery({
    queryKey: ["overview", adminKey, viewKey],
    queryFn: () => api.overview(adminKey, viewKey),
    enabled: !!adminKey,
  })
}

export function useTimeseries(adminKey: string, viewKey: string | null, range: TimeseriesRange) {
  return useQuery({
    queryKey: ["timeseries", adminKey, viewKey, range],
    queryFn: () => api.timeseries(adminKey, viewKey, range),
    enabled: !!adminKey,
  })
}

export function useModelStats(adminKey: string, viewKey: string | null) {
  return useQuery({
    queryKey: ["model-stats", adminKey, viewKey],
    queryFn: () => api.modelStats(adminKey, viewKey),
    enabled: !!adminKey,
  })
}

export function useChannelStats(adminKey: string, viewKey: string | null) {
  return useQuery({
    queryKey: ["channel-stats", adminKey, viewKey],
    queryFn: () => api.channelStats(adminKey, viewKey),
    enabled: !!adminKey,
  })
}

export function useFilters(adminKey: string, viewKey: string | null) {
  return useQuery({
    queryKey: ["filters", adminKey, viewKey],
    queryFn: () => api.filters(adminKey, viewKey),
    enabled: !!adminKey,
  })
}

export function useLogs(adminKey: string, viewKey: string | null, filters: LogFilters) {
  return useInfiniteQuery({
    queryKey: ["logs", adminKey, viewKey, filters],
    queryFn: ({ pageParam }) => api.logs(adminKey, viewKey, pageParam, LOGS_PER_PAGE, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNextPage ? allPages.length + 1 : undefined),
    enabled: !!adminKey,
  })
}

// 有实际请求的 Key 列表（首页右上角切换器）
export function useKeyUsage(adminKey: string) {
  return useQuery({
    queryKey: ["key-usage", adminKey],
    queryFn: () => api.keyUsage(adminKey),
    enabled: !!adminKey,
  })
}

export { LOGS_PER_PAGE }
