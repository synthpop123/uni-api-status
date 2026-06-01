"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { LogFilters, TimeseriesRange } from "@/lib/types"

const LOGS_PER_PAGE = 30

export function useOverview(apiKey: string) {
  return useQuery({
    queryKey: ["overview", apiKey],
    queryFn: () => api.overview(apiKey),
    enabled: !!apiKey,
  })
}

export function useTimeseries(apiKey: string, range: TimeseriesRange) {
  return useQuery({
    queryKey: ["timeseries", apiKey, range],
    queryFn: () => api.timeseries(apiKey, range),
    enabled: !!apiKey,
  })
}

export function useModelStats(apiKey: string) {
  return useQuery({
    queryKey: ["model-stats", apiKey],
    queryFn: () => api.modelStats(apiKey),
    enabled: !!apiKey,
  })
}

export function useChannelStats(apiKey: string) {
  return useQuery({
    queryKey: ["channel-stats", apiKey],
    queryFn: () => api.channelStats(apiKey),
    enabled: !!apiKey,
  })
}

export function useFilters(apiKey: string) {
  return useQuery({
    queryKey: ["filters", apiKey],
    queryFn: () => api.filters(apiKey),
    enabled: !!apiKey,
  })
}

export function useLogs(apiKey: string, filters: LogFilters) {
  return useInfiniteQuery({
    queryKey: ["logs", apiKey, filters],
    queryFn: ({ pageParam }) => api.logs(apiKey, pageParam, LOGS_PER_PAGE, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNextPage ? allPages.length + 1 : undefined),
    enabled: !!apiKey,
  })
}

export { LOGS_PER_PAGE }
