"use client"

import * as React from "react"
import { useState } from "react"
import { Icons, type IconComponent } from "@/components/dashboard/icons"
import { Logo } from "@/components/dashboard/primitives"
import { fmt } from "@/lib/format"

export type PageId = "overview" | "models" | "channels" | "logs" | "tester" | "config"

interface NavEntry {
  id: PageId
  label: string
  icon: string
  admin?: boolean
}

const NAV: NavEntry[] = [
  { id: "overview", label: "Overview", icon: "pulse" },
  { id: "models", label: "Models", icon: "layers" },
  { id: "channels", label: "Channels", icon: "server" },
  { id: "logs", label: "Logs", icon: "list" },
  { id: "tester", label: "Channel Tester", icon: "bolt" },
  { id: "config", label: "Configuration", icon: "sliders", admin: true },
]

function navBtnStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "var(--r-md)",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--ink-3)",
    background: "transparent",
    transition: "all .18s",
    whiteSpace: "nowrap",
  }
}

function NavItem({
  entry,
  IconC,
  active,
  collapsed,
  onClick,
}: {
  entry: NavEntry
  IconC: IconComponent
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={collapsed ? entry.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: collapsed ? "11px" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        border: "none",
        borderRadius: "var(--r-md)",
        fontSize: 14,
        fontWeight: 600,
        color: active ? "var(--ink)" : "var(--ink-3)",
        background: active ? "var(--surface-hover)" : h ? "var(--surface-2)" : "transparent",
        transition: "all .18s var(--ease)",
        position: "relative",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: collapsed ? 8 : -14,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 20,
            background: "var(--accent)",
            borderRadius: 99,
          }}
        />
      )}
      <IconC size={19} style={{ color: active ? "var(--accent)" : "inherit", flexShrink: 0 }} />
      {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{entry.label}</span>}
    </button>
  )
}

export function Sidebar({
  page,
  setPage,
  role,
  theme,
  toggleTheme,
  viewingKey,
  onSettings,
  onSignOut,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  page: PageId
  setPage: (p: PageId) => void
  role: string
  theme: string
  toggleTheme: () => void
  viewingKey: string
  onSettings: () => void
  onSignOut: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}) {
  const isAdmin = role === "admin"
  const items = NAV.filter((n) => !n.admin || isAdmin)

  const content = (
    <>
      <div style={{ padding: "26px 22px 22px", display: "flex", alignItems: "center", gap: 11 }}>
        <Logo size={32} />
        {!collapsed && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>UniAPI</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.14em", fontWeight: 600, marginTop: 3 }}>
              GATEWAY
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "8px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
        {!collapsed && (
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--ink-faint)",
              padding: "10px 12px 8px",
            }}
          >
            ANALYTICS
          </div>
        )}
        {items.map((n) => {
          const IconC = Icons[n.icon]
          const active = page === n.id
          if (n.id === "tester") {
            return (
              <React.Fragment key={n.id}>
                {!collapsed && (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "var(--ink-faint)",
                      padding: "16px 12px 8px",
                    }}
                  >
                    OPERATIONS
                  </div>
                )}
                <NavItem
                  entry={n}
                  IconC={IconC}
                  active={active}
                  collapsed={collapsed}
                  onClick={() => {
                    setPage(n.id)
                    setMobileOpen(false)
                  }}
                />
              </React.Fragment>
            )
          }
          return (
            <NavItem
              key={n.id}
              entry={n}
              IconC={IconC}
              active={active}
              collapsed={collapsed}
              onClick={() => {
                setPage(n.id)
                setMobileOpen(false)
              }}
            />
          )
        })}
      </nav>

      <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          style={{ ...navBtnStyle(), justifyContent: collapsed ? "center" : "flex-start" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icons.chevron size={18} style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: "transform .2s" }} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={toggleTheme}
          style={{ ...navBtnStyle(), justifyContent: collapsed ? "center" : "flex-start" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {theme === "dark" ? <Icons.sun size={18} /> : <Icons.moon size={18} />}
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={onSettings}
          style={{ ...navBtnStyle(), justifyContent: collapsed ? "center" : "flex-start" }}
          title={collapsed ? "API Keys" : undefined}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icons.key size={18} />
          {!collapsed && <span>API Keys</span>}
        </button>
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              marginTop: 4,
              background: "var(--surface-2)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 99,
                background: "var(--accent-soft)",
                color: "var(--accent-text)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {isAdmin ? "AD" : "US"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, textTransform: "capitalize" }}>{role}</div>
              <div
                className="mono"
                style={{ fontSize: 10.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {fmt.keyShort(viewingKey)}
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{ background: "none", border: "none", color: "var(--ink-3)", display: "grid", placeItems: "center", padding: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--down)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
            >
              <Icons.logout size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* desktop */}
      <aside
        className="sidebar-desktop"
        style={{
          width: collapsed ? 76 : 256,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          transition: "width .3s var(--ease)",
        }}
      >
        {content}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="sidebar-mobile" style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <aside
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 264,
              background: "var(--surface)",
              borderRight: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              animation: "slideIn .25s var(--ease)",
            }}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
