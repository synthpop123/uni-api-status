"use client"

import * as React from "react"
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react"

export interface SeriesPoint {
  t: number
  v: number
}

// smooth path via monotone cubic Hermite (Fritsch–Carlson).
// Unlike a Catmull-Rom/cardinal spline, this preserves monotonicity between
// samples, so step-like data never dips below or overshoots above a level.
export function smoothPath(pts: number[][]): string {
  const n = pts.length
  if (n < 2) return n ? `M ${pts[0][0]},${pts[0][1]}` : ""

  // secant slopes between consecutive points
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1][0] - pts[i][0]
    dx[i] = h
    slope[i] = h === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / h
  }

  // tangents at each point, clamped to avoid overshoot
  const m: number[] = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1]
    const s1 = slope[i]
    if (s0 * s1 <= 0) {
      // local extremum or flat -> zero tangent keeps the curve inside the data
      m[i] = 0
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m[i] = (w1 + w2) / (w1 / s0 + w2 / s1)
    }
  }

  const d = [`M ${pts[0][0]},${pts[0][1]}`]
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]
    const c1x = pts[i][0] + h / 3
    const c1y = pts[i][1] + (m[i] * h) / 3
    const c2x = pts[i + 1][0] - h / 3
    const c2y = pts[i + 1][1] - (m[i + 1] * h) / 3
    d.push(`C ${c1x},${c1y} ${c2x},${c2y} ${pts[i + 1][0]},${pts[i + 1][1]}`)
  }
  return d.join(" ")
}

// ---------- Scrubbable Area Chart ----------
export function AreaChart({
  data,
  height = 280,
  onScrub,
  color,
  lineOnly = false,
  showGrid = true,
  animateKey,
}: {
  data: SeriesPoint[]
  height?: number
  onScrub?: (p: SeriesPoint | null, i: number | null) => void
  color?: string
  lineOnly?: boolean
  showGrid?: boolean
  animateKey?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(800)
  const [hoverI, setHoverI] = useState<number | null>(null)
  const [dash, setDash] = useState(0)
  const uid = "g" + useId().replace(/:/g, "")
  const accent = color || "var(--accent)"

  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width))
    ro.observe(wrapRef.current)
    setW(wrapRef.current.clientWidth)
    return () => ro.disconnect()
  }, [])

  const padX = 0
  const padTop = 16
  const padBot = 24
  const innerH = height - padTop - padBot
  const vals = data.map((d) => d.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const xAt = (i: number) => padX + (i / (data.length - 1)) * (w - padX * 2)
  const yAt = (v: number) => padTop + (1 - (v - min) / span) * innerH

  const pts = data.map((d, i) => [xAt(i), yAt(d.v)])
  const linePath = smoothPath(pts)
  const areaPath = linePath + ` L ${xAt(data.length - 1)},${padTop + innerH} L ${xAt(0)},${padTop + innerH} Z`

  // draw-on animation
  const lineRef = useRef<SVGPathElement>(null)
  useLayoutEffect(() => {
    if (lineRef.current) {
      const len = lineRef.current.getTotalLength()
      setDash(len)
    }
  }, [w, animateKey])

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!wrapRef.current) return
      const rect = wrapRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
      const x = clientX - rect.left
      const i = Math.max(0, Math.min(data.length - 1, Math.round((x / (w - padX * 2)) * (data.length - 1))))
      setHoverI(i)
      onScrub && onScrub(data[i], i)
    },
    [w, data, onScrub],
  )

  const handleLeave = useCallback(() => {
    setHoverI(null)
    onScrub && onScrub(null, null)
  }, [onScrub])

  // gridlines (horizontal)
  const gridY = showGrid ? [0, 0.25, 0.5, 0.75, 1].map((f) => padTop + f * innerH) : []

  return (
    <div ref={wrapRef} style={{ width: "100%", position: "relative", touchAction: "none" }}>
      <svg
        width={w}
        height={height}
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.26" />
            <stop offset="55%" stopColor={accent} stopOpacity="0.07" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridY.map((y, i) => (
          <line key={i} x1="0" y1={y} x2={w} y2={y} stroke="var(--grid-line)" strokeWidth="1" />
        ))}
        {!lineOnly && <path d={areaPath} fill={`url(#${uid})`} style={{ transition: "opacity .3s" }} />}
        <path
          ref={lineRef}
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={dash ? { strokeDasharray: dash, strokeDashoffset: 0, animation: "none" } : undefined}
        />
        {/* draw-on */}
        <style>{`@keyframes draw-${uid}{from{stroke-dashoffset:${dash}}to{stroke-dashoffset:0}}`}</style>
        {dash > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: dash, animation: `draw-${uid} 1.1s var(--ease) forwards` }}
          />
        )}
        {hoverI != null && (
          <g>
            <line
              x1={xAt(hoverI)}
              y1={padTop - 6}
              x2={xAt(hoverI)}
              y2={padTop + innerH}
              stroke="var(--scrub-line)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx={xAt(hoverI)} cy={yAt(data[hoverI].v)} r="9" fill={accent} opacity="0.16" />
            <circle cx={xAt(hoverI)} cy={yAt(data[hoverI].v)} r="4.5" fill="var(--bg)" stroke={accent} strokeWidth="2.6" />
          </g>
        )}
        {hoverI == null && (
          <circle cx={xAt(data.length - 1)} cy={yAt(data[data.length - 1].v)} r="3.5" fill={accent}>
            <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  )
}

// ---------- Sparkline ----------
export function Sparkline({
  data,
  width = 92,
  height = 30,
  color,
  up,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  up?: boolean
}) {
  const c = color || (up === false ? "var(--down)" : "var(--up)")
  const uid = "s" + useId().replace(/:/g, "")
  if (!data || data.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, (1 - (v - min) / span) * (height - 4) + 2])
  const path = smoothPath(pts)
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path + ` L ${width},${height} L 0,${height} Z`} fill={`url(#${uid})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------- Horizontal proportion bar ----------
export function ShareBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.max(2, (value / (max || 1)) * 100)
  return (
    <div style={{ height: 6, background: "var(--surface-hover)", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          width: pct + "%",
          height: "100%",
          background: color || "var(--accent)",
          borderRadius: 99,
          transition: "width .8s var(--ease)",
        }}
      />
    </div>
  )
}

// ---------- Success ring (donut) ----------
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color,
  label,
  sub,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: React.ReactNode
  sub?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - value)
  const col = color || "var(--accent)"
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-hover)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s var(--ease)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="tnum" style={{ fontSize: size * 0.2, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ---------- Vertical bars (small) ----------
export function MiniColumns({ data, height = 44, color }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data) || 1
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: Math.max(8, (v / max) * height) + "%",
            background: color || "var(--accent)",
            borderRadius: 2,
            opacity: 0.35 + (v / max) * 0.65,
            transition: "height .6s var(--ease)",
          }}
        />
      ))}
    </div>
  )
}
