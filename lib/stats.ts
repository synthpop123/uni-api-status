import { query } from "@/lib/db"
import type { ChannelStat, LogEntry, LogFilters, LogsResponse, ModelStat, OverviewStats } from "@/lib/types"

const CHAT_ENDPOINT = "POST /v1/chat/completions"

// 跨 SQLite / PostgreSQL 通用的维度聚合字段（success 在两种库里都能与 true/false 比较）
const DIMENSION_FIELDS = `
  COUNT(*) as requests,
  COALESCE(SUM(CASE WHEN c.success = true THEN 1 ELSE 0 END), 0) as successes,
  COALESCE(SUM(CASE WHEN c.success = false THEN 1 ELSE 0 END), 0) as failures,
  COALESCE(AVG(CAST(c.success AS FLOAT)), 0) as successRate,
  COALESCE(SUM(r.total_tokens), 0) as totalTokens,
  COALESCE(SUM(r.prompt_tokens), 0) as promptTokens,
  COALESCE(SUM(r.completion_tokens), 0) as completionTokens,
  COALESCE(AVG(r.process_time), 0) as avgProcessTime,
  COALESCE(AVG(r.first_response_time), 0) as avgFirstResponseTime
`

const toNumber = (v: unknown) => Number(v ?? 0)
const toBool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true"

export async function getOverview(apiKey: string): Promise<OverviewStats> {
  const rows = await query(
    `SELECT
       COUNT(*) as requests,
       COALESCE(SUM(total_tokens), 0) as totalTokens,
       COALESCE(SUM(prompt_tokens), 0) as promptTokens,
       COALESCE(SUM(completion_tokens), 0) as completionTokens,
       COALESCE(AVG(process_time), 0) as avgProcessTime,
       COALESCE(AVG(first_response_time), 0) as avgFirstResponseTime
     FROM request_stats
     WHERE api_key = $1 AND endpoint = $2`,
    [apiKey, CHAT_ENDPOINT],
  )
  const r = rows[0] ?? {}
  return {
    requests: toNumber(r.requests),
    totalTokens: toNumber(r.totalTokens),
    promptTokens: toNumber(r.promptTokens),
    completionTokens: toNumber(r.completionTokens),
    avgProcessTime: toNumber(r.avgProcessTime),
    avgFirstResponseTime: toNumber(r.avgFirstResponseTime),
  }
}

export async function getModelStats(apiKey: string): Promise<ModelStat[]> {
  const rows = await query(
    `SELECT r.model, ${DIMENSION_FIELDS}
     FROM request_stats r
     LEFT JOIN channel_stats c ON r.request_id = c.request_id
     WHERE r.api_key = $1 AND r.endpoint = $2
     GROUP BY r.model
     ORDER BY requests DESC`,
    [apiKey, CHAT_ENDPOINT],
  )
  return rows.map((r) => ({ model: String(r.model ?? "unknown"), ...mapDimension(r) }))
}

export async function getChannelStats(apiKey: string): Promise<ChannelStat[]> {
  const rows = await query(
    `SELECT r.provider, ${DIMENSION_FIELDS}
     FROM request_stats r
     LEFT JOIN channel_stats c ON r.request_id = c.request_id
     WHERE r.api_key = $1 AND r.endpoint = $2
     GROUP BY r.provider
     ORDER BY requests DESC`,
    [apiKey, CHAT_ENDPOINT],
  )
  return rows.map((r) => ({ provider: String(r.provider ?? "unknown"), ...mapDimension(r) }))
}

export async function getFilters(apiKey: string): Promise<{ models: string[]; providers: string[] }> {
  const [models, providers] = await Promise.all([
    query(
      `SELECT DISTINCT model FROM request_stats WHERE api_key = $1 AND endpoint = $2 AND model IS NOT NULL ORDER BY model`,
      [apiKey, CHAT_ENDPOINT],
    ),
    query(
      `SELECT DISTINCT provider FROM request_stats WHERE api_key = $1 AND endpoint = $2 AND provider IS NOT NULL ORDER BY provider`,
      [apiKey, CHAT_ENDPOINT],
    ),
  ])
  return {
    models: models.map((r) => String(r.model)),
    providers: providers.map((r) => String(r.provider)),
  }
}

export async function getLogs(
  apiKey: string,
  options: LogFilters & { page: number; limit: number },
): Promise<LogsResponse> {
  const { page, limit, model, provider, status } = options

  const where: string[] = ["r.api_key = $1", "r.endpoint = $2"]
  const params: unknown[] = [apiKey, CHAT_ENDPOINT]
  let i = 3

  if (model) {
    where.push(`r.model = $${i++}`)
    params.push(model)
  }
  if (provider) {
    where.push(`r.provider = $${i++}`)
    params.push(provider)
  }
  if (status === "success" || status === "failed") {
    where.push(`c.success = $${i++}`)
    params.push(status === "success")
  }

  // 多取一条用于判断是否有下一页
  const offset = (page - 1) * limit
  const sql = `
    SELECT
      r.timestamp,
      MAX(COALESCE(c.success, false)) as success,
      MAX(COALESCE(r.is_flagged, false)) as isFlagged,
      r.model,
      r.provider,
      r.process_time as processTime,
      r.first_response_time as firstResponseTime,
      r.prompt_tokens as promptTokens,
      r.completion_tokens as completionTokens,
      r.total_tokens as totalTokens,
      r.text
    FROM request_stats r
    LEFT JOIN channel_stats c ON r.request_id = c.request_id
    WHERE ${where.join(" AND ")}
    GROUP BY r.request_id
    ORDER BY r.timestamp DESC
    LIMIT $${i++} OFFSET $${i++}`
  params.push(limit + 1, offset)

  const rows = await query(sql, params)
  const hasNextPage = rows.length > limit
  const logs: LogEntry[] = (hasNextPage ? rows.slice(0, limit) : rows).map((r) => ({
    timestamp: String(r.timestamp ?? ""),
    success: toBool(r.success),
    isFlagged: toBool(r.isFlagged),
    model: String(r.model ?? ""),
    provider: String(r.provider ?? ""),
    processTime: toNumber(r.processTime),
    firstResponseTime: toNumber(r.firstResponseTime),
    promptTokens: toNumber(r.promptTokens),
    completionTokens: toNumber(r.completionTokens),
    totalTokens: toNumber(r.totalTokens),
    text: (r.text as string | null) ?? null,
  }))

  return { logs, hasNextPage }
}

function mapDimension(r: Record<string, unknown>) {
  return {
    requests: toNumber(r.requests),
    successes: toNumber(r.successes),
    failures: toNumber(r.failures),
    successRate: toNumber(r.successRate),
    totalTokens: toNumber(r.totalTokens),
    promptTokens: toNumber(r.promptTokens),
    completionTokens: toNumber(r.completionTokens),
    avgProcessTime: toNumber(r.avgProcessTime),
    avgFirstResponseTime: toNumber(r.avgFirstResponseTime),
  }
}
