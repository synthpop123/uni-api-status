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

/** 从查询字符串读取必填的 apiKey，缺失则抛 400 */
export function requireApiKeyParam(request: Request): string {
  const apiKey = new URL(request.url).searchParams.get("apiKey")
  if (!apiKey) throw new ApiError(400, "API Key is required")
  return apiKey
}
