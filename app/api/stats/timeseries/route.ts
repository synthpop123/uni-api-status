import { NextResponse } from "next/server"
import { ApiError, handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { getTimeseries } from "@/lib/stats"
import type { TimeseriesRange } from "@/lib/types"

const RANGES: TimeseriesRange[] = ["1D", "1W", "1M", "3M", "ALL"]

export async function GET(request: Request) {
  return handleRoute(async () => {
    const apiKey = requireApiKeyParam(request)
    const raw = new URL(request.url).searchParams.get("range") || "1M"
    const range = raw.toUpperCase() as TimeseriesRange
    if (!RANGES.includes(range)) {
      throw new ApiError(400, `Invalid range "${raw}". Expected one of: ${RANGES.join(", ")}`)
    }
    return NextResponse.json(await getTimeseries(apiKey, range))
  })
}
