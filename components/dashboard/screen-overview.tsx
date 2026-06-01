"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, Segmented } from "@/components/dashboard/primitives"
import { AreaChart, Ring, ShareBar, Sparkline } from "@/components/dashboard/charts"
import { Icons } from "@/components/dashboard/icons"
import { fmt } from "@/lib/format"
import { useChannelStats, useModelStats, useOverview, useTimeseries } from "@/hooks/use-stats"
import type { TimeseriesRange } from "@/lib/types"

const RANGE_KEYS: { value: TimeseriesRange; label: string }[] = [
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "ALL", label: "ALL" },
]

const RANGE_LABEL: Record<TimeseriesRange, string> = {
  "1D": "Today",
  "1W": "Past week",
  "1M": "Past month",
  "3M": "Past 3 months",
  ALL: "All time",
}

export function Overview({ apiKey }: { apiKey: string }) {
  const [range, setRange] = useState<TimeseriesRange>("1M")
  const [metric, setMetric] = useState<"requests" | "tokens">("requests")
  const [scrub, setScrub] = useState<{ t: number; v: number } | null>(null)

  const ts = useTimeseries(apiKey, range)
  const overview = useOverview(apiKey)
  const models = useModelStats(apiKey)
  const channels = useChannelStats(apiKey)

  // settle skeleton briefly even after cache hit for a smoother entrance
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setWarm(true), 200)
    return () => clearTimeout(t)
  }, [])

  const series = useMemo(() => {
    if (!ts.data) return []
    return metric === "requests" ? ts.data.requests : ts.data.tokens
  }, [ts.data, metric])

  const hasData = series.length >= 2
  const first = hasData ? series[0].v : 0
  const last = hasData ? series[series.length - 1].v : 0
  const cur = scrub ? scrub.v : last
  const diff = cur - first
  const pctDiff = first > 0 ? diff / first : 0
  const up = diff >= 0

  const heroLoaded = warm && !ts.isLoading && hasData
  const ovLoaded = warm && !!overview.data

  const metricLabel = metric === "requests" ? "Total Requests" : "Total Tokens"
  const ov = overview.data

  const deltaBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div
        className="tnum"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: up ? "var(--up)" : "var(--down)",
          fontWeight: 700,
          fontSize: 17,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ display: "inline-flex", transform: up ? "none" : "rotate(180deg)" }}>
          <Icons.arrow size={16} style={{ transform: "rotate(-45deg)" }} />
        </span>
        {fmt.compact(Math.abs(diff))}
        {first > 0 ? ` (${fmt.delta(pctDiff * 100, 1)}%)` : ""}
      </div>
      <span style={{ color: "var(--line-strong)" }}>·</span>
      <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500, whiteSpace: "nowrap" }}>
        {scrub ? fmt.time_full(scrub.t) : RANGE_LABEL[range]}
      </span>
    </div>
  )

  return (
    <div>
      {/* HERO */}
      <div style={{ marginBottom: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Segmented
            size="sm"
            value={metric}
            onChange={(v) => {
              setMetric(v as "requests" | "tokens")
              setScrub(null)
            }}
            options={[
              { value: "requests", label: "Requests" },
              { value: "tokens", label: "Tokens" },
            ]}
          />
          <span
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {metricLabel}
          </span>
        </div>

        {heroLoaded ? (
          <div
            className="tnum"
            style={{
              fontSize: "clamp(46px, 7vw, 88px)",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 0.98,
              color: "var(--ink)",
            }}
          >
            {fmt.num(cur)}
          </div>
        ) : (
          <div className="skel" style={{ height: 80, width: "55%", borderRadius: 12 }} />
        )}

        <div style={{ marginTop: 14 }}>
          {heroLoaded ? deltaBlock : <div className="skel" style={{ height: 22, width: 220 }} />}
        </div>

        <div style={{ marginTop: 18 }}>
          {heroLoaded ? (
            <AreaChart data={series} height={320} onScrub={(p) => setScrub(p)} animateKey={range + metric} />
          ) : (
            <div className="skel" style={{ height: 320, borderRadius: 16 }} />
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <Segmented
            value={range}
            onChange={(v) => {
              setRange(v as TimeseriesRange)
              setScrub(null)
            }}
            options={RANGE_KEYS}
          />
        </div>
      </div>

      {/* SECONDARY METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        <SuccessCard
          loaded={ovLoaded}
          rate={ov?.successRate ?? 0}
          requests={ov?.requests ?? 0}
        />
        <MetricCard
          loaded={ovLoaded}
          icon="coins"
          label="Prompt Tokens"
          value={fmt.compact(ov?.promptTokens ?? 0)}
          sub={fmt.num(ov?.promptTokens ?? 0)}
          spark={channels.data?.[0]?.spark}
        />
        <MetricCard
          loaded={ovLoaded}
          icon="spark"
          label="Completion Tokens"
          value={fmt.compact(ov?.completionTokens ?? 0)}
          sub={fmt.num(ov?.completionTokens ?? 0)}
          spark={channels.data?.[1]?.spark}
        />
        <MetricCard
          loaded={ovLoaded}
          icon="gauge"
          label="Avg Process Time"
          value={fmt.time(ov?.avgProcessTime ?? 0)}
          sub="per request"
          spark={models.data?.[0]?.spark}
          up={false}
        />
        <MetricCard
          loaded={ovLoaded}
          icon="zap"
          label="Avg First Response"
          value={fmt.time(ov?.avgFirstResponseTime ?? 0)}
          sub="time to first token"
          spark={models.data?.[1]?.spark}
        />
      </div>

      {/* TOP BREAKDOWNS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
        <TopList
          title="Top Models"
          icon="layers"
          items={(models.data ?? []).slice(0, 6).map((m) => ({ name: m.model, requests: m.requests, successRate: m.successRate }))}
          loading={!warm || models.isLoading}
        />
        <TopList
          title="Top Channels"
          icon="server"
          items={(channels.data ?? []).slice(0, 6).map((c) => ({ name: c.provider, requests: c.requests, successRate: c.successRate }))}
          loading={!warm || channels.isLoading}
        />
      </div>
    </div>
  )
}

function SuccessCard({ loaded, rate, requests }: { loaded: boolean; rate: number; requests: number }) {
  return (
    <Card pad={20} style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {loaded ? (
        <Ring value={rate} size={84} stroke={8} label={fmt.pct(rate, 1)} />
      ) : (
        <div className="skel" style={{ width: 84, height: 84, borderRadius: 99, flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>Success Rate</div>
        <div className="tnum" style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6, color: "var(--up)" }}>
          {fmt.compact(requests * rate)}
          <span style={{ color: "var(--ink-faint)", fontWeight: 500 }}> ok</span>
        </div>
        <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--down)" }}>
          {fmt.compact(requests * (1 - rate))}
          <span style={{ color: "var(--ink-faint)", fontWeight: 500 }}> failed</span>
        </div>
      </div>
    </Card>
  )
}

function MetricCard({
  loaded,
  icon,
  label,
  value,
  sub,
  spark,
  up,
}: {
  loaded: boolean
  icon: string
  label: string
  value: string
  sub: string
  spark?: number[]
  up?: boolean
}) {
  const IconC = Icons[icon]
  const hasSpark = spark && spark.length > 1
  return (
    <Card pad={20} hover>
      <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink-3)", fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-hover)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
          <IconC size={16} />
        </span>
        {label}
      </div>
      {loaded ? (
        <>
          <div className="tnum" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10, gap: 8 }}>
            <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sub}
            </span>
            {hasSpark && <Sparkline data={spark} up={up} width={72} height={26} />}
          </div>
        </>
      ) : (
        <div className="skel" style={{ height: 58 }} />
      )}
    </Card>
  )
}

function TopList({
  title,
  items,
  icon,
  loading,
}: {
  title: string
  items: { name: string; requests: number; successRate: number }[]
  icon: string
  loading: boolean
}) {
  const IconC = Icons[icon]
  const max = Math.max(1, ...items.map((i) => i.requests))
  return (
    <Card pad={22}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
        <IconC size={18} style={{ color: "var(--accent)" }} />
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{title}</h3>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skel" style={{ height: 32, borderRadius: 8 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "8px 0" }}>No data yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((it, i) => (
            <div key={it.name} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", alignItems: "center", gap: 12 }}>
              <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-faint)", fontWeight: 700 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
                  {it.name}
                </div>
                <ShareBar value={it.requests} max={max} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700 }}>{fmt.compact(it.requests)}</div>
                <div className="tnum" style={{ fontSize: 11, color: it.successRate > 0.97 ? "var(--up)" : "var(--warn)", fontWeight: 600 }}>
                  {fmt.pct(it.successRate, 1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
