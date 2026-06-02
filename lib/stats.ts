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

// uni-api 会把 OpenAI 风格 (/v1/chat/completions、/v1/responses) 与 Anthropic 风格
// (/v1/messages) 的对话请求都写入 request_stats。三者都算“对话”流量，统计时需一并纳入，
// 否则纯 Claude（/v1/messages）或 Responses API 后端会让面板完全没有数据。
const CHAT_ENDPOINTS = ["POST /v1/chat/completions", "POST /v1/messages", "POST /v1/responses"]

// 生成 `endpoint IN ($n, $n+1, …)` 子句：从 start 编号开始，返回子句文本与下一个可用占位符序号。
// 这样无论后端是 PostgreSQL 还是 SQLite（db.ts 会把 $n 转成 ?）都能正确绑定多个端点。
function endpointIn(start: number): { clause: string; next: number } {
  const placeholders = CHAT_ENDPOINTS.map((_, k) => `$${start + k}`).join(", ")
  return { clause: `(${placeholders})`, next: start + CHAT_ENDPOINTS.length }
}

// 将 channel_stats 先按 request_id 压成一行，避免与 request_stats 一对多 join 时放大请求数与 token 量。
const CHANNEL_ROLLUP = `
  SELECT request_id, MAX(CASE WHEN success = true THEN 1 ELSE 0 END) as success
  FROM channel_stats
  GROUP BY request_id
`

// request_stats 口径的维度聚合字段：请求数 / token / 耗时均只统计每个请求一次；
// 成功率则使用上面的 channel_stats rollup 标记“该请求是否至少有一次成功渠道”。
// 注意：别名一律加双引号。PostgreSQL 会把未加引号的标识符折叠为小写
// （totalTokens → totaltokens），导致前端按 camelCase 取值时拿到 undefined→0；
// SQLite 则保留原样。加引号后两种数据库都返回 camelCase，前端读取保持一致。
const DIMENSION_FIELDS = `
  COUNT(*) as requests,
  COALESCE(SUM(CASE WHEN COALESCE(cs.success, 0) = 1 THEN 1 ELSE 0 END), 0) as successes,
  COALESCE(SUM(CASE WHEN COALESCE(cs.success, 0) = 1 THEN 0 ELSE 1 END), 0) as failures,
  COALESCE(AVG(CASE WHEN COALESCE(cs.success, 0) = 1 THEN 1.0 ELSE 0.0 END), 0) as "successRate",
  COALESCE(SUM(r.total_tokens), 0) as "totalTokens",
  COALESCE(SUM(r.prompt_tokens), 0) as "promptTokens",
  COALESCE(SUM(r.completion_tokens), 0) as "completionTokens",
  COALESCE(AVG(r.process_time), 0) as "avgProcessTime",
  COALESCE(AVG(r.first_response_time), 0) as "avgFirstResponseTime"
`

const toNumber = (v: unknown) => Number(v ?? 0)
const toBool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true"

// uni-api 的 model_price 以「每百万 token 美元价」记录（如 claude 的 5,25）。
// 单条请求成本 = 输入 token / 1e6 × 输入价 + 输出 token / 1e6 × 输出价。
// 两个价格都缺失时返回 null，前端据此显示「—」。
function computeCost(
  promptPrice: unknown,
  completionPrice: unknown,
  promptTokens: unknown,
  completionTokens: unknown,
): number | null {
  if (promptPrice == null && completionPrice == null) return null
  const pp = Number(promptPrice ?? 0)
  const cp = Number(completionPrice ?? 0)
  return (toNumber(promptTokens) * pp + toNumber(completionTokens) * cp) / 1e6
}

export async function getOverview(apiKey: string): Promise<OverviewStats> {
  const rows = await query(
    `SELECT
       COUNT(*) as requests,
       COALESCE(SUM(r.total_tokens), 0) as "totalTokens",
       COALESCE(SUM(r.prompt_tokens), 0) as "promptTokens",
       COALESCE(SUM(r.completion_tokens), 0) as "completionTokens",
       COALESCE(AVG(r.process_time), 0) as "avgProcessTime",
       COALESCE(AVG(r.first_response_time), 0) as "avgFirstResponseTime",
       COUNT(DISTINCT r.model) as "activeModels",
       COUNT(DISTINCT r.provider) as "activeChannels",
       COALESCE(AVG(CASE WHEN COALESCE(cs.success, 0) = 1 THEN 1.0 ELSE 0.0 END), 0) as "successRate"
     FROM request_stats r
     LEFT JOIN (${CHANNEL_ROLLUP}) cs ON r.request_id = cs.request_id
     WHERE r.api_key = $1 AND r.endpoint IN ${endpointIn(2).clause}`,
    [apiKey, ...CHAT_ENDPOINTS],
  )
  const r = rows[0] ?? {}
  return {
    requests: toNumber(r.requests),
    totalTokens: toNumber(r.totalTokens),
    promptTokens: toNumber(r.promptTokens),
    completionTokens: toNumber(r.completionTokens),
    avgProcessTime: toNumber(r.avgProcessTime),
    avgFirstResponseTime: toNumber(r.avgFirstResponseTime),
    successRate: toNumber(r.successRate),
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
  const ep = endpointIn(2)
  const params: unknown[] = [apiKey, ...CHAT_ENDPOINTS]
  let sql = `SELECT timestamp, COALESCE(total_tokens, 0) as tok
             FROM request_stats
             WHERE api_key = $1 AND endpoint IN ${ep.clause}`
  if (cutoffIso != null) {
    sql += ` AND timestamp >= $${ep.next}`
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
           WHERE api_key = $1 AND endpoint IN ${ep.clause} AND timestamp < $${ep.next}`,
          [apiKey, ...CHAT_ENDPOINTS, cutoffIso],
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
  const ep = endpointIn(2)
  const rows = await query(
    `SELECT ${field} as name, timestamp
     FROM request_stats
     WHERE api_key = $1 AND endpoint IN ${ep.clause} AND timestamp >= $${ep.next}`,
    [apiKey, ...CHAT_ENDPOINTS, cutoffIso],
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
       LEFT JOIN (${CHANNEL_ROLLUP}) cs ON r.request_id = cs.request_id
       WHERE r.api_key = $1 AND r.endpoint IN ${endpointIn(2).clause}
       GROUP BY r.model
       ORDER BY requests DESC`,
      [apiKey, ...CHAT_ENDPOINTS],
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
       LEFT JOIN (${CHANNEL_ROLLUP}) cs ON r.request_id = cs.request_id
       WHERE r.api_key = $1 AND r.endpoint IN ${endpointIn(2).clause}
       GROUP BY r.provider
       ORDER BY requests DESC`,
      [apiKey, ...CHAT_ENDPOINTS],
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
      `SELECT DISTINCT model FROM request_stats WHERE api_key = $1 AND endpoint IN ${endpointIn(2).clause} AND model IS NOT NULL ORDER BY model`,
      [apiKey, ...CHAT_ENDPOINTS],
    ),
    query(
      `SELECT DISTINCT provider FROM request_stats WHERE api_key = $1 AND endpoint IN ${endpointIn(2).clause} AND provider IS NOT NULL ORDER BY provider`,
      [apiKey, ...CHAT_ENDPOINTS],
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

  const ep = endpointIn(2)
  const where: string[] = ["r.api_key = $1", `r.endpoint IN ${ep.clause}`]
  const params: unknown[] = [apiKey, ...CHAT_ENDPOINTS]
  let i = ep.next

  if (model) {
    where.push(`r.model = $${i++}`)
    params.push(model)
  }
  if (provider) {
    where.push(`r.provider = $${i++}`)
    params.push(provider)
  }
  if (status === "success" || status === "failed") {
    where.push(`COALESCE(cs.success, 0) = $${i++}`)
    params.push(status === "success" ? 1 : 0)
  }

  // 多取一条用于判断是否有下一页。channel_stats 先 rollup，避免 PostgreSQL 的 boolean MAX
  // 兼容性问题，也避免多渠道重试时一条请求被重复展示。
  const offset = (page - 1) * limit
  const sql = `
    SELECT
      r.timestamp,
      COALESCE(cs.success, 0) as success,
      COALESCE(r.is_flagged, false) as "isFlagged",
      r.model,
      r.provider,
      r.process_time as "processTime",
      r.first_response_time as "firstResponseTime",
      r.prompt_tokens as "promptTokens",
      r.completion_tokens as "completionTokens",
      r.total_tokens as "totalTokens",
      r.prompt_price as "promptPrice",
      r.completion_price as "completionPrice",
      r.text
    FROM request_stats r
    LEFT JOIN (${CHANNEL_ROLLUP}) cs ON r.request_id = cs.request_id
    WHERE ${where.join(" AND ")}
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
    cost: computeCost(r.promptPrice, r.completionPrice, r.promptTokens, r.completionTokens),
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
