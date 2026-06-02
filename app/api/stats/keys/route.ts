import { NextResponse } from "next/server"
import { handleRoute, requireApiKeyParam } from "@/lib/api-helpers"
import { requireAdmin } from "@/lib/config"
import { getKeyUsage } from "@/lib/stats"

// 返回「有实际请求」的 Key 用量列表，供首页右上角的 Key 切换器使用。仅 admin 可调用。
export async function GET(request: Request) {
  return handleRoute(async () => {
    requireAdmin(requireApiKeyParam(request))
    return NextResponse.json({ keys: await getKeyUsage() })
  })
}
