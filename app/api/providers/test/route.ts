import { NextResponse } from "next/server"
import { requireKey } from "@/lib/config"

interface TestRequestBody {
  apiKey: string
  provider: string
  base_url: string
  api: string
  model: string
}

export async function POST(request: Request) {
  try {
    const { apiKey, provider, base_url, api, model } = (await request.json()) as TestRequestBody

    if (!apiKey || !provider || !base_url || !api || !model) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 })
    }

    // 校验调用者持有有效 Key（无效会抛 ApiError）
    try {
      requireKey(apiKey)
    } catch {
      return NextResponse.json({ success: false, message: "未授权" }, { status: 403 })
    }

    if (!base_url.includes("/chat/completions") && !base_url.includes("/v1/messages")) {
      return NextResponse.json({ success: false, message: "不支持的端点类型" })
    }

    const isAnthropic = base_url.includes("/v1/messages")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (isAnthropic) {
      headers["x-api-key"] = api
      headers["anthropic-version"] = "2023-06-01"
    } else {
      headers["Authorization"] = `Bearer ${api}`
    }

    const payload = isAnthropic
      ? { model, max_tokens: 16, messages: [{ role: "user", content: "渠道测试，仅回复ok" }] }
      : { model, messages: [{ role: "user", content: "渠道测试，仅回复ok" }] }

    const startTime = Date.now()
    try {
      const response = await fetch(base_url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      })
      const responseTime = (Date.now() - startTime) / 1000

      if (response.ok) {
        return NextResponse.json({ success: true, message: "测试成功", responseTime })
      }
      const errorData = await response.text()
      return NextResponse.json({
        success: false,
        message: `HTTP ${response.status}: ${errorData.substring(0, 200)}`,
        responseTime,
      })
    } catch (error) {
      const responseTime = (Date.now() - startTime) / 1000
      const message =
        (error as Error).name === "TimeoutError" ? "请求超时(60s)" : `网络错误: ${(error as Error).message}`
      return NextResponse.json({ success: false, message, responseTime })
    }
  } catch (error) {
    console.error("Error testing provider:", error)
    return NextResponse.json({ success: false, message: "内部服务器错误" }, { status: 500 })
  }
}
