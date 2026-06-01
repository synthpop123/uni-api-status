"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, BarChart3, Clock, MessageSquare, Timer, Zap } from "lucide-react"
import { formatNumber, formatNumberCompact, formatTime } from "@/lib/utils"
import { useOverview } from "@/hooks/use-stats"

interface OverviewStatsProps {
  apiKey: string
}

export function OverviewStats({ apiKey }: OverviewStatsProps) {
  const { data, isLoading } = useOverview(apiKey)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 768)
    checkDevice()
    window.addEventListener("resize", checkDevice)
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  const displayNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "0"
    return isMobile ? formatNumberCompact(num) : formatNumber(num)
  }

  const cards = [
    { title: "总请求数", value: displayNumber(data?.requests), icon: Activity, color: "text-blue-600" },
    { title: "总计 Tokens", value: displayNumber(data?.totalTokens), icon: BarChart3, color: "text-green-600" },
    { title: "提示 Tokens", value: displayNumber(data?.promptTokens), icon: MessageSquare, color: "text-purple-600" },
    { title: "完成 Tokens", value: displayNumber(data?.completionTokens), icon: Zap, color: "text-orange-600" },
    { title: "平均处理耗时", value: formatTime(data?.avgProcessTime ?? Number.NaN), icon: Clock, color: "text-red-600" },
    { title: "平均首字响应", value: formatTime(data?.avgFirstResponseTime ?? Number.NaN), icon: Timer, color: "text-indigo-600" },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">概览统计</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((stat) => (
          <Card key={stat.title} className="w-full overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${stat.color} flex-shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-medium text-muted-foreground truncate" title={stat.title}>
                    {stat.title}
                  </p>
                  <div className="text-lg font-bold font-mono">
                    {isLoading ? <Skeleton className="h-5 w-10 ml-auto" /> : stat.value}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
