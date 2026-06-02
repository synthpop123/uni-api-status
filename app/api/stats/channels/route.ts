import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { requireAdmin, resolveViewKey } from "@/lib/config"
import { getChannelStats } from "@/lib/stats"

export async function GET(request: Request) {
  return handleRoute(async () => {
    requireAdmin(requireApiKeyParam(request))
    const viewKey = resolveViewKey(new URL(request.url).searchParams.get("key"))
    return NextResponse.json(await getChannelStats(viewKey))
  })
}
