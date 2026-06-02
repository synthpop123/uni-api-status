"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sidebar, type PageId } from "@/components/dashboard/sidebar"
import { Gate } from "@/components/dashboard/gate"
import { Logo } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import { useToasts } from "@/components/dashboard/toast"
import { Overview } from "@/components/dashboard/screen-overview"
import { Channels, Models } from "@/components/dashboard/screen-dimension"
import { Logs } from "@/components/dashboard/screen-logs"
import { Tester } from "@/components/dashboard/screen-tester"
import { Config } from "@/components/dashboard/screen-config"

const ADMIN_KEY = "uniapi_admin_key"
const VIEW_KEY = "uniapi_view_key"
const SIDEBAR_KEY = "uniapi_sidebar_collapsed"

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<PageId>("overview")
  const [adminKey, setAdminKey] = useState<string | null>(null)
  // 查看哪个 Key 的用量：存储的是该 Key 的不透明标识（KeyUsage.id，非密钥本身），null = 全部聚合（默认）
  const [viewKey, setViewKey] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [toast, toastNode] = useToasts()

  useEffect(() => {
    setMounted(true)
    try {
      const key = localStorage.getItem(ADMIN_KEY)
      if (key) setAdminKey(key)
      // viewKey 现为不透明标识（64 位十六进制）。旧版本可能存了原始密钥，
      // 升级后格式不符则丢弃，避免它被当作 viewKey 发出去（既会 403，也是历史遗留的明文密钥）。
      const storedView = localStorage.getItem(VIEW_KEY)
      if (storedView && /^[a-f0-9]{64}$/.test(storedView)) {
        setViewKey(storedView)
      } else if (storedView) {
        localStorage.removeItem(VIEW_KEY)
      }
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const themeName = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"
  const toggleTheme = () => setTheme(themeName === "dark" ? "light" : "dark")

  const connect = (key: string) => {
    setAdminKey(key)
    setViewKey(null)
    try {
      localStorage.setItem(ADMIN_KEY, key)
      localStorage.removeItem(VIEW_KEY)
    } catch {
      /* ignore */
    }
    setPage("overview")
    setMobileOpen(false)
    toast("Signed in as admin", "success")
  }

  const signOut = () => {
    setAdminKey(null)
    setViewKey(null)
    try {
      localStorage.removeItem(ADMIN_KEY)
      localStorage.removeItem(VIEW_KEY)
    } catch {
      /* ignore */
    }
    setMobileOpen(false)
  }

  const changeViewKey = (v: string | null) => {
    setViewKey(v)
    try {
      if (v) localStorage.setItem(VIEW_KEY, v)
      else localStorage.removeItem(VIEW_KEY)
    } catch {
      /* ignore */
    }
  }

  const persistCollapsed = (v: boolean) => {
    setCollapsed(v)
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  if (!adminKey) {
    return (
      <>
        <Gate onConnect={connect} theme={themeName} toggleTheme={toggleTheme} />
        {toastNode}
      </>
    )
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        page={page}
        setPage={setPage}
        theme={themeName}
        toggleTheme={toggleTheme}
        adminKey={adminKey}
        viewKey={viewKey}
        setViewKey={changeViewKey}
        onSignOut={signOut}
        collapsed={collapsed}
        setCollapsed={persistCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* mobile-only header: opens the sidebar drawer (desktop keeps the sidebar always visible) */}
        <header
          className="mobile-header"
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            background: "color-mix(in oklab, var(--surface) 80%, transparent)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            style={{ background: "none", border: "none", color: "var(--ink)", display: "grid", placeItems: "center" }}
          >
            <Icons.menu size={22} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Logo size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>UniAPI</span>
          </div>
        </header>

        <main
          className="main-pad"
          style={{ flex: 1, padding: "34px 44px 80px", maxWidth: 1320, width: "100%", margin: "0 auto" }}
        >
          {page === "overview" && <Overview adminKey={adminKey} viewKey={viewKey} />}
          {page === "models" && <Models adminKey={adminKey} viewKey={viewKey} />}
          {page === "channels" && <Channels adminKey={adminKey} viewKey={viewKey} />}
          {page === "logs" && <Logs adminKey={adminKey} viewKey={viewKey} />}
          {page === "tester" && <Tester apiKey={adminKey} toast={toast} />}
          {page === "config" && <Config apiKey={adminKey} toast={toast} />}
        </main>
      </div>

      {toastNode}
    </div>
  )
}
