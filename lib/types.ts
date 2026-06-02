// 前后端共享的数据类型定义

/** uni-api api.yaml 中的单个 API Key 条目 */
export interface ApiKeyEntry {
  api: string
  role?: string
  name?: string
}

/** 用户角色 */
export type UserRole = "admin" | string

/** 概览统计 */
export interface OverviewStats {
  requests: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgProcessTime: number
  avgFirstResponseTime: number
  /** 成功率（0~1），由 channel_stats.success 聚合得出 */
  successRate: number
  /** 活跃模型数（distinct model） */
  activeModels: number
  /** 活跃渠道数（distinct provider） */
  activeChannels: number
}

/** 模型 / 渠道维度的聚合统计（结构一致，仅分组维度不同） */
export interface DimensionStat {
  requests: number
  successes: number
  failures: number
  successRate: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgProcessTime: number
  avgFirstResponseTime: number
  /** 近期请求量迷你走势（用于表格 sparkline），可能缺省 */
  spark?: number[]
}

/** 概览趋势图支持的时间范围 */
export type TimeseriesRange = "1D" | "1W" | "1M" | "3M" | "ALL"

/** 趋势图单点：t = 毫秒时间戳，v = 累计值 */
export interface TimeseriesPoint {
  t: number
  v: number
}

/** 概览趋势图响应：累计请求数与累计 Token 两条序列 */
export interface TimeseriesResponse {
  requests: TimeseriesPoint[]
  tokens: TimeseriesPoint[]
}

export interface ModelStat extends DimensionStat {
  model: string
}

export interface ChannelStat extends DimensionStat {
  provider: string
}

/** 单条详细日志 */
export interface LogEntry {
  timestamp: string
  success: boolean
  /** 内容是否被 uni-api 道德审核拦截；仅此情况下 text 才有值 */
  isFlagged: boolean
  /** 上游端点，如 "POST /v1/chat/completions"，用于区分 OpenAI / Anthropic / Responses 风格 */
  endpoint: string
  /** 发起请求的客户端 IP，可能缺省 */
  clientIp: string | null
  model: string
  /** 命中的渠道；请求在选定渠道前失败时为 null */
  provider: string | null
  processTime: number
  firstResponseTime: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** 本次请求的美元成本，由 token 数 × model_price 推算；无定价信息时为 null */
  cost: number | null
  /** 审核拦截内容（uni-api 仅在 isFlagged 时记录，正常请求为 null） */
  text: string | null
}

export interface LogsResponse {
  logs: LogEntry[]
  hasNextPage: boolean
}

export interface LogFilters {
  model?: string
  provider?: string
  status?: "success" | "failed"
}

/** 渠道测试用的渠道信息（来自 api.yaml） */
export interface ProviderModel {
  original: string
  display: string
}

export interface ProviderInfo {
  provider: string
  base_url: string
  models: ProviderModel[]
  supported: boolean
}
