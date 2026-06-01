import { NextResponse } from "next/server"
import { ApiError, handleRoute } from "@/lib/api-helpers"
import { saveConfig } from "@/lib/config"

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { apiKey, config } = await request.json()
    if (!apiKey || !config) throw new ApiError(400, "API Key and config are required")
    saveConfig(apiKey, config)
    return NextResponse.json({ success: true })
  })
}
