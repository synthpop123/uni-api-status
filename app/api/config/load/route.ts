import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { readConfig, requireAdmin } from "@/lib/config"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const apiKey = requireApiKeyParam(request)
    requireAdmin(apiKey)
    return NextResponse.json({ config: readConfig().raw })
  })
}
