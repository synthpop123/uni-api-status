"use client"

import { useEffect, useState } from "react"
import { Badge, Button, Segmented, Select } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import type { ToastPush } from "@/components/dashboard/toast"
import { fmt } from "@/lib/format"
import { api } from "@/lib/api-client"
import { loadSavedKeys, removeSavedKey, upsertSavedKey, type SavedKey } from "@/lib/saved-keys"
import type { ApiKeyEntry } from "@/lib/types"

type KeyState = "idle" | "validating" | "ok" | "err"

export function KeyModal({
  open,
  onClose,
  current,
  role,
  viewingKey,
  onApply,
  onClear,
  toast,
}: {
  open: boolean
  onClose: () => void
  current: string
  role: string
  viewingKey: string
  onApply: (key: string, role: string, viewingKey: string) => void
  onClear: () => void
  toast: ToastPush
}) {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([])
  const [tab, setTab] = useState<"saved" | "new">("saved")
  const [selected, setSelected] = useState(current || "")
  const [input, setInput] = useState("")
  const [state, setState] = useState<KeyState>(current ? "ok" : "idle")
  const [confirmedRole, setConfirmedRole] = useState<string | null>(role || null)
  const [viewing, setViewing] = useState(viewingKey || current)
  const [availableKeys, setAvailableKeys] = useState<ApiKeyEntry[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)

  useEffect(() => {
    if (open) {
      const keys = loadSavedKeys()
      setSavedKeys(keys)
      setSelected(current || keys[0]?.key || "")
      setInput("")
      setState(current ? "ok" : "idle")
      setConfirmedRole(role || null)
      setViewing(viewingKey || current)
      setTab("saved")
    }
  }, [open, current, role, viewingKey])

  const activeKey = tab === "saved" ? selected : input.trim()

  // Close on Escape, matching the backdrop-click affordance.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Load the admin-visible key list once a validated admin key is active.
  useEffect(() => {
    let cancelled = false
    if (open && state === "ok" && confirmedRole === "admin" && activeKey) {
      setLoadingAvailable(true)
      api
        .availableKeys(activeKey)
        .then((res) => {
          if (!cancelled) setAvailableKeys(res.keys || [])
        })
        .catch(() => {
          if (!cancelled) setAvailableKeys([])
        })
        .finally(() => {
          if (!cancelled) setLoadingAvailable(false)
        })
    } else {
      setAvailableKeys([])
    }
    return () => {
      cancelled = true
    }
  }, [open, state, confirmedRole, activeKey])

  if (!open) return null

  const validate = () => {
    setState("validating")
    api
      .validateKey(activeKey)
      .then((res) => {
        if (res.valid) {
          const r = res.role || "user"
          setState("ok")
          setConfirmedRole(r)
          setViewing(activeKey)
          setSavedKeys(upsertSavedKey(activeKey, r))
        } else {
          setState("err")
          setConfirmedRole(null)
        }
      })
      .catch(() => {
        setState("err")
        setConfirmedRole(null)
      })
  }

  const apply = () => {
    onApply(activeKey, confirmedRole || "user", confirmedRole === "admin" ? viewing : activeKey)
    onClose()
    toast("API key applied", "success")
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
      <div
        style={{
          position: "relative",
          width: "min(480px, 100%)",
          background: "var(--elevated)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 26,
          animation: "scaleIn .2s var(--ease)",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "var(--accent-soft)",
              color: "var(--accent-text)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.key size={19} />
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>API Key Settings</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>
              Switch keys or pick which key&apos;s stats to view.
            </p>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--ink-3)" }}>
            <Icons.x size={20} />
          </button>
        </div>

        <div style={{ margin: "20px 0 16px" }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as "saved" | "new")}
            options={[
              { value: "saved", label: "Saved keys" },
              { value: "new", label: "Add new" },
            ]}
          />
        </div>

        {tab === "saved" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedKeys.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "8px 2px" }}>
                No saved keys yet — add one from the “Add new” tab.
              </div>
            )}
            {savedKeys.map((k) => (
            <div
              key={k.key}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelected(k.key)
                setState("ok")
                setConfirmedRole(k.role)
                setViewing(k.key)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelected(k.key)
                  setState("ok")
                  setConfirmedRole(k.role)
                  setViewing(k.key)
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                textAlign: "left",
                cursor: "pointer",
                background: selected === k.key ? "var(--surface-hover)" : "var(--surface-2)",
                border: `1px solid ${selected === k.key ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "var(--r-md)",
                transition: "all .18s",
              }}
            >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: selected === k.key ? "var(--accent)" : "var(--line-strong)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{k.name || (k.role === "admin" ? "Admin key" : "User key")}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {fmt.keyShort(k.key)}
                  </div>
                </div>
                <Badge tone={k.role === "admin" ? "accent" : "neutral"} size="sm">
                  {k.role}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSavedKeys(removeSavedKey(k.key))
                    if (selected === k.key) {
                      setSelected("")
                      setState("idle")
                      setConfirmedRole(null)
                    }
                    toast("Key removed from local cache")
                  }}
                  style={{ background: "none", border: "none", color: "var(--ink-faint)", padding: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--down)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
                >
                  <Icons.trash size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setState("idle")
                setConfirmedRole(null)
              }}
              placeholder="sk-…"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 90px 12px 14px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                background: "var(--surface-2)",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-sm)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <div style={{ position: "absolute", right: 8, top: 7 }}>
              <Button size="sm" variant="outline" onClick={validate} disabled={!input.trim() || state === "validating"}>
                {state === "validating" ? "…" : "Validate"}
              </Button>
            </div>
            {state === "ok" && (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--up)", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                <Icons.checkCircle size={15} />
                Valid · {confirmedRole}
              </p>
            )}
            {state === "err" && <p style={{ marginTop: 12, fontSize: 13, color: "var(--down)", fontWeight: 600 }}>Invalid API key.</p>}
          </div>
        )}

        {confirmedRole === "admin" && state === "ok" && (
          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 8 }}>
              Viewing stats for
            </label>
            <Select
              value={viewing}
              onChange={setViewing}
              placeholder={loadingAvailable ? "Loading keys…" : "Select a key"}
              options={availableKeys.map((k) => ({
                value: k.api,
                label: `${k.name || k.role || "user"} · ${fmt.keyShort(k.api)}`,
              }))}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <Button variant="accent" full disabled={state !== "ok"} onClick={apply} icon={Icons.check}>
            Apply
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onClear()
              onClose()
            }}
            icon={Icons.logout}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
