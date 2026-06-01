"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Icons, type IconComponent } from "@/components/dashboard/icons"

type Tone = "neutral" | "accent" | "up" | "down" | "warn"
type Size = "sm" | "md" | "lg"

// ---- Badge ----
export function Badge({
  children,
  tone = "neutral",
  size = "md",
  style,
}: {
  children: React.ReactNode
  tone?: Tone
  size?: "sm" | "md"
  style?: React.CSSProperties
}) {
  const tones: Record<Tone, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: "var(--surface-hover)", fg: "var(--ink-2)", bd: "var(--line)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent-text)", bd: "transparent" },
    up: { bg: "color-mix(in oklab, var(--up) 14%, transparent)", fg: "var(--up)", bd: "transparent" },
    down: { bg: "color-mix(in oklab, var(--down) 14%, transparent)", fg: "var(--down)", bd: "transparent" },
    warn: { bg: "color-mix(in oklab, var(--warn) 16%, transparent)", fg: "var(--warn)", bd: "transparent" },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span
      className="tnum"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: 600,
        borderRadius: 99,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ---- Card ----
export function Card({
  children,
  style,
  pad = 22,
  hover,
  className,
  onClick,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  pad?: number
  hover?: boolean
  className?: string
  onClick?: () => void
}) {
  const [h, setH] = useState(false)
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--surface)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: hover && h ? "var(--line-strong)" : "var(--line)",
        borderRadius: "var(--r-lg)",
        padding: pad,
        transition: "border-color .25s var(--ease), transform .25s var(--ease), box-shadow .25s var(--ease)",
        ...(hover && h ? { transform: "translateY(-2px)", boxShadow: "var(--shadow-md)" } : {}),
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---- Button ----
export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  style,
  icon: IconC,
  full,
}: {
  children?: React.ReactNode
  variant?: "primary" | "accent" | "ghost" | "outline" | "danger"
  size?: Size
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
  icon?: IconComponent
  full?: boolean
}) {
  const [h, setH] = useState(false)
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 600,
    borderRadius: 99,
    border: "1px solid transparent",
    transition: "all .2s var(--ease)",
    whiteSpace: "nowrap",
    padding: size === "sm" ? "7px 14px" : size === "lg" ? "14px 26px" : "10px 18px",
    fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? "none" : "auto",
    width: full ? "100%" : "auto",
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--primary)",
      color: "var(--primary-ink)",
      transform: h ? "translateY(-1px)" : "none",
      boxShadow: h ? "var(--shadow-md)" : "none",
    },
    accent: {
      background: "var(--accent)",
      color: "var(--accent-ink)",
      transform: h ? "translateY(-1px)" : "none",
      boxShadow: h ? "0 8px 22px color-mix(in oklab, var(--accent) 36%, transparent)" : "none",
    },
    ghost: { background: h ? "var(--surface-hover)" : "transparent", color: "var(--ink)" },
    outline: { background: h ? "var(--surface-hover)" : "transparent", color: "var(--ink)", borderColor: "var(--line-strong)" },
    danger: {
      background: h ? "color-mix(in oklab, var(--down) 14%, transparent)" : "transparent",
      color: "var(--down)",
      borderColor: "color-mix(in oklab, var(--down) 40%, transparent)",
    },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {IconC ? <IconC size={size === "sm" ? 15 : 17} /> : null}
      {children}
    </button>
  )
}

// ---- Segmented control ----
type Opt = string | { value: string; label: string }

export function Segmented({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Opt[]
  value: string
  onChange: (v: string) => void
  size?: "sm" | "md"
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 2,
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 99,
      }}
    >
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value
        const label = typeof o === "string" ? o : o.label
        const active = v === value
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="tnum"
            style={{
              padding: size === "sm" ? "5px 12px" : "7px 16px",
              fontSize: size === "sm" ? 12 : 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 99,
              transition: "all .2s var(--ease)",
              whiteSpace: "nowrap",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "var(--primary-ink)" : "var(--ink-3)",
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ---- Native-ish Select ----
export interface SelectOption {
  value: string
  label: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  width,
  disabled,
  size = "md",
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  width?: number | string
  disabled?: boolean
  size?: "sm" | "md"
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null)

  useEffect(() => setMounted(true), [])

  // Position the portalled menu relative to the trigger, flipping up / clamping
  // height so it never gets clipped by overflow ancestors or the viewport edge.
  const compute = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    const desired = 280
    const spaceBelow = window.innerHeight - r.bottom - margin
    const spaceAbove = r.top - margin
    const up = spaceBelow < Math.min(desired, 200) && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, Math.min(desired, up ? spaceAbove : spaceBelow))
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, maxHeight, up })
  }, [])

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
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const sel = options.find((o) => o.value === value)

  const toggle = () => {
    if (open) {
      setOpen(false)
    } else {
      compute()
      setOpen(true)
    }
  }

  return (
    <div style={{ position: "relative", width: width || "auto" }}>
      <button
        ref={triggerRef}
        disabled={disabled}
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          padding: size === "sm" ? "7px 12px" : "9px 14px",
          fontSize: size === "sm" ? 13 : 14,
          fontWeight: 500,
          background: "var(--surface)",
          color: sel ? "var(--ink)" : "var(--ink-3)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--r-sm)",
          transition: "border-color .2s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sel ? sel.label : placeholder}
        </span>
        <Icons.chevronDown
          size={15}
          style={{
            color: "var(--ink-3)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        />
      </button>
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
              transform: pos.up ? "translateY(-100%)" : "none",
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
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  fontSize: 13.5,
                  fontWeight: 500,
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  color: "var(--ink)",
                  background: o.value === value ? "var(--surface-hover)" : "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = o.value === value ? "var(--surface-hover)" : "transparent")
                }
              >
                {o.value === value && <Icons.check size={14} style={{ color: "var(--accent)" }} />}
                <span style={{ marginLeft: o.value === value ? 0 : 22, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

// ---- Section header ----
export function SectionHead({
  title,
  sub,
  right,
}: {
  title: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--ink-3)" }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// ---- Logo mark ----
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 9,
          background: "var(--accent)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          boxShadow: "0 4px 14px color-mix(in oklab, var(--accent) 40%, transparent)",
        }}
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 13h4l3 7 4-15 3 9h4" />
        </svg>
      </div>
    </div>
  )
}
