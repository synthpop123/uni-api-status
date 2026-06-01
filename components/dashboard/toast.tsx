"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Icons } from "@/components/dashboard/icons"

export type ToastTone = "neutral" | "success" | "error"
export type ToastPush = (msg: string, tone?: ToastTone) => void

interface ToastItem {
  id: string
  msg: string
  tone: ToastTone
}

/**
 * Mirrors the handoff's useToasts: returns the push function and the toast
 * stack node, which the shell renders once and passes `push` down to screens.
 */
export function useToasts(): [ToastPush, React.ReactNode] {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback<ToastPush>((msg, tone = "neutral") => {
    const id = Math.random().toString(36).slice(2)
    setItems((x) => [...x, { id, msg, tone }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200)
  }, [])

  const node = (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 18px",
            background: "var(--elevated)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-lg)",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--ink)",
            animation: "scaleIn .22s var(--ease)",
            minWidth: 220,
          }}
        >
          <span
            style={{
              color: t.tone === "success" ? "var(--up)" : t.tone === "error" ? "var(--down)" : "var(--accent)",
            }}
          >
            {t.tone === "error" ? <Icons.xCircle size={17} /> : <Icons.checkCircle size={17} />}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  )

  return [push, node]
}
