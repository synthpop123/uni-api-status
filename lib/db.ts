import Database from "better-sqlite3"
import { Pool } from "pg"

type Row = Record<string, unknown>

const dbType = process.env.STATS_DB_TYPE || "sqlite"

/**
 * 统一的查询接口：接受 PostgreSQL 风格的 `$1, $2` 占位符与参数数组，返回行对象数组。
 * SQLite 分支会按占位符编号把 `$n` 转换为 `?`，重复占位符也会绑定到同一个参数值。
 */
let runQuery: (sql: string, params?: unknown[]) => Promise<Row[]>

if (dbType === "postgres") {
  const pool = new Pool({
    user: process.env.STATS_DB_USER,
    host: process.env.STATS_DB_HOST,
    database: process.env.STATS_DB_NAME,
    password: process.env.STATS_DB_PASSWORD,
    port: Number.parseInt(process.env.STATS_DB_PORT || "5432", 10),
  })

  runQuery = async (sql, params = []) => {
    const result = await pool.query(sql, params as unknown[])
    return result.rows as Row[]
  }
} else {
  const dbPath = process.env.STATS_DB_PATH || "./data/stats.db"

  // 惰性单例：避免在模块加载阶段（如构建时）就尝试打开数据库文件
  let db: Database.Database | null = null
  const getDb = () => {
    if (!db) {
      db = new Database(dbPath, { readonly: true, fileMustExist: true })
    }
    return db
  }

  runQuery = async (sql, params = []) => {
    const bound: unknown[] = []
    const sqliteSql = sql.replace(/\$(\d+)/g, (_, index: string) => {
      const value = params[Number.parseInt(index, 10) - 1]
      // better-sqlite3 仅支持 number/string/bigint/buffer/null，需把布尔值转成 0/1。
      bound.push(typeof value === "boolean" ? (value ? 1 : 0) : value)
      return "?"
    })
    const stmt = getDb().prepare(sqliteSql)
    return stmt.all(...bound) as Row[]
  }
}

export const query = runQuery
