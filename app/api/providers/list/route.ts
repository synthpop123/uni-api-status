import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { listProviders } from "@/lib/config"

export async function GET(request: Request) {
  return handleRoute(async () => {
    const apiKey = requireApiKeyParam(request)
    return NextResponse.json({ providers: listProviders(apiKey) })
  })
}
