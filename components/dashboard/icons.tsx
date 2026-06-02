"use client"

import * as React from "react"

export type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number
  strokeWidth?: number
}

export type IconComponent = React.FC<IconProps>

type PathDef = string | { tag: string; attrs: Record<string, unknown> }

// Stroke-based icons that inherit currentColor. Ported from the handoff lib.jsx.
function I(paths: PathDef[], props: IconProps = {}): IconComponent {
  const Icon: IconComponent = (extra = {}) => {
    const { size = 18, strokeWidth = 1.8, ...rest } = { ...props, ...extra }
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {paths.map((d, i) =>
          typeof d === "string"
            ? React.createElement("path", { key: i, d })
            : React.createElement(d.tag, { key: i, ...d.attrs }),
        )}
      </svg>
    )
  }
  return Icon
}

export const Icons: Record<string, IconComponent> = {
  pulse: I(["M3 12h4l3 8 4-16 3 8h4"]),
  grid: I([
    { tag: "rect", attrs: { x: 3, y: 3, width: 7, height: 7, rx: 1.5 } },
    { tag: "rect", attrs: { x: 14, y: 3, width: 7, height: 7, rx: 1.5 } },
    { tag: "rect", attrs: { x: 3, y: 14, width: 7, height: 7, rx: 1.5 } },
    { tag: "rect", attrs: { x: 14, y: 14, width: 7, height: 7, rx: 1.5 } },
  ]),
  layers: I(["M12 2 2 7l10 5 10-5-10-5Z", "M2 12l10 5 10-5", "M2 17l10 5 10-5"]),
  server: I([
    { tag: "rect", attrs: { x: 3, y: 4, width: 18, height: 7, rx: 2 } },
    { tag: "rect", attrs: { x: 3, y: 13, width: 18, height: 7, rx: 2 } },
    "M7 7.5h.01",
    "M7 16.5h.01",
  ]),
  list: I(["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]),
  bolt: I(["M13 2 3 14h7l-1 8 10-12h-7l1-8Z"]),
  sliders: I(["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"]),
  gear: I([
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 3 } },
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  ]),
  check: I(["M20 6 9 17l-5-5"]),
  x: I(["M18 6 6 18", "M6 6l12 12"]),
  checkCircle: I([{ tag: "circle", attrs: { cx: 12, cy: 12, r: 9 } }, "M8.5 12.5l2.5 2.5 4.5-5"]),
  xCircle: I([{ tag: "circle", attrs: { cx: 12, cy: 12, r: 9 } }, "M15 9l-6 6", "M9 9l6 6"]),
  shield: I(["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "M12 8v4", "M12 16h.01"]),
  play: I(["M6 4l14 8-14 8V4Z"]),
  playCircle: I([{ tag: "circle", attrs: { cx: 12, cy: 12, r: 9 } }, "M10 8.5l6 3.5-6 3.5v-7Z"]),
  clock: I([{ tag: "circle", attrs: { cx: 12, cy: 12, r: 9 } }, "M12 7v5l3 2"]),
  copy: I([{ tag: "rect", attrs: { x: 9, y: 9, width: 12, height: 12, rx: 2 } }, "M5 15V5a2 2 0 0 1 2-2h10"]),
  sun: I([
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 4 } },
    "M12 2v2",
    "M12 20v2",
    "M5 5l1.5 1.5",
    "M17.5 17.5 19 19",
    "M2 12h2",
    "M20 12h2",
    "M5 19l1.5-1.5",
    "M17.5 6.5 19 5",
  ]),
  moon: I(["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"]),
  menu: I(["M3 6h18", "M3 12h18", "M3 18h18"]),
  chevron: I(["M9 6l6 6-6 6"]),
  chevronDown: I(["M6 9l6 6 6-6"]),
  chevronsUpDown: I(["m7 15 5 5 5-5", "m7 9 5-5 5 5"]),
  panelLeft: I([{ tag: "rect", attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2 } }, "M9 3v18"]),
  search: I([{ tag: "circle", attrs: { cx: 11, cy: 11, r: 7 } }, "M21 21l-4-4"]),
  arrow: I(["M5 12h14", "M13 6l6 6-6 6"]),
  lock: I([{ tag: "rect", attrs: { x: 4, y: 10, width: 16, height: 11, rx: 2 } }, "M8 10V7a4 4 0 0 1 8 0v3"]),
  trash: I(["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"]),
  plus: I(["M12 5v14", "M5 12h14"]),
  save: I(["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z", "M17 21v-8H7v8", "M7 3v5h8"]),
  download: I(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]),
  upload: I(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]),
  refresh: I(["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"]),
  zap: I(["M13 2 3 14h7l-1 8 10-12h-7l1-8Z"]),
  coins: I([
    { tag: "ellipse", attrs: { cx: 12, cy: 6, rx: 8, ry: 3 } },
    "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6",
    "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  ]),
  gauge: I([
    "M12 14l4-4",
    { tag: "circle", attrs: { cx: 12, cy: 13, r: 1.4, fill: "currentColor", stroke: "none" } },
    "M4.5 18a9 9 0 1 1 15 0",
  ]),
  spark: I(["M3 17l5-5 4 3 8-9", "M16 6h4v4"]),
  dot: I([{ tag: "circle", attrs: { cx: 12, cy: 12, r: 4, fill: "currentColor", stroke: "none" } }]),
  eye: I(["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z", { tag: "circle", attrs: { cx: 12, cy: 12, r: 3 } }]),
  filter: I(["M3 5h18l-7 8v6l-4 2v-8L3 5Z"]),
  alert: I(["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"]),
  logout: I(["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]),
  key: I([{ tag: "circle", attrs: { cx: 8, cy: 15, r: 5 } }, "M11.5 11.5 21 2", "M16 7l3 3", "M19 4l3 3"]),
}
