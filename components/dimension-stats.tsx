"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber, formatNumberCompact, formatPercent, formatTime, getSuccessRateColor } from "@/lib/utils"
import type { DimensionStat } from "@/lib/types"

interface DimensionRow extends DimensionStat {
  name: string
}

interface DimensionStatsProps {
  title: string
  /** 维度列的表头，如 "模型名称" / "渠道名称" */
  nameHeader: string
  rows: DimensionRow[]
  isLoading: boolean
}

/** 模型统计与渠道统计共用的展示组件（桌面表格 + 移动卡片） */
export function DimensionStats({ title, nameHeader, rows, isLoading }: DimensionStatsProps) {
  const renderNoData = () => (
    <Card>
      <CardContent className="p-6 text-center text-muted-foreground">
        <p>暂无符合条件的数据</p>
      </CardContent>
    </Card>
  )

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

        {/* 桌面表格 */}
        <div className="hidden lg:block">
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-5 w-36" />
                        </TableCell>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j} className="text-right">
                            <Skeleton className="h-5 w-16 ml-auto" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : rows.length === 0 ? (
            renderNoData()
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">{nameHeader}</TableHead>
                      <TableHead className="w-[100px] text-right">请求数</TableHead>
                      <TableHead className="w-[120px] text-right">成功 / 失败</TableHead>
                      <TableHead className="w-[100px] text-right">成功率</TableHead>
                      <TableHead className="w-[120px] text-right">总计 Tokens</TableHead>
                      <TableHead className="w-[120px] text-right">提示 Tokens</TableHead>
                      <TableHead className="w-[120px] text-right">完成 Tokens</TableHead>
                      <TableHead className="w-[120px] text-right">平均处理耗时</TableHead>
                      <TableHead className="w-[120px] text-right">平均首字响应</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[180px] truncate">{row.name}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{row.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(row.requests)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-green-600">{formatNumber(row.successes)}</span>
                          <span className="text-muted-foreground mx-1">/</span>
                          <span className="text-red-600">{formatNumber(row.failures)}</span>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${getSuccessRateColor(row.successRate)}`}>
                          {formatPercent(row.successRate)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(row.totalTokens)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(row.promptTokens)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(row.completionTokens)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatTime(row.avgProcessTime)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatTime(row.avgFirstResponseTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 移动卡片 */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <Skeleton className="h-5 w-3/5" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rows.length === 0 ? (
            renderNoData()
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rows.map((row) => (
                <Card key={row.name} className="max-w-full">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium truncate" title={row.name}>
                      {row.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <Separator />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">请求数:</span>
                        <span className="font-mono font-medium">{formatNumber(row.requests)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">成功率:</span>
                        <span className={`font-mono font-medium ${getSuccessRateColor(row.successRate)}`}>
                          {formatPercent(row.successRate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">平均耗时:</span>
                        <span className="font-mono">{formatTime(row.avgProcessTime)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">平均首响:</span>
                        <span className="font-mono">{formatTime(row.avgFirstResponseTime)}</span>
                      </div>
                      <div className="flex justify-between items-center col-span-2 pt-1">
                        <span className="text-muted-foreground">Tokens (提示/完成/总计):</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono">
                              {formatNumberCompact(row.promptTokens)}/{formatNumberCompact(row.completionTokens)}/
                              {formatNumberCompact(row.totalTokens)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="end">
                            <p>提示: {formatNumber(row.promptTokens)}</p>
                            <p>完成: {formatNumber(row.completionTokens)}</p>
                            <p>总计: {formatNumber(row.totalTokens)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
