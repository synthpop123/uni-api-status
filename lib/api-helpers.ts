import { NextResponse } from "next/server"

/** 带 HTTP 状态码的业务错误，会被 handleRoute 转成对应的 JSON 响应 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** 统一的错误响应包装：捕获 ApiError 与未预期异常，避免每个路由重复 try/catch */
export async function handleRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Unhandled API error:", error)
    const details = process.env.NODE_ENV !== "production" ? { details: (error as Error).message } : {}
    return NextResponse.json({ error: "Internal server error", ...details }, { status: 500 })
  }
}

/**
 * 读取必填的 apiKey：优先取 `x-api-key` 请求头（避免密钥出现在 URL / 访问日志中），
 * 回退到查询字符串以兼容直接调用 API 的场景；都缺失则抛 400。
 */
export function requireApiKeyParam(request: Request): string {
  const apiKey = request.headers.get("x-api-key") || new URL(request.url).searchParams.get("apiKey")
  if (!apiKey) throw new ApiError(400, "API Key is required")
  return apiKey
}

/** 安全读取 JSON 请求体；空 body / 非 JSON 都返回 400，而不是泄露为 500。 */
export async function readJsonBody<T extends Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "JSON object body is required")
    }
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, "Invalid JSON body")
  }
}
