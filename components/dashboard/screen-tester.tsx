"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Button, Card, SectionHead, Select } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import type { ToastPush } from "@/components/dashboard/toast"
import { fmt } from "@/lib/format"
import { api } from "@/lib/api-client"
import type { ProviderInfo } from "@/lib/types"

type Status = "idle" | "testing" | "success" | "error"

interface Result {
  status: Status
  ms?: number // seconds
  message?: string
}

const th = (align: "left" | "right" | "center"): React.CSSProperties => ({
  padding: "14px 18px",
  textAlign: align,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
})
const td: React.CSSProperties = { padding: "13px 18px", fontSize: 13.5, color: "var(--ink)" }

function StatusCell({ st }: { st?: Result }) {
  if (!st || st.status === "idle") return <Badge size="sm">Idle</Badge>
  if (st.status === "testing")
    return (
      <Badge tone="warn" size="sm">
        <Icons.clock size={12} className="spin" />
        Testing
      </Badge>
    )
  if (st.status === "success")
    return (
      <Badge tone="up" size="sm">
        <Icons.check size={12} />
        Pass
      </Badge>
    )
  return (
    <Badge tone="down" size="sm">
      <Icons.x size={12} />
      Fail
    </Badge>
  )
}

export function Tester({ apiKey, toast }: { apiKey: string; toast: ToastPush }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [selModel, setSelModel] = useState<Record<string, string>>({})
  const [testingAll, setTestingAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    api
      .providers(apiKey)
      .then((data) => {
        if (cancelled) return
        const list = data.providers || []
        setProviders(list)
        const sel: Record<string, string> = {}
        list.forEach((p) => {
          if (p.models[0]) sel[p.provider] = p.models[0].display
        })
        setSelModel(sel)
        setResults({})
      })
      .catch((e) => {
        if (!cancelled) {
          setProviders([])
          setLoadError((e as Error).message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  const runTest = useCallback(
    async (p: ProviderInfo, modelDisplay: string) => {
      const key = `${p.provider}-${modelDisplay}`
      const modelConfig = p.models.find((m) => m.display === modelDisplay)
      if (!modelConfig) {
        setResults((r) => ({ ...r, [key]: { status: "error", message: `Model "${modelDisplay}" not found for ${p.provider}.` } }))
        return
      }
      setResults((r) => ({ ...r, [key]: { status: "testing" } }))
      try {
        const res = await api.testProvider({
          apiKey,
          provider: p.provider,
          model: modelConfig.original,
        })
        setResults((r) => ({
          ...r,
          [key]: {
            status: res.success ? "success" : "error",
            ms: res.responseTime,
            message: res.message || (res.success ? "200 OK · stream established" : "Test failed"),
          },
        }))
      } catch (e) {
        setResults((r) => ({ ...r, [key]: { status: "error", message: (e as Error).message || "Request failed" } }))
      }
    },
    [apiKey],
  )

  const testAll = async () => {
    setTestingAll(true)
    const supported = providers.filter((p) => p.supported && p.models.length)
    await Promise.allSettled(supported.map((p) => runTest(p, selModel[p.provider])))
    setTestingAll(false)
    toast("All supported channels tested", "success")
  }

  return (
    <div>
      <SectionHead
        title="Channel Tester"
        sub="Fire a live probe at each upstream provider and measure first-token latency."
        right={
          <Button
            variant="accent"
            icon={testingAll ? Icons.clock : Icons.playCircle}
            onClick={testAll}
            disabled={testingAll || loading || providers.length === 0}
          >
            {testingAll ? "Testing…" : "Test all"}
          </Button>
        }
      />

      {loading ? (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 30, borderRadius: 8 }} />
            ))}
          </div>
        </Card>
      ) : loadError ? (
        <Card style={{ textAlign: "center", color: "var(--down)", padding: 50 }}>{loadError}</Card>
      ) : providers.length === 0 ? (
        <Card style={{ textAlign: "center", color: "var(--ink-3)", padding: 50 }}>
          No channels configured yet — add some in Configuration.
        </Card>
      ) : (
        <>
          {/* desktop */}
          <div className="table-desktop">
            <Card pad={0} style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      <th style={th("left")}>Channel</th>
                      <th style={th("left")}>Endpoint</th>
                      <th style={th("left")}>Test model</th>
                      <th style={th("center")}>Supported</th>
                      <th style={th("left")}>Status</th>
                      <th style={th("left")}>Message</th>
                      <th style={th("right")}>Latency</th>
                      <th style={{ ...th("center"), width: 64 }}>Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p) => {
                      const md = selModel[p.provider]
                      const key = `${p.provider}-${md}`
                      const st = results[key]
                      const busy = st?.status === "testing" || testingAll
                      return (
                        <tr key={p.provider} className="trow" style={{ borderBottom: "1px solid var(--line)", opacity: p.supported ? 1 : 0.5 }}>
                          <td style={{ ...td, fontWeight: 700 }} className="mono">{p.provider}</td>
                          <td className="mono" style={{ ...td, fontSize: 11.5, color: "var(--ink-3)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.base_url}
                          </td>
                          <td style={{ ...td, width: 180 }}>
                            {p.models.length ? (
                              <Select
                                size="sm"
                                width={170}
                                value={md}
                                disabled={!p.supported || busy}
                                onChange={(v) => {
                                  setSelModel((s) => ({ ...s, [p.provider]: v }))
                                  setResults((r) => ({ ...r, [`${p.provider}-${v}`]: { status: "idle" } }))
                                }}
                                options={p.models.map((m) => ({ value: m.display, label: m.display }))}
                              />
                            ) : (
                              <span style={{ color: "var(--ink-faint)" }}>—</span>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            {p.supported ? (
                              <Icons.checkCircle size={16} style={{ color: "var(--up)" }} />
                            ) : (
                              <Icons.alert size={16} style={{ color: "var(--ink-faint)" }} />
                            )}
                          </td>
                          <td style={td}>
                            <StatusCell st={st} />
                          </td>
                          <td
                            style={{
                              ...td,
                              fontSize: 12,
                              color: st?.status === "error" ? "var(--down)" : "var(--ink-3)",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            className="mono"
                            title={st?.message || undefined}
                          >
                            {st?.message || "—"}
                          </td>
                          <td className="tnum" style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                            {st?.ms != null ? fmt.time(st.ms) : "—"}
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            <button
                              disabled={!p.supported || busy || !md}
                              onClick={() => runTest(p, md)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                border: "1px solid var(--line-strong)",
                                background: "var(--surface)",
                                color: "var(--ink)",
                                display: "inline-grid",
                                placeItems: "center",
                                opacity: !p.supported || busy || !md ? 0.4 : 1,
                              }}
                            >
                              {st?.status === "testing" ? <Icons.clock size={15} className="spin" /> : <Icons.play size={14} />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* mobile */}
          <div className="table-mobile" style={{ display: "none", flexDirection: "column", gap: 12 }}>
            {providers.map((p) => {
              const md = selModel[p.provider]
              const key = `${p.provider}-${md}`
              const st = results[key]
              const busy = st?.status === "testing" || testingAll
              return (
                <Card key={p.provider} pad={18} style={{ opacity: p.supported ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.provider}
                    </span>
                    <StatusCell st={st} />
                  </div>
                  {p.models.length > 0 && (
                    <Select
                      size="sm"
                      value={md}
                      disabled={!p.supported || busy}
                      onChange={(v) => {
                        setSelModel((s) => ({ ...s, [p.provider]: v }))
                        setResults((r) => ({ ...r, [`${p.provider}-${v}`]: { status: "idle" } }))
                      }}
                      options={p.models.map((m) => ({ value: m.display, label: m.display }))}
                    />
                  )}
                  {st?.message && st.status === "error" && (
                    <p style={{ fontSize: 12, color: "var(--down)", margin: "10px 0 0" }} className="mono">
                      {st.message}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      full
                      disabled={!p.supported || busy || !md}
                      icon={st?.status === "testing" ? Icons.clock : Icons.play}
                      onClick={() => runTest(p, md)}
                    >
                      {st?.status === "testing" ? "Testing…" : "Test"}
                    </Button>
                    {st?.ms != null && (
                      <span className="tnum" style={{ fontWeight: 700, fontSize: 13 }}>
                        {fmt.time(st.ms)}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
