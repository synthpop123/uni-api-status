"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, Copy, Eye, Loader2, ShieldAlert, X, XCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast"
import { formatNumberCompact, formatTime, formatTimestampGMT8 } from "@/lib/utils"
import { useFilters, useLogs } from "@/hooks/use-stats"
import type { LogEntry, LogFilters } from "@/lib/types"

interface DetailedLogsProps {
  apiKey: string
}

export function DetailedLogs({ apiKey }: DetailedLogsProps) {
  const [filters, setFilters] = useState<LogFilters>({})
  const { toast } = useToast()

  const { data: filterData } = useFilters(apiKey)
  const availableModels = useMemo(() => [...(filterData?.models ?? [])].sort(), [filterData])
  const availableProviders = useMemo(() => [...(filterData?.providers ?? [])].sort(), [filterData])

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useLogs(apiKey, filters)
  const logs = useMemo(() => data?.pages.flatMap((p) => p.logs) ?? [], [data])

  const hasFilters = Boolean(filters.model || filters.provider || filters.status)

  const handleFilterChange = (type: keyof LogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value === "all" ? undefined : value }))
  }

  const clearFilters = () => setFilters({})

  const copyToClipboard = async (text: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast({ description: "内容已复制到剪贴板" })
    } catch {
      toast({ description: "复制失败，请手动复制", variant: "destructive" })
    }
  }

  const getStatusIcon = (success: boolean) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center">
          {success ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{success ? "成功" : "失败"}</p>
      </TooltipContent>
    </Tooltip>
  )

  // 审核内容单元格：uni-api 仅在内容被道德审核拦截 (isFlagged) 时记录 text，正常请求无内容。
  const renderModeration = (log: LogEntry, variant: "icon" | "button") => {
    if (!log.isFlagged || !log.text) {
      return variant === "icon" ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-2">本次请求无审核内容</p>
      )
    }
    const trigger =
      variant === "icon" ? (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600">
          <ShieldAlert className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="w-full text-xs h-9 text-amber-600">
          <ShieldAlert className="w-4 h-4 mr-2" />
          查看审核内容
        </Button>
      )
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-96 max-w-[85vw] max-h-[50vh] overflow-y-auto text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-1.5 text-amber-600">
                <ShieldAlert className="w-4 h-4" />
                审核拦截内容
              </h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(log.text)}
                className="h-6 w-6"
                title="复制内容"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text}</ReactMarkdown>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const filterSelect = (
    type: keyof LogFilters,
    placeholder: string,
    options: { value: string; label: string }[],
    className: string,
  ) => (
    <Select value={filters[type] || "all"} onValueChange={(v) => handleFilterChange(type, v)} disabled={isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const modelOptions = [{ value: "all", label: "全部模型" }, ...availableModels.map((m) => ({ value: m, label: m }))]
  const providerOptions = [
    { value: "all", label: "全部渠道" },
    ...availableProviders.map((p) => ({ value: p, label: p })),
  ]
  const statusOptions = [
    { value: "all", label: "全部状态" },
    { value: "success", label: "成功" },
    { value: "failed", label: "失败" },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 筛选区 */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">详细日志</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>uni-api 仅在内容触发道德审核拦截时记录文本，正常请求的“审核内容”列显示为“—”。</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="hidden md:flex items-center space-x-2 flex-wrap">
              {filterSelect("model", "选择模型", modelOptions, "w-[160px] h-9 text-xs")}
              {filterSelect("provider", "选择渠道", providerOptions, "w-[160px] h-9 text-xs")}
              {filterSelect("status", "选择状态", statusOptions, "w-[120px] h-9 text-xs")}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground">
                  <X className="w-3 h-3 mr-1" />
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* 移动端筛选 */}
          <div className="md:hidden space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {filterSelect("model", "选择模型", modelOptions, "h-9 text-xs")}
              {filterSelect("provider", "选择渠道", providerOptions, "h-9 text-xs")}
            </div>
            <div className="flex space-x-2">
              {filterSelect("status", "选择状态", statusOptions, "flex-1 h-9 text-xs")}
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 桌面表格 */}
        <div className="hidden lg:block">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">时间 (GMT+8)</TableHead>
                    <TableHead className="w-[80px] text-center">状态</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>渠道</TableHead>
                    <TableHead className="w-[100px] text-right">处理耗时</TableHead>
                    <TableHead className="w-[100px] text-right">首字响应</TableHead>
                    <TableHead className="w-[220px] text-right">Tokens (提示/完成/总计)</TableHead>
                    <TableHead className="w-[90px] text-center">审核内容</TableHead>
                  </TableRow>
                </TableHeader>
                {isLoading ? (
                  <TableBody>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                ) : (
                  <TableBody>
                    {logs.map((log, index) => (
                      <TableRow key={`${log.timestamp}-${index}`}>
                        <TableCell className="font-mono text-xs">{formatTimestampGMT8(log.timestamp)}</TableCell>
                        <TableCell className="text-center">{getStatusIcon(log.success)}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={log.model}>
                            {log.model}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate" title={log.provider}>
                            {log.provider}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatTime(log.processTime)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatTime(log.firstResponseTime)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatNumberCompact(log.promptTokens)} / {formatNumberCompact(log.completionTokens)} /{" "}
                          {formatNumberCompact(log.totalTokens)}
                        </TableCell>
                        <TableCell className="text-center">{renderModeration(log, "icon")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
              {!isLoading && logs.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">暂无符合条件的日志数据</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 移动卡片 */}
        <div className="lg:hidden space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Separator />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">暂无符合条件的日志数据</CardContent>
            </Card>
          ) : (
            logs.map((log, index) => (
              <Card key={`${log.timestamp}-${index}`} className="max-w-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{formatTimestampGMT8(log.timestamp)}</span>
                    {getStatusIcon(log.success)}
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">模型:</span>
                      <span className="font-medium truncate max-w-[60%]" title={log.model}>
                        {log.model}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">渠道:</span>
                      <span className="font-medium truncate max-w-[60%]" title={log.provider}>
                        {log.provider}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">处理耗时:</span>
                        <span className="font-mono">{formatTime(log.processTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">首字响应:</span>
                        <span className="font-mono">{formatTime(log.firstResponseTime)}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">Tokens (提示/完成/总计):</span>
                        <span className="font-mono">
                          {formatNumberCompact(log.promptTokens)} / {formatNumberCompact(log.completionTokens)} /{" "}
                          {formatNumberCompact(log.totalTokens)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  {renderModeration(log, "button")}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 加载更多 */}
        {!isLoading && logs.length > 0 && hasNextPage && (
          <div className="text-center pt-4">
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="sm">
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                "加载更多日志"
              )}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
