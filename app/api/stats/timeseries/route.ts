import { NextResponse } from "next/server"
import { ApiError, handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { requireAdmin, resolveViewKey } from "@/lib/config"
import { getTimeseries } from "@/lib/stats"
import type { TimeseriesRange } from "@/lib/types"

const RANGES: TimeseriesRange[] = ["1D", "1W", "1M", "3M", "ALL"]

export async function GET(request: Request) {
  return handleRoute(async () => {
    requireAdmin(requireApiKeyParam(request))
    const { searchParams } = new URL(request.url)
    const viewKey = resolveViewKey(searchParams.get("key"))
    const raw = searchParams.get("range") || "1M"
    const range = raw.toUpperCase() as TimeseriesRange
    if (!RANGES.includes(range)) {
      throw new ApiError(400, `Invalid range "${raw}". Expected one of: ${RANGES.join(", ")}`)
    }
    return NextResponse.json(await getTimeseries(viewKey, range))
  })
}
