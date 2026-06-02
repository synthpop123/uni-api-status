import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { requireAdmin, resolveViewKey } from "@/lib/config"
import { getLogs } from "@/lib/stats"
import type { LogFilters } from "@/lib/types"

export async function GET(request: Request) {
  return handleRoute(async () => {
    requireAdmin(requireApiKeyParam(request))
    const { searchParams } = new URL(request.url)
    const viewKey = resolveViewKey(searchParams.get("key"))

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(Math.max(1, Number.parseInt(searchParams.get("limit") || "30", 10)), 100)
    const status = searchParams.get("status")

    const result = await getLogs(viewKey, {
      page,
      limit,
      model: searchParams.get("model") || undefined,
      provider: searchParams.get("provider") || undefined,
      status: (status === "success" || status === "failed" ? status : undefined) as LogFilters["status"],
    })

    return NextResponse.json(result)
  })
}
