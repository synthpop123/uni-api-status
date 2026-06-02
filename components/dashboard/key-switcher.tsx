"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Badge } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import { fmt } from "@/lib/format"
import { useKeyUsage } from "@/hooks/use-stats"
import type { KeyUsage } from "@/lib/types"

// 侧栏顶部的 Key 切换器：选择查看「全部 Key」（聚合，默认）或某个有实际请求的 Key 的用量。
// 没有任何请求的 Key（如仅用于鉴权的 admin）不会出现在列表里。
// collapsed 时折叠成一个图标按钮，菜单从侧栏右侧飞出；展开时是整行的下拉触发器。
export function KeySwitcher({
  adminKey,
  value,
  onChange,
  collapsed = false,
}: {
  adminKey: string
  value: string | null
  onChange: (v: string | null) => void
  collapsed?: boolean
}) {
  const { data, isLoading } = useKeyUsage(adminKey)
  const keys = data?.keys ?? []

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null)

  useEffect(() => setMounted(true), [])

  // 折叠时菜单从侧栏右侧飞出；展开时落在触发器正下方、与其等宽。两种情况都夹住高度避免被视口裁切。
  const compute = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 10
    if (collapsed) {
      const width = 280
      const top = r.top
      // 触发器在收缩侧栏内（左右各留 16px 内边距），右移 ~18px 让飞出菜单越过侧栏右边框。
      setPos({ left: r.right + 18, top, width, maxHeight: Math.max(180, window.innerHeight - top - margin) })
    } else {
      setPos({
        left: r.left,
        top: r.bottom + 8,
        width: r.width,
        maxHeight: Math.max(180, window.innerHeight - r.bottom - margin - 8),
      })
    }
  }, [collapsed])

  useEffect(() => {
    if (!open) return
    compute()
    const onMove = () => compute()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open, compute])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", h)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const selected = value ? keys.find((k) => k.key === value) : null
  const triggerLabel = value ? keyTitle(selected, value) : "All keys"

  const select = (v: string | null) => {
    onChange(v)
    setOpen(false)
  }

  const toggle = () => (open ? setOpen(false) : (compute(), setOpen(true)))

  const iconBadge = (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "var(--accent-soft)",
        color: "var(--accent-text)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {value ? <Icons.key size={15} /> : <Icons.grid size={15} />}
    </span>
  )

  return (
    <>
      {collapsed ? (
        <button
          ref={triggerRef}
          onClick={toggle}
          title={`Viewing: ${triggerLabel}`}
          style={{
            display: "grid",
            placeItems: "center",
            width: "100%",
            height: 44,
            background: open ? "var(--surface-hover)" : "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            color: "var(--ink)",
            transition: "background .18s, border-color .18s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = open ? "var(--surface-hover)" : "var(--surface-2)")}
        >
          {iconBadge}
        </button>
      ) : (
        <button
          ref={triggerRef}
          onClick={toggle}
          title="Switch which key's usage you're viewing"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 10px",
            background: open ? "var(--surface-hover)" : "var(--surface-2)",
            border: `1px solid ${open ? "var(--line-strong)" : "var(--line)"}`,
            borderRadius: "var(--r-md)",
            color: "var(--ink)",
            transition: "background .18s, border-color .18s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = open ? "var(--line-strong)" : "var(--line)")}
        >
          {iconBadge}
          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <span
              style={{
                display: "block",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--ink-faint)",
                lineHeight: 1,
                marginBottom: 3,
              }}
            >
              VIEWING
            </span>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {triggerLabel}
            </span>
          </span>
          <Icons.chevronsUpDown size={15} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
        </button>
      )}

      {open &&
        pos &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              width: pos.width,
              zIndex: 1000,
              background: "var(--elevated)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-lg)",
              padding: 6,
              maxHeight: pos.maxHeight,
              overflowY: "auto",
              animation: "scaleIn .16s var(--ease)",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--ink-faint)",
                padding: "8px 10px 6px",
              }}
            >
              VIEW USAGE
            </div>

            <Row
              active={value === null}
              icon={<Icons.grid size={15} />}
              title="All keys"
              subtitle="Aggregate across every key"
              onClick={() => select(null)}
            />

            {keys.length > 0 && <div style={{ height: 1, background: "var(--line)", margin: "6px 4px" }} />}

            {isLoading && keys.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-3)" }}>Loading keys…</div>
            ) : (
              keys.map((k) => (
                <Row
                  key={k.key}
                  active={value === k.key}
                  icon={<Icons.key size={14} />}
                  title={keyTitle(k, k.key)}
                  badge={k.name ? k.role : undefined}
                  subtitle={`${fmt.num(k.requests)} reqs · ${fmt.compact(k.totalTokens)} tok`}
                  onClick={() => select(k.key)}
                />
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

// 标签：有 name 显示 name，否则用角色名（不再拼接 “key”）；都没有时回退到截断后的密钥。
function keyTitle(usage: KeyUsage | null | undefined, key: string): string {
  if (usage?.name) return usage.name
  if (usage?.role && usage.role !== "unknown") return usage.role
  return fmt.keyShort(key)
}

function Row({
  active,
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "9px 10px",
        border: "none",
        borderRadius: "var(--r-sm)",
        background: active ? "var(--surface-hover)" : "transparent",
        color: "var(--ink)",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "var(--surface-hover)" : "transparent")}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: active ? "var(--accent-soft)" : "var(--surface-2)",
          color: active ? "var(--accent-text)" : "var(--ink-3)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
          {badge && (
            <Badge tone={badge === "admin" ? "accent" : "neutral"} size="sm">
              {badge}
            </Badge>
          )}
        </div>
        <div className="tnum" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      {active && <Icons.check size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />}
    </button>
  )
}
