"use client"

import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Badge, Button, Card, SectionHead, Segmented, Select } from "@/components/dashboard/primitives"
import { Icons } from "@/components/dashboard/icons"
import { fmt } from "@/lib/format"
import { useFilters, useLogs } from "@/hooks/use-stats"
import type { LogEntry, LogFilters } from "@/lib/types"

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
// verticalAlign: middle 让含图标的 inline-flex 单元格（如 Status）与同行纯文本垂直对齐，
// 否则表格单元格默认按基线对齐，图标会把 Status 的文字顶得和整行错位。
const tdStyle: React.CSSProperties = { padding: "13px 18px", fontSize: 13.5, color: "var(--ink)", verticalAlign: "middle" }

// uni-api 把不同风格的对话请求记到不同 endpoint 上，给日志一个短标签便于区分来源。
function apiLabel(endpoint: string): string {
  if (endpoint.includes("/v1/chat/completions")) return "Chat"
  if (endpoint.includes("/v1/messages")) return "Messages"
  if (endpoint.includes("/v1/responses")) return "Responses"
  return endpoint.replace(/^POST\s+/, "") || "—"
}

interface Filters {
  model: string
  provider: string
  status: "all" | "success" | "failed"
}

export function Logs({ apiKey }: { apiKey: string }) {
  const [filters, setFilters] = useState<Filters>({ model: "all", provider: "all", status: "all" })
  const [flagView, setFlagView] = useState<LogEntry | null>(null)

  const filtersQuery = useFilters(apiKey)

  const apiFilters: LogFilters = useMemo(
    () => ({
      model: filters.model !== "all" ? filters.model : undefined,
      provider: filters.provider !== "all" ? filters.provider : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
    }),
    [filters],
  )

  const logsQuery = useLogs(apiKey, apiFilters)
  const logs = useMemo(() => logsQuery.data?.pages.flatMap((p) => p.logs) ?? [], [logsQuery.data])

  const models = filtersQuery.data?.models ?? []
  const providers = filtersQuery.data?.providers ?? []
  const hasFilters = filters.model !== "all" || filters.provider !== "all" || filters.status !== "all"

  const setF = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div>
      <SectionHead title="Request Logs" sub="Live stream of gateway requests. Flagged content is captured only on moderation hits." />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <Select
          width={190}
          value={filters.model}
          onChange={(v) => setF({ model: v })}
          options={[{ value: "all", label: "All models" }, ...models.map((m) => ({ value: m, label: m }))]}
        />
        <Select
          width={190}
          value={filters.provider}
          onChange={(v) => setF({ provider: v })}
          options={[{ value: "all", label: "All channels" }, ...providers.map((p) => ({ value: p, label: p }))]}
        />
        <Segmented
          value={filters.status}
          onChange={(v) => setF({ status: v as Filters["status"] })}
          size="sm"
          options={[
            { value: "all", label: "All" },
            { value: "success", label: "Success" },
            { value: "failed", label: "Failed" },
          ]}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" icon={Icons.x} onClick={() => setFilters({ model: "all", provider: "all", status: "all" })}>
            Clear
          </Button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }} className="tnum">
          {logs.length} loaded
        </span>
      </div>

      {logsQuery.isLoading ? (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 24, borderRadius: 8 }} />
            ))}
          </div>
        </Card>
      ) : logsQuery.error ? (
        <Card style={{ textAlign: "center", color: "var(--down)", padding: 50 }}>
          {(logsQuery.error as Error).message}
        </Card>
      ) : logs.length === 0 ? (
        <Card style={{ textAlign: "center", color: "var(--ink-3)", padding: 50 }}>No requests match these filters.</Card>
      ) : (
        <>
          {/* desktop */}
          <Card pad={0} style={{ overflow: "hidden" }} className="table-desktop">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1020 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={thStyle("left")}>Time</th>
                    <th style={{ ...thStyle("left"), width: 70 }}>Status</th>
                    <th style={thStyle("left")}>Model</th>
                    <th style={thStyle("left")}>Channel</th>
                    <th style={thStyle("left")}>API</th>
                    <th style={thStyle("right")}>Process</th>
                    <th style={thStyle("right")}>First Token</th>
                    <th style={thStyle("right")}>Tokens (P / C / T)</th>
                    <th style={thStyle("right")}>Cost</th>
                    <th style={{ ...thStyle("center"), width: 80 }}>Mod.</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="trow" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="mono" style={{ ...tdStyle, fontSize: 12, color: "var(--ink-3)" }}>
                        <div>{fmt.dt(l.timestamp)}</div>
                        {l.clientIp && (
                          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{l.clientIp}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {l.success ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--up)", fontSize: 12.5, fontWeight: 600 }}>
                            <Icons.checkCircle size={15} />
                            OK
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--down)", fontSize: 12.5, fontWeight: 600 }}>
                            <Icons.xCircle size={15} />
                            Fail
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ ...tdStyle, fontSize: 12.5, fontWeight: 600 }}>{l.model}</td>
                      <td className="mono" style={{ ...tdStyle, fontSize: 12.5, color: l.provider ? "var(--ink-2)" : "var(--ink-faint)" }}>
                        {l.provider ?? "—"}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--ink-2)",
                            background: "var(--surface-hover)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {apiLabel(l.endpoint)}
                        </span>
                      </td>
                      <td className="tnum" style={{ ...tdStyle, textAlign: "right", fontSize: 12.5 }}>{fmt.time(l.processTime)}</td>
                      <td className="tnum" style={{ ...tdStyle, textAlign: "right", fontSize: 12.5 }}>{fmt.time(l.firstResponseTime)}</td>
                      <td className="tnum mono" style={{ ...tdStyle, textAlign: "right", fontSize: 12, color: "var(--ink-2)" }}>
                        {fmt.compact(l.promptTokens)} / {fmt.compact(l.completionTokens)} /{" "}
                        <span style={{ color: "var(--ink)", fontWeight: 700 }}>{fmt.compact(l.totalTokens)}</span>
                      </td>
                      <td
                        className="tnum"
                        style={{ ...tdStyle, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: l.cost != null ? "var(--ink)" : "var(--ink-faint)" }}
                      >
                        {fmt.money(l.cost)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {l.isFlagged ? (
                          <button
                            onClick={() => setFlagView(l)}
                            style={{ background: "none", border: "none", color: "var(--warn)", display: "inline-grid", placeItems: "center" }}
                            title="View flagged content"
                          >
                            <Icons.shield size={16} />
                          </button>
                        ) : (
                          <span style={{ color: "var(--ink-faint)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* mobile */}
          <div className="table-mobile" style={{ display: "none", flexDirection: "column", gap: 10 }}>
            {logs.map((l, i) => (
              <Card key={i} pad={16}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{fmt.dt(l.timestamp)}</span>
                  {l.success ? (
                    <Badge tone="up" size="sm">
                      <Icons.check size={11} />
                      OK
                    </Badge>
                  ) : (
                    <Badge tone="down" size="sm">
                      <Icons.x size={11} />
                      Fail
                    </Badge>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{l.model}</span>
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "var(--ink-2)",
                      background: "var(--surface-hover)",
                    }}
                  >
                    {apiLabel(l.endpoint)}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
                  {l.provider ?? "—"}
                  {l.clientIp && <span style={{ color: "var(--ink-faint)" }}> · {l.clientIp}</span>}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }} className="tnum">
                  <span style={{ color: "var(--ink-3)" }}>
                    Proc <b style={{ color: "var(--ink)" }}>{fmt.time(l.processTime)}</b>
                  </span>
                  <span style={{ color: "var(--ink-3)" }}>
                    Tok <b style={{ color: "var(--ink)" }}>{fmt.compact(l.totalTokens)}</b>
                  </span>
                  {l.cost != null && (
                    <span style={{ color: "var(--ink-3)" }}>
                      Cost <b style={{ color: "var(--ink)" }}>{fmt.money(l.cost)}</b>
                    </span>
                  )}
                  {l.isFlagged && (
                    <button
                      onClick={() => setFlagView(l)}
                      style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--warn)", fontSize: 12, fontWeight: 600, display: "inline-flex", gap: 4, alignItems: "center" }}
                    >
                      <Icons.shield size={13} />
                      Flagged
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {logsQuery.hasNextPage && (
            <div style={{ textAlign: "center", marginTop: 22 }}>
              <Button
                variant="outline"
                onClick={() => logsQuery.fetchNextPage()}
                disabled={logsQuery.isFetchingNextPage}
                icon={logsQuery.isFetchingNextPage ? Icons.clock : Icons.chevronDown}
              >
                {logsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {flagView && <FlagModal log={flagView} onClose={() => setFlagView(null)} />}
    </div>
  )
}

function FlagModal({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  // Close on Escape, matching the backdrop-click affordance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
      <div
        style={{
          position: "relative",
          width: "min(560px, 100%)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "var(--warn)" }}>
          <Icons.shield size={20} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Moderation Hit</h3>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--ink-3)" }}>
            <Icons.x size={20} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, marginBottom: 16, fontSize: 12.5, color: "var(--ink-3)", flexWrap: "wrap" }} className="mono">
          <span>{log.model}</span>
          <span>·</span>
          <span>{log.provider ?? "—"}</span>
          <span>·</span>
          <span>{fmt.dt(log.timestamp)}</span>
        </div>
        <div
          className="md-flagged"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            padding: 18,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            overflowWrap: "anywhere",
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ children }) => (
                <code
                  style={{
                    background: "var(--surface-hover)",
                    padding: "1px 6px",
                    borderRadius: 5,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12.5,
                  }}
                >
                  {children}
                </code>
              ),
              strong: ({ children }) => <strong style={{ color: "var(--ink)" }}>{children}</strong>,
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>
                  {children}
                </a>
              ),
            }}
          >
            {log.text || "_No content captured._"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
