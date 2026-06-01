import { NextResponse } from "next/server"
import { ApiError, handleRoute } from "@/lib/api-helpers"
import { listKeys } from "@/lib/config"

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { adminKey } = await request.json()
    if (!adminKey) throw new ApiError(400, "Admin key is required")
    return NextResponse.json({ keys: listKeys(adminKey) })
  })
}
