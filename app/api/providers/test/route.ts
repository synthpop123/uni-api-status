import { NextResponse } from "next/server"
import { ApiError } from "@/lib/api-helpers"
import { resolveTestTarget } from "@/lib/config"

interface TestRequestBody {
  apiKey: string
  provider: string
  model: string
}

export async function POST(request: Request) {
  try {
    const { apiKey, provider, model } = (await request.json()) as TestRequestBody

    if (!apiKey || !provider || !model) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 })
    }

    // base_url / 上游密钥一律由服务端按渠道名从 api.yaml 解析，客户端无法注入任意目标（防 SSRF）
    let base_url: string
    let api: string
    let resolvedModel: string
    try {
      ;({ base_url, api, model: resolvedModel } = resolveTestTarget(apiKey, provider, model))
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ success: false, message: error.message }, { status: error.status })
      }
      throw error
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
      ? { model: resolvedModel, max_tokens: 16, messages: [{ role: "user", content: "渠道测试，仅回复ok" }] }
      : { model: resolvedModel, messages: [{ role: "user", content: "渠道测试，仅回复ok" }] }

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
