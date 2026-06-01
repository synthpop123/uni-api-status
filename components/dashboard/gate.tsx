"use client"

import { useEffect, useState } from "react"
import { Badge, Button, Card, Logo, Segmented, Select } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import { fmt } from "@/lib/format"
import { api } from "@/lib/api-client"
import { loadSavedKeys, upsertSavedKey, type SavedKey } from "@/lib/saved-keys"

type GateState = "idle" | "validating" | "ok" | "err"

export function Gate({
  onConnect,
  theme,
  toggleTheme,
}: {
  onConnect: (key: string, role: string, viewingKey: string) => void
  theme: string
  toggleTheme: () => void
}) {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([])
  const [tab, setTab] = useState<"saved" | "new">("new")
  const [selected, setSelected] = useState("")
  const [input, setInput] = useState("")
  const [state, setState] = useState<GateState>("idle")
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const keys = loadSavedKeys()
    setSavedKeys(keys)
    if (keys.length) {
      setTab("saved")
      setSelected(keys[0].key)
    }
  }, [])

  const activeKey = tab === "saved" ? selected : input.trim()

  useEffect(() => {
    setState("idle")
    setRole(null)
  }, [tab, selected, input])

  const validate = async () => {
    if (!activeKey) return
    setState("validating")
    try {
      const res = await api.validateKey(activeKey)
      if (res.valid) {
        const r = res.role || "user"
        setState("ok")
        setRole(r)
        setSavedKeys(upsertSavedKey(activeKey, r))
      } else {
        setState("err")
      }
    } catch {
      setState("err")
    }
  }

  const enter = () => {
    onConnect(activeKey, role || "user", activeKey)
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
            Connect an API key to unlock usage analytics, channel health, and live request logs across every model.
          </p>

          <Card pad={24} style={{ boxShadow: "var(--shadow-lg)" }}>
            <div style={{ marginBottom: 18 }}>
              <Segmented
                value={tab}
                onChange={(v) => setTab(v as "saved" | "new")}
                options={[
                  { value: "saved", label: "Saved keys" },
                  { value: "new", label: "New key" },
                ]}
              />
            </div>

            {tab === "saved" ? (
              <Select
                value={selected}
                onChange={setSelected}
                placeholder={savedKeys.length ? "Select a key" : "No saved keys yet"}
                options={savedKeys.map((k) => ({
                  value: k.key,
                  label: `${k.name || k.role} · ${fmt.keyShort(k.key)}`,
                }))}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="sk-…"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (state === "ok" ? enter() : validate())
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    fontSize: 14,
                    fontFamily: "var(--font-mono)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
                {state === "validating" && (
                  <Icons.clock size={17} className="spin" style={{ position: "absolute", right: 14, top: 13, color: "var(--ink-3)" }} />
                )}
                {state === "ok" && (
                  <Icons.checkCircle size={17} style={{ position: "absolute", right: 14, top: 13, color: "var(--up)" }} />
                )}
                {state === "err" && (
                  <Icons.xCircle size={17} style={{ position: "absolute", right: 14, top: 13, color: "var(--down)" }} />
                )}
              </div>
            )}

            {state === "ok" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: "var(--up)", fontWeight: 600 }}>
                <Icons.checkCircle size={15} /> Valid key · role:{" "}
                <Badge tone={role === "admin" ? "accent" : "neutral"} size="sm">
                  {role}
                </Badge>
              </div>
            )}
            {state === "err" && (
              <p style={{ marginTop: 14, fontSize: 13, color: "var(--down)", fontWeight: 600 }}>Invalid or expired API key.</p>
            )}

            <div style={{ marginTop: 20 }}>
              {state === "ok" ? (
                <Button variant="accent" full size="lg" icon={Icons.arrow} onClick={enter}>
                  Enter dashboard
                </Button>
              ) : (
                <Button
                  variant="primary"
                  full
                  size="lg"
                  icon={state === "validating" ? Icons.clock : Icons.lock}
                  disabled={!activeKey || state === "validating"}
                  onClick={validate}
                >
                  {state === "validating" ? "Validating…" : "Validate key"}
                </Button>
              )}
            </div>
          </Card>
          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 18 }}>
            Keys are stored locally in your browser and never leave this device.
          </p>
        </div>
      </div>
    </div>
  )
}
