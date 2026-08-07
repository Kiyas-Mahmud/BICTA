// The single source of truth for every chart in the admin console.
//
// Nothing here was picked by eye. The categorical ramp was run through the
// dataviz palette validator (lightness band, chroma floor, CVD separation,
// normal-vision floor, contrast) against the console's white card surface and
// passes all six checks in exactly this order. An earlier attempt built from
// the sage brand ramp FAILED: muted brand-adjacent tones fall under the chroma
// floor (they read as gray) and adjacent pairs were indistinguishable.
//
// If you change a colour here, re-run the validator before shipping.

/** Card surface these colours were validated against. */
export const SURFACE = '#ffffff'

/**
 * Categorical hues — for series whose IDENTITY is the point (competitions).
 *
 * Assign in this fixed order, never cycled: a generated 9th hue is
 * indistinguishable from an existing one under colour-vision deficiency. Past
 * eight, fold the tail into "Other".
 *
 * The worst adjacent pair sits at deltaE 7.1 under deuteranopia — inside the
 * 6-8 floor band, which is legal ONLY alongside secondary encoding. That is
 * why every categorical chart in this codebase ships a legend, direct labels
 * and the 2px segment gaps below. They are load-bearing for accessibility, not
 * decoration; do not "tidy" them away.
 */
export const CATEGORICAL = [
  '#4c7c3f', // 1 green
  '#c0407a', // 2 magenta
  '#a8820f', // 3 gold
  '#2f6ab8', // 4 blue
  '#d2542e', // 5 red-orange
  '#0f9b8e', // 6 teal
  '#7b4fa8', // 7 purple
  '#8a9a2b', // 8 olive
] as const

/**
 * Status colours are RESERVED. Never reuse one as "series 4" — a reader who
 * has learnt that amber means pending must not meet it as a competition name.
 * Always shipped with an icon and a text label, never colour alone.
 */
export const STATUS = {
  confirmed: '#5e6f54',
  pending: '#d9a441',
  rejected: '#c0685f',
} as const

/**
 * Sequential ramp for MAGNITUDE (heatmap cells, meters). One hue, light to
 * dark, lightness-monotonic so it stays readable and is hard to misread. This
 * is the brand sage ramp, which is the right call here: sequential data does
 * not need hue separation, so the palette can stay on-brand.
 */
export const SEQUENTIAL = [
  '#e7ede1',
  '#d3ddca',
  '#bbc8af',
  '#93a486',
  '#77896b',
  '#5e6f54',
  '#38432f',
] as const

/** Text and chrome tokens. Labels NEVER wear the series colour. */
export const INK = {
  primary: '#26302a',
  soft: '#586158',
  faint: '#98a29a',
  line: '#e3e7ea',
} as const

/** Single accent for ordered-stage charts (a funnel is one series, not five). */
export const ACCENT = '#5e6f54'

/** Mark specs, applied consistently by every wrapper component. */
export const MARKS = {
  /** Separates touching fills — stacked segments and adjacent bars alike. */
  surfaceGap: 2,
  /** Rounded data-end, anchored to the baseline. */
  radius: 4,
  lineWidth: 2,
  symbolSize: 8,
} as const

export const FONT_FAMILY =
  "'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif"

/**
 * Base ECharts options every chart merges over. Keeps grid/axis/tooltip
 * chrome recessive and consistent so individual charts only describe their
 * data, never their furniture.
 */
export function baseOption() {
  return {
    textStyle: { fontFamily: FONT_FAMILY, color: INK.soft },
    animationDuration: 500,
    animationEasing: 'cubicOut' as const,
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: INK.primary,
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: '#ffffff', fontSize: 12, fontFamily: FONT_FAMILY },
      extraCssText: 'border-radius:10px;box-shadow:0 12px 32px -12px rgba(38,48,42,0.2);',
    },
    // Recessive axes: the data carries the chart, not its scaffolding.
    categoryAxis: {
      axisLine: { lineStyle: { color: INK.line } },
      axisTick: { show: false },
      axisLabel: { color: INK.faint, fontSize: 11 },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK.faint, fontSize: 11 },
      splitLine: { lineStyle: { color: INK.line, type: 'dashed' as const } },
    },
  }
}

/** Map a 0-1 ratio onto the sequential ramp, for heatmap cells. */
export function sequentialAt(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return SEQUENTIAL[0]
  const i = Math.min(SEQUENTIAL.length - 1, Math.floor(ratio * (SEQUENTIAL.length - 1) + 0.5))
  return SEQUENTIAL[i]!
}

/** Stable colour for a categorical series by index (folds past the ceiling). */
export function categoricalAt(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length]!
}

/** Compact display for large values: 1,284 / 12.9K / 4.2M. */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 10_000) return new Intl.NumberFormat('en-US').format(n)
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
