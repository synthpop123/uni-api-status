"use client"

import { useState } from "react"
import { Button, Card, Logo } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import { api } from "@/lib/api-client"

type GateState = "idle" | "validating" | "denied" | "err"

// Admin-only 登录：仪表盘读取整个网关的配置与全部 Key 的用量，因此只接受 admin key。
// 校验成功且角色为 admin 才放行；普通 user key 会被明确拒绝。
export function Gate({
  onConnect,
  theme,
  toggleTheme,
}: {
  onConnect: (adminKey: string) => void
  theme: string
  toggleTheme: () => void
}) {
  const [input, setInput] = useState("")
  const [state, setState] = useState<GateState>("idle")

  const key = input.trim()

  const submit = async () => {
    if (!key || state === "validating") return
    setState("validating")
    try {
      const res = await api.validateKey(key)
      if (res.valid && res.role === "admin") {
        onConnect(key)
      } else if (res.valid) {
        setState("denied") // 有效但非 admin
      } else {
        setState("err")
      }
    } catch {
      setState("err")
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr", position: "relative", overflow: "hidden" }}>
      {/* ambient accent glow */}
      <div
        style={{
          position: "absolute",
          top: "-26%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 820,
          height: 820,
          background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 16%, transparent), transparent 60%)",
          pointerEvents: "none",
          opacity: 0.9,
        }}
      />
      <button
        onClick={toggleTheme}
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 42,
          height: 42,
          borderRadius: 99,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink)",
          display: "grid",
          placeItems: "center",
          zIndex: 5,
        }}
      >
        {theme === "dark" ? <Icons.sun size={18} /> : <Icons.moon size={18} />}
      </button>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          zIndex: 2,
        }}
      >
        <div style={{ width: "min(440px, 100%)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <Logo size={56} />
          </div>
          <h1
            style={{
              textAlign: "center",
              fontSize: "clamp(32px, 5vw, 46px)",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              margin: "0 0 12px",
            }}
          >
            Your gateway,
            <br />
            <span style={{ color: "var(--accent)" }}>in real time.</span>
          </h1>
          <p style={{ textAlign: "center", fontSize: 15.5, color: "var(--ink-3)", margin: "0 0 34px", lineHeight: 1.5 }}>
            Sign in with your admin key to monitor usage, channel health, and live request logs across every key and model.
          </p>

          <Card pad={24} style={{ boxShadow: "var(--shadow-lg)" }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 8 }}>
              Admin API key
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  if (state !== "idle") setState("idle")
                }}
                placeholder="sk-…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                }}
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 14px",
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  background: "var(--surface-2)",
                  border: `1px solid ${state === "err" || state === "denied" ? "var(--down)" : "var(--line-strong)"}`,
                  borderRadius: "var(--r-sm)",
                  color: "var(--ink)",
                  outline: "none",
                  transition: "border-color .2s",
                }}
              />
              {state === "validating" && (
                <Icons.clock size={17} className="spin" style={{ position: "absolute", right: 14, top: 13, color: "var(--ink-3)" }} />
              )}
              {(state === "err" || state === "denied") && (
                <Icons.xCircle size={17} style={{ position: "absolute", right: 14, top: 13, color: "var(--down)" }} />
              )}
            </div>

            {state === "denied" && (
              <p style={{ marginTop: 14, fontSize: 13, color: "var(--down)", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                <Icons.lock size={15} />
                This key is valid but isn&apos;t an admin key.
              </p>
            )}
            {state === "err" && (
              <p style={{ marginTop: 14, fontSize: 13, color: "var(--down)", fontWeight: 600 }}>Invalid or expired API key.</p>
            )}

            <div style={{ marginTop: 20 }}>
              <Button
                variant="accent"
                full
                size="lg"
                icon={state === "validating" ? Icons.clock : Icons.arrow}
                disabled={!key || state === "validating"}
                onClick={submit}
              >
                {state === "validating" ? "Verifying…" : "Enter dashboard"}
              </Button>
            </div>
          </Card>
          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 18 }}>
            Your key is stored locally in this browser and never leaves the device.
          </p>
        </div>
      </div>
    </div>
  )
}
