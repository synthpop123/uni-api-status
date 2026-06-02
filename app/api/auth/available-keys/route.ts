import { NextResponse } from "next/server"
import { ApiError, handleRoute, readJsonBody } from "@/lib/api-helpers"
import { listKeys } from "@/lib/config"

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { adminKey } = await readJsonBody<{ adminKey?: string }>(request)
    if (!adminKey) throw new ApiError(400, "Admin key is required")
    return NextResponse.json({ keys: listKeys(adminKey) })
  })
}
