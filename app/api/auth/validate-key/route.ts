import { NextResponse } from "next/server"
import { ApiError, handleRoute } from "@/lib/api-helpers"
import { validateKey } from "@/lib/config"

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { apiKey } = await request.json()
    if (!apiKey) throw new ApiError(400, "API Key is required")
    return NextResponse.json(validateKey(apiKey))
  })
}
