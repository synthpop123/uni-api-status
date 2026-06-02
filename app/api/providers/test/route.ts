import { NextResponse } from "next/server"
import { ApiError, handleRoute, readJsonBody } from "@/lib/api-helpers"
import { resolveTestTarget } from "@/lib/config"

interface TestRequestBody extends Record<string, unknown> {
  apiKey?: string
  provider?: string
  model?: string
}

function testResponse(success: boolean, message: string, responseTime?: number, status?: number) {
  return NextResponse.json({ success, message, ...(responseTime == null ? {} : { responseTime }) }, status ? { status } : undefined)
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { apiKey, provider, model } = await readJsonBody<TestRequestBody>(request)

    if (!apiKey || !provider || !model) {
      throw new ApiError(400, "缺少必要参数")
    }

    // base_url / 上游密钥一律由服务端按渠道名从 api.yaml 解析，客户端无法注入任意目标（防 SSRF）
    const { base_url, api, model: resolvedModel } = resolveTestTarget(apiKey, provider, model)

    const isAnthropic = new URL(base_url).pathname.endsWith("/v1/messages")
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
        return testResponse(true, "测试成功", responseTime)
      }
      const errorData = await response.text()
      return testResponse(false, `HTTP ${response.status}: ${errorData.substring(0, 200)}`, responseTime)
    } catch (error) {
      const responseTime = (Date.now() - startTime) / 1000
      const message = (error as Error).name === "TimeoutError" ? "请求超时(60s)" : `网络错误: ${(error as Error).message}`
      return testResponse(false, message, responseTime)
    }
  })
}
