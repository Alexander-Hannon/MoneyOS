/*
 * Shared chart styling for the V2 "mission control" theme. Recharts needs
 * literal color strings, so these mirror the tokens in globals.css.
 */
export const CHART = {
  signal: "#38cfff",
  inflow: "#3ddc97",
  outflow: "#ff5d6c",
  caution: "#ffb547",
  grid: "#1a2332",
  axis: "#7d8a9c",
  panel: "#0c1118",
  ink: "#e6edf5",
} as const;

/**
 * Categorical series colors in fixed order, validated (lightness band, CVD
 * separation, contrast) against the #0c1118 panel surface. The trailing gray
 * is reserved for an "Other" bucket.
 */
export const CATEGORICAL = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
  "#6f7f96",
] as const;

export const CHART_TOOLTIP_STYLE = {
  background: "#0f151e",
  border: `1px solid ${CHART.grid}`,
  borderRadius: 6,
  color: CHART.ink,
  fontSize: 12,
  fontFamily: "var(--font-figures), ui-monospace, monospace",
} as const;

export const CHART_TICK = {
  fill: CHART.axis,
  fontSize: 11,
  fontFamily: "var(--font-figures), ui-monospace, monospace",
} as const;
