"use client"

import { DimensionStats } from "@/components/dimension-stats"
import { useModelStats } from "@/hooks/use-stats"

export function ModelStats({ apiKey }: { apiKey: string }) {
  const { data, isLoading } = useModelStats(apiKey)
  const rows = (data ?? []).map((m) => ({ ...m, name: m.model }))
  return <DimensionStats title="模型统计" nameHeader="模型名称" rows={rows} isLoading={isLoading} />
}
