"use client"

import { useMemo, useState } from "react"
import { Badge, Card, SectionHead } from "@/components/dashboard/primitives"
import { ShareBar, Sparkline } from "@/components/dashboard/charts"
import { Icons } from "@/components/dashboard/icons"
import { fmt } from "@/lib/format"
import { useChannelStats, useModelStats } from "@/hooks/use-stats"
import type { DimensionStat } from "@/lib/types"

interface Row extends DimensionStat {
  name: string
}

type SortKey =
  | "requests"
  | "successRate"
  | "totalTokens"
  | "promptTokens"
  | "completionTokens"
  | "avgProcessTime"
  | "avgFirstResponseTime"

interface Col {
  key: SortKey
  label: string
  fmt: (r: Row) => string
  color?: (r: Row) => string
}

const COLS: Col[] = [
  { key: "requests", label: "Requests", fmt: (r) => fmt.num(r.requests) },
  {
    key: "successRate",
    label: "Success",
    fmt: (r) => fmt.pct(r.successRate, 1),
    color: (r) => (r.successRate > 0.97 ? "var(--up)" : r.successRate > 0.9 ? "var(--warn)" : "var(--down)"),
  },
  { key: "totalTokens", label: "Total Tokens", fmt: (r) => fmt.compact(r.totalTokens) },
  { key: "promptTokens", label: "Prompt", fmt: (r) => fmt.compact(r.promptTokens) },
  { key: "completionTokens", label: "Completion", fmt: (r) => fmt.compact(r.completionTokens) },
  { key: "avgProcessTime", label: "Process", fmt: (r) => fmt.time(r.avgProcessTime) },
  { key: "avgFirstResponseTime", label: "First Token", fmt: (r) => fmt.time(r.avgFirstResponseTime) },
]

const thStyle = (align: "left" | "right" | "center"): React.CSSProperties => ({
  padding: "14px 18px",
  textAlign: align,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
})
const tdStyle: React.CSSProperties = { padding: "13px 18px", fontSize: 13.5, color: "var(--ink)" }

function dotColor(rate: number): string {
  return rate > 0.97 ? "var(--up)" : rate > 0.9 ? "var(--warn)" : "var(--down)"
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
      <Icons.search size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 14px 9px 38px",
          fontSize: 13.5,
          background: "var(--surface)",
          border: "1px solid var(--line-strong)",
          borderRadius: 99,
          color: "var(--ink)",
          outline: "none",
        }}
      />
    </div>
  )
}

function KV({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 3 }}>{k}</div>
      <div className="tnum" style={{ fontSize: big ? 18 : 14, fontWeight: 700 }}>
        {v}
      </div>
    </div>
  )
}

function DimensionTable({
  title,
  sub,
  nameHeader,
  rows,
  icon,
  loading,
  error,
}: {
  title: string
  sub: string
  nameHeader: string
  rows: Row[]
  icon: string
  loading: boolean
  error?: string | null
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "requests", dir: "desc" })
  const [q, setQ] = useState("")
  const IconC = Icons[icon]

  const filtered = useMemo(() => {
    const r = rows.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()))
    return [...r].sort((a, b) => ((a[sort.key] as number) - (b[sort.key] as number)) * (sort.dir === "asc" ? 1 : -1))
  }, [rows, q, sort])

  const maxReq = Math.max(1, ...rows.map((r) => r.requests))
  const setSortKey = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }))

  return (
    <div>
      <SectionHead
        title={title}
        sub={sub}
        right={<SearchBox value={q} onChange={setQ} placeholder={`Search ${nameHeader.toLowerCase()}…`} />}
      />

      {error ? (
        <Card style={{ textAlign: "center", color: "var(--down)", padding: 40 }}>{error}</Card>
      ) : loading ? (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 28, borderRadius: 8 }} />
            ))}
          </div>
        </Card>
      ) : (
        <>
          {/* desktop table */}
          <Card pad={0} style={{ overflow: "hidden" }} className="table-desktop">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={thStyle("left")}>{nameHeader}</th>
                    <th style={thStyle("left")}>Volume</th>
                    {COLS.map((c) => (
                      <th key={c.key} style={{ ...thStyle("right"), cursor: "pointer" }} onClick={() => setSortKey(c.key)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: sort.key === c.key ? "var(--ink)" : "inherit" }}>
                          {c.label}
                          <span style={{ opacity: sort.key === c.key ? 1 : 0, transition: ".2s" }}>
                            <Icons.chevronDown size={12} style={{ transform: sort.dir === "asc" ? "rotate(180deg)" : "none" }} />
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const spark = r.spark
                    const sparkUp = spark && spark.length > 1 ? spark[spark.length - 1] >= spark[0] : true
                    return (
                      <tr key={r.name} className="trow" style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 99, background: dotColor(r.successRate), flexShrink: 0 }} />
                            <span className="mono" style={{ fontSize: 13 }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, width: 130 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {spark && spark.length > 1 ? (
                              <Sparkline data={spark} width={56} height={22} up={sparkUp} />
                            ) : (
                              <span style={{ width: 56 }} />
                            )}
                            <ShareBar value={r.requests} max={maxReq} />
                          </div>
                        </td>
                        {COLS.map((c) => (
                          <td
                            key={c.key}
                            className="tnum"
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              color: c.color ? c.color(r) : "var(--ink)",
                              fontWeight: c.key === "requests" ? 700 : 500,
                            }}
                          >
                            {c.fmt(r)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* mobile cards */}
          <div className="table-mobile" style={{ display: "none", flexDirection: "column", gap: 12 }}>
            {filtered.map((r) => (
              <Card key={r.name} pad={18}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
                  <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <Badge tone={r.successRate > 0.97 ? "up" : "warn"}>{fmt.pct(r.successRate, 1)}</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px" }}>
                  <KV k="Requests" v={fmt.num(r.requests)} big />
                  <KV k="Total Tokens" v={fmt.compact(r.totalTokens)} big />
                  <KV k="Process" v={fmt.time(r.avgProcessTime)} />
                  <KV k="First token" v={fmt.time(r.avgFirstResponseTime)} />
                </div>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card style={{ textAlign: "center", color: "var(--ink-3)", padding: 50 }}>No {nameHeader.toLowerCase()}s match this search.</Card>
          )}
        </>
      )}
    </div>
  )
}

export function Models({ apiKey }: { apiKey: string }) {
  const q = useModelStats(apiKey)
  const rows: Row[] = (q.data ?? []).map((m) => ({ ...m, name: m.model }))
  const sub = q.isLoading ? "Loading model usage…" : `${rows.length} models routed through the gateway`
  return (
    <DimensionTable
      title="Models"
      sub={sub}
      nameHeader="Model"
      rows={rows}
      icon="layers"
      loading={q.isLoading}
      error={q.error ? (q.error as Error).message : null}
    />
  )
}

export function Channels({ apiKey }: { apiKey: string }) {
  const q = useChannelStats(apiKey)
  const rows: Row[] = (q.data ?? []).map((c) => ({ ...c, name: c.provider }))
  const sub = q.isLoading ? "Loading channel health…" : `${rows.length} upstream providers configured`
  return (
    <DimensionTable
      title="Channels"
      sub={sub}
      nameHeader="Channel"
      rows={rows}
      icon="server"
      loading={q.isLoading}
      error={q.error ? (q.error as Error).message : null}
    />
  )
}
