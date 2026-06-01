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
  model: string
  provider: string
  processTime: number
  firstResponseTime: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
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
  api: string
  models: ProviderModel[]
  supported: boolean
}
