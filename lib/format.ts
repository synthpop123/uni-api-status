// Formatters ported from the handoff design (lib.jsx → fmt).

export const fmt = {
  num(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return "0"
    return Math.round(n).toLocaleString("en-US")
  },
  compact(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return "0"
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B"
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M"
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K"
    return String(Math.round(n))
  },
  // 美元金额：极小额保留更多小数，避免显示成 $0.00。
  money(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return "—"
    if (n === 0) return "$0"
    if (n < 0.01) return "$" + n.toFixed(4)
    if (n < 1) return "$" + n.toFixed(3)
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  pct(n: number | null | undefined, d = 2): string {
    if (n == null || !Number.isFinite(n)) return "—"
    return (n * 100).toFixed(d) + "%"
  },
  time(s: number | null | undefined): string {
    if (s == null || !Number.isFinite(s)) return "—"
    // uni-api 用负值（如 first_response_time = -1）标记“请求失败 / 无首响”，
    // 不是真实耗时，统一显示为“—”而非 -1000ms。
    if (s < 0) return "—"
    if (s < 1) return Math.round(s * 1000) + "ms"
    return s.toFixed(2) + "s"
  },
  // signed delta with + / −
  delta(n: number, d = 2): string {
    const sign = n > 0 ? "+" : n < 0 ? "−" : ""
    return sign + Math.abs(n).toFixed(d)
  },
  dt(ms: number | string): string {
    const d = new Date(ms)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  },
  time_full(ms: number | string): string {
    const d = new Date(ms)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  },
  keyShort(k: string | null | undefined): string {
    if (!k) return ""
    if (k.length <= 14) return k
    return k.slice(0, 10) + "…" + k.slice(-4)
  },
}
