"use client"

import { DimensionStats } from "@/components/dimension-stats"
import { useChannelStats } from "@/hooks/use-stats"

export function ChannelStats({ apiKey }: { apiKey: string }) {
  const { data, isLoading } = useChannelStats(apiKey)
  const rows = (data ?? []).map((c) => ({ ...c, name: c.provider }))
  return <DimensionStats title="渠道统计" nameHeader="渠道名称" rows={rows} isLoading={isLoading} />
}
