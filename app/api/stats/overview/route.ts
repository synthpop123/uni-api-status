import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { getOverview } from "@/lib/stats"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const apiKey = requireApiKeyParam(request)
    return NextResponse.json(await getOverview(apiKey))
  })
}
