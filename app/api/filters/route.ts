import { NextResponse } from "next/server"
import { handleRoute, readViewKeyId, requireApiKeyParam } from "@/lib/api-helpers"
import { requireAdmin, resolveViewKey } from "@/lib/config"
import { getFilters } from "@/lib/stats"

export async function GET(request: Request) {
  return handleRoute(async () => {
    requireAdmin(requireApiKeyParam(request))
    const viewKey = resolveViewKey(readViewKeyId(request))
    return NextResponse.json(await getFilters(viewKey))
  })
}
