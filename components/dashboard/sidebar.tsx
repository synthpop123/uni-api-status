"use client"

import * as React from "react"
import { useState } from "react"
import { Icons, type IconComponent } from "@/components/dashboard/icons"
import { Logo } from "@/components/dashboard/primitives"
import { KeySwitcher } from "@/components/dashboard/key-switcher"
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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "var(--ink-faint)",
}

// 收缩/展开侧栏的小图标按钮（展开时在标题栏右侧，收缩时在 Logo 下方居中）。
function IconButton({
  icon: IconC,
  title,
  onClick,
  tone = "muted",
}: {
  icon: IconComponent
  title: string
  onClick: () => void
  tone?: "muted" | "danger"
}) {
  const [h, setH] = useState(false)
  const base = "var(--ink-3)"
  const hover = tone === "danger" ? "var(--down)" : "var(--ink)"
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 32,
        height: 32,
        borderRadius: "var(--r-sm)",
        border: "none",
        background: h ? "var(--surface-hover)" : "transparent",
        color: h ? hover : base,
        display: "grid",
        placeItems: "center",
        transition: "background .18s, color .18s",
        flexShrink: 0,
      }}
    >
      <IconC size={18} />
    </button>
  )
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
  theme,
  toggleTheme,
  adminKey,
  viewKey,
  setViewKey,
  onSignOut,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  page: PageId
  setPage: (p: PageId) => void
  theme: string
  toggleTheme: () => void
  adminKey: string
  viewKey: string | null
  setViewKey: (v: string | null) => void
  onSignOut: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}) {
  // 仅 admin 可登录，因此导航项全部可见（包含仅管理员的 Configuration）。
  const items = NAV

  // 收缩仅作用于桌面端侧栏；移动端抽屉始终展开（isCollapsed 恒为 false）。
  const renderContent = (isCollapsed: boolean, isMobile: boolean) => (
    <>
      {/* header: logo + brand + collapse/close affordance */}
      <div
        style={
          isCollapsed
            ? { padding: "22px 0 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }
            : { padding: "22px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <Logo size={30} />
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>UniAPI</div>
              <div style={{ ...sectionLabelStyle, letterSpacing: "0.14em", marginTop: 3 }}>GATEWAY</div>
            </div>
          )}
        </div>
        {isMobile ? (
          <IconButton icon={Icons.x} title="Close" onClick={() => setMobileOpen(false)} />
        ) : (
          <IconButton
            icon={Icons.panelLeft}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!isCollapsed)}
          />
        )}
      </div>

      {/* key usage switcher */}
      <div style={{ padding: isCollapsed ? "2px 16px 12px" : "2px 14px 12px" }}>
        <KeySwitcher adminKey={adminKey} value={viewKey} onChange={setViewKey} collapsed={isCollapsed} />
      </div>

      <nav style={{ flex: 1, padding: "4px 14px 8px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {!isCollapsed && <div style={{ ...sectionLabelStyle, padding: "8px 12px 8px" }}>ANALYTICS</div>}
        {items.map((n) => {
          const IconC = Icons[n.icon]
          const active = page === n.id
          const item = (
            <NavItem
              key={n.id}
              entry={n}
              IconC={IconC}
              active={active}
              collapsed={isCollapsed}
              onClick={() => {
                setPage(n.id)
                setMobileOpen(false)
              }}
            />
          )
          if (n.id === "tester") {
            return (
              <React.Fragment key={n.id}>
                {!isCollapsed && <div style={{ ...sectionLabelStyle, padding: "16px 12px 8px" }}>OPERATIONS</div>}
                {item}
              </React.Fragment>
            )
          }
          return item
        })}
      </nav>

      <div
        style={{
          padding: 14,
          borderTop: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: isCollapsed ? "center" : "stretch",
        }}
      >
        {isCollapsed ? (
          <>
            <IconButton icon={theme === "dark" ? Icons.sun : Icons.moon} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme} />
            <IconButton icon={Icons.logout} title="Sign out" onClick={onSignOut} tone="danger" />
          </>
        ) : (
          <>
            <button
              onClick={toggleTheme}
              style={navBtnStyle()}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {theme === "dark" ? <Icons.sun size={18} /> : <Icons.moon size={18} />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
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
                AD
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Admin</div>
                <div
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {fmt.keyShort(adminKey)}
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
          </>
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
        {renderContent(collapsed, false)}
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
            {renderContent(false, true)}
          </aside>
        </div>
      )}
    </>
  )
}
