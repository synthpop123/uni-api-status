import { query } from "@/lib/db"
import type {
  ChannelStat,
  LogEntry,
  LogFilters,
  LogsResponse,
  ModelStat,
  OverviewStats,
  TimeseriesPoint,
  TimeseriesRange,
  TimeseriesResponse,
} from "@/lib/types"

const CHAT_ENDPOINT = "POST /v1/chat/completions"

// 跨 SQLite / PostgreSQL 通用的维度聚合字段（success 在两种库里都能与 true/false 比较）
// 注意：成功率必须用 CASE 表达式求平均，而非 CAST(success AS FLOAT)——后者在
// PostgreSQL 里会因 boolean 无法直接转 float 而报错（与 getOverview 口径保持一致）。
const DIMENSION_FIELDS = `
  COUNT(*) as requests,
  COALESCE(SUM(CASE WHEN c.success = true THEN 1 ELSE 0 END), 0) as successes,
  COALESCE(SUM(CASE WHEN c.success = false THEN 1 ELSE 0 END), 0) as failures,
  COALESCE(AVG(CASE WHEN c.success = true THEN 1.0 ELSE 0.0 END), 0) as successRate,
  COALESCE(SUM(r.total_tokens), 0) as totalTokens,
  COALESCE(SUM(r.prompt_tokens), 0) as promptTokens,
  COALESCE(SUM(r.completion_tokens), 0) as completionTokens,
  COALESCE(AVG(r.process_time), 0) as avgProcessTime,
  COALESCE(AVG(r.first_response_time), 0) as avgFirstResponseTime
`

const toNumber = (v: unknown) => Number(v ?? 0)
const toBool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true"

export async function getOverview(apiKey: string): Promise<OverviewStats> {
  // 基础聚合只查 request_stats，避免与 channel_stats 的一对多 join 放大请求/Token 计数。
  // successRate 单独用 join 求平均（与维度统计口径一致：按尝试计成功率）。
  const [baseRows, successRows] = await Promise.all([
    query(
      `SELECT
         COUNT(*) as requests,
         COALESCE(SUM(total_tokens), 0) as totalTokens,
         COALESCE(SUM(prompt_tokens), 0) as promptTokens,
         COALESCE(SUM(completion_tokens), 0) as completionTokens,
         COALESCE(AVG(process_time), 0) as avgProcessTime,
         COALESCE(AVG(first_response_time), 0) as avgFirstResponseTime,
         COUNT(DISTINCT model) as activeModels,
         COUNT(DISTINCT provider) as activeChannels
       FROM request_stats
       WHERE api_key = $1 AND endpoint = $2`,
      [apiKey, CHAT_ENDPOINT],
    ),
    query(
      `SELECT COALESCE(AVG(CASE WHEN c.success = true THEN 1.0 ELSE 0.0 END), 0) as successRate
       FROM request_stats r
       LEFT JOIN channel_stats c ON r.request_id = c.request_id
       WHERE r.api_key = $1 AND r.endpoint = $2`,
      [apiKey, CHAT_ENDPOINT],
    ),
  ])
  const r = baseRows[0] ?? {}
  const s = successRows[0] ?? {}
  return {
    requests: toNumber(r.requests),
    totalTokens: toNumber(r.totalTokens),
    promptTokens: toNumber(r.promptTokens),
    completionTokens: toNumber(r.completionTokens),
    avgProcessTime: toNumber(r.avgProcessTime),
    avgFirstResponseTime: toNumber(r.avgFirstResponseTime),
    successRate: toNumber(s.successRate),
    activeModels: toNumber(r.activeModels),
    activeChannels: toNumber(r.activeChannels),
  }
}

// ---- 概览趋势图（累计请求数 / 累计 Token）----
const RANGE_MS: Record<TimeseriesRange, number | null> = {
  "1D": 24 * 3600e3,
  "1W": 7 * 86400e3,
  "1M": 30 * 86400e3,
  "3M": 90 * 86400e3,
  ALL: null,
}
const RANGE_POINTS: Record<TimeseriesRange, number> = {
  "1D": 48,
  "1W": 56,
  "1M": 60,
  "3M": 66,
  ALL: 72,
}

export async function getTimeseries(apiKey: string, range: TimeseriesRange): Promise<TimeseriesResponse> {
  const now = Date.now()
  const windowMs = RANGE_MS[range] ?? null
  const points = RANGE_POINTS[range] ?? 60
  const cutoffMs = windowMs == null ? null : now - windowMs
  const cutoffIso = cutoffMs == null ? null : new Date(cutoffMs).toISOString()

  // 窗口内的请求（仅 request_stats，行数=请求数，tok=Token）
  const params: unknown[] = [apiKey, CHAT_ENDPOINT]
  let sql = `SELECT timestamp, COALESCE(total_tokens, 0) as tok
             FROM request_stats
             WHERE api_key = $1 AND endpoint = $2`
  if (cutoffIso != null) {
    sql += ` AND timestamp >= $3`
    params.push(cutoffIso)
  }
  sql += ` ORDER BY timestamp ASC`

  // 窗口前的累计基线（让曲线像 Robinhood 资产曲线一样落在总量上）
  const baselinePromise =
    cutoffIso == null
      ? Promise.resolve([{ cnt: 0, tok: 0 }])
      : query(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(total_tokens), 0) as tok
           FROM request_stats
           WHERE api_key = $1 AND endpoint = $2 AND timestamp < $3`,
          [apiKey, CHAT_ENDPOINT, cutoffIso],
        )

  const [rows, baseRows] = await Promise.all([query(sql, params), baselinePromise])
  const baseCount = toNumber(baseRows[0]?.cnt)
  const baseTok = toNumber(baseRows[0]?.tok)

  const events = rows
    .map((r) => ({ t: new Date(String(r.timestamp)).getTime(), tok: toNumber(r.tok) }))
    .filter((e) => !Number.isNaN(e.t))
    .sort((a, b) => a.t - b.t)

  let start = cutoffMs != null ? cutoffMs : events.length ? events[0].t : now - 86400e3
  if (start >= now) start = now - 1
  const step = (now - start) / (points - 1)

  let idx = 0
  let cReq = baseCount
  let cTok = baseTok
  const requests: TimeseriesPoint[] = []
  const tokens: TimeseriesPoint[] = []
  for (let i = 0; i < points; i++) {
    const tb = i === points - 1 ? now : start + i * step
    while (idx < events.length && events[idx].t <= tb) {
      cReq += 1
      cTok += events[idx].tok
      idx++
    }
    requests.push({ t: Math.round(tb), v: cReq })
    tokens.push({ t: Math.round(tb), v: cTok })
  }
  return { requests, tokens }
}

// ---- 维度 sparkline：近 30 天按桶统计请求量 ----
const SPARK_BUCKETS = 24
const SPARK_WINDOW_MS = 30 * 86400e3

async function buildSparks(apiKey: string, field: "model" | "provider"): Promise<Map<string, number[]>> {
  const now = Date.now()
  const start = now - SPARK_WINDOW_MS
  const cutoffIso = new Date(start).toISOString()
  const rows = await query(
    `SELECT ${field} as name, timestamp
     FROM request_stats
     WHERE api_key = $1 AND endpoint = $2 AND timestamp >= $3`,
    [apiKey, CHAT_ENDPOINT, cutoffIso],
  )
  const step = SPARK_WINDOW_MS / SPARK_BUCKETS
  const map = new Map<string, number[]>()
  for (const r of rows) {
    const name = String(r.name ?? "unknown")
    const t = new Date(String(r.timestamp)).getTime()
    if (Number.isNaN(t)) continue
    let b = Math.floor((t - start) / step)
    if (b < 0) b = 0
    if (b >= SPARK_BUCKETS) b = SPARK_BUCKETS - 1
    let arr = map.get(name)
    if (!arr) {
      arr = new Array(SPARK_BUCKETS).fill(0)
      map.set(name, arr)
    }
    arr[b] += 1
  }
  return map
}

export async function getModelStats(apiKey: string): Promise<ModelStat[]> {
  const [rows, sparks] = await Promise.all([
    query(
      `SELECT r.model, ${DIMENSION_FIELDS}
       FROM request_stats r
       LEFT JOIN channel_stats c ON r.request_id = c.request_id
       WHERE r.api_key = $1 AND r.endpoint = $2
       GROUP BY r.model
       ORDER BY requests DESC`,
      [apiKey, CHAT_ENDPOINT],
    ),
    buildSparks(apiKey, "model"),
  ])
  return rows.map((r) => {
    const name = String(r.model ?? "unknown")
    return { model: name, ...mapDimension(r), spark: sparks.get(name) }
  })
}

export async function getChannelStats(apiKey: string): Promise<ChannelStat[]> {
  const [rows, sparks] = await Promise.all([
    query(
      `SELECT r.provider, ${DIMENSION_FIELDS}
       FROM request_stats r
       LEFT JOIN channel_stats c ON r.request_id = c.request_id
       WHERE r.api_key = $1 AND r.endpoint = $2
       GROUP BY r.provider
       ORDER BY requests DESC`,
      [apiKey, CHAT_ENDPOINT],
    ),
    buildSparks(apiKey, "provider"),
  ])
  return rows.map((r) => {
    const name = String(r.provider ?? "unknown")
    return { provider: name, ...mapDimension(r), spark: sparks.get(name) }
  })
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
