"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sidebar, type PageId } from "@/components/dashboard/sidebar"
import { Gate } from "@/components/dashboard/gate"
import { KeyModal } from "@/components/dashboard/key-modal"
import { useToasts } from "@/components/dashboard/toast"
import { Icons } from "@/components/dashboard/icons"
import { Logo } from "@/components/dashboard/primitives"
import { fmt } from "@/lib/format"
import { Overview } from "@/components/dashboard/screen-overview"
import { Channels, Models } from "@/components/dashboard/screen-dimension"
import { Logs } from "@/components/dashboard/screen-logs"
import { Tester } from "@/components/dashboard/screen-tester"
import { Config } from "@/components/dashboard/screen-config"

interface Auth {
  key: string
  role: string
  viewingKey: string
}

const SIDEBAR_KEY = "uniapi_sidebar_collapsed"

const TITLES: Record<PageId, string> = {
  overview: "Overview",
  models: "Models",
  channels: "Channels",
  logs: "Logs",
  tester: "Channel Tester",
  config: "Configuration",
}

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<PageId>("overview")
  const [auth, setAuth] = useState<Auth | null>(null)
  const [keyModal, setKeyModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [toast, toastNode] = useToasts()

  useEffect(() => {
    setMounted(true)
    try {
      const key = localStorage.getItem("uniapi_current_key")
      const role = localStorage.getItem("uniapi_current_role")
      const vk = localStorage.getItem("uniapi_viewing_key")
      if (key && role) setAuth({ key, role, viewingKey: vk || key })
    } catch {
      /* ignore */
    }
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const themeName = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"
  const toggleTheme = () => setTheme(themeName === "dark" ? "light" : "dark")

  const connect = (key: string, role: string, viewingKey: string) => {
    const next: Auth = { key, role, viewingKey: viewingKey || key }
    setAuth(next)
    try {
      localStorage.setItem("uniapi_current_key", next.key)
      localStorage.setItem("uniapi_current_role", next.role)
      localStorage.setItem("uniapi_viewing_key", next.viewingKey)
    } catch {
      /* ignore */
    }
    setPage("overview")
    setMobileOpen(false)
    if (role === "admin" && next.viewingKey !== key) {
      toast(`Viewing stats for ${fmt.keyShort(next.viewingKey)}`, "success")
    } else {
      toast(`Connected · role: ${role}`, "success")
    }
  }

  const signOut = () => {
    setAuth(null)
    try {
      localStorage.removeItem("uniapi_current_key")
      localStorage.removeItem("uniapi_current_role")
      localStorage.removeItem("uniapi_viewing_key")
    } catch {
      /* ignore */
    }
    setKeyModal(false)
    setMobileOpen(false)
  }

  const persistCollapsed = (v: boolean) => {
    setCollapsed(v)
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  if (!auth) {
    return (
      <>
        <Gate onConnect={connect} theme={themeName} toggleTheme={toggleTheme} />
        {toastNode}
      </>
    )
  }

  const statsKey = auth.viewingKey
  const adminViewing = auth.role === "admin" && auth.viewingKey !== auth.key

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        page={page}
        setPage={setPage}
        role={auth.role}
        theme={themeName}
        toggleTheme={toggleTheme}
        viewingKey={auth.viewingKey}
        onSettings={() => setKeyModal(true)}
        onSignOut={signOut}
        collapsed={collapsed}
        setCollapsed={persistCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* mobile topbar */}
        <div
          className="topbar-mobile"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: "none", border: "none", color: "var(--ink)", display: "grid", placeItems: "center" }}
          >
            <Icons.menu size={22} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Logo size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{TITLES[page]}</span>
          </div>
          <button
            onClick={() => setKeyModal(true)}
            style={{ background: "none", border: "none", color: "var(--ink)", display: "grid", placeItems: "center" }}
          >
            <Icons.key size={20} />
          </button>
        </div>

        {adminViewing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "var(--accent-soft)",
              color: "var(--accent-text)",
              fontSize: 12.5,
              fontWeight: 600,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <Icons.eye size={15} /> Admin view · showing stats for{" "}
            <span className="mono">{fmt.keyShort(auth.viewingKey)}</span>
          </div>
        )}

        <main
          className="main-pad"
          style={{ flex: 1, padding: "38px 44px 80px", maxWidth: 1320, width: "100%", margin: "0 auto" }}
        >
          {page === "overview" && <Overview apiKey={statsKey} />}
          {page === "models" && <Models apiKey={statsKey} />}
          {page === "channels" && <Channels apiKey={statsKey} />}
          {page === "logs" && <Logs apiKey={statsKey} />}
          {page === "tester" && <Tester apiKey={auth.key} toast={toast} />}
          {page === "config" && auth.role === "admin" && <Config apiKey={auth.key} toast={toast} />}
        </main>
      </div>

      <KeyModal
        open={keyModal}
        onClose={() => setKeyModal(false)}
        current={auth.key}
        role={auth.role}
        viewingKey={auth.viewingKey}
        onApply={connect}
        onClear={signOut}
        toast={toast}
      />
      {toastNode}
    </div>
  )
}
