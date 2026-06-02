import { NextResponse } from "next/server"
import { ApiError, handleRoute, readJsonBody } from "@/lib/api-helpers"
import { saveConfig } from "@/lib/config"

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { apiKey, config } = await readJsonBody<{ apiKey?: string; config?: string }>(request)
    if (!apiKey || !config) throw new ApiError(400, "API Key and config are required")
    saveConfig(apiKey, config)
    return NextResponse.json({ success: true })
  })
}
