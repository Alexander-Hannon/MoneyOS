"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import type { PacePoint } from "@/lib/spending-plan";

function compact(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
}

function PaceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PacePoint }>;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="min-w-44 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{formatDate(p.date)}</p>
      <div className="mt-1 flex justify-between gap-4 text-xs">
        <span className="text-muted-foreground">Spent so far</span>
        <span className="num text-foreground">{p.actual == null ? "—" : formatCurrency(p.actual, true)}</span>
      </div>
      <div className="flex justify-between gap-4 text-xs">
        <span className="text-muted-foreground">Even pace</span>
        <span className="num text-muted-foreground">{formatCurrency(p.pace, true)}</span>
      </div>
    </div>
  );
}

export function PaceChart({ points, dayOfMonth }: { points: PacePoint[]; dayOfMonth: number }) {
  const last = points[points.length - 1];
  const todayPoint = points[dayOfMonth - 1];
  return (
    <div
      role="img"
      aria-label={`Flexible spending so far ${formatCurrency(todayPoint?.actual ?? 0)} against an even pace of ${formatCurrency(todayPoint?.pace ?? 0)} by today.`}
    >
      <SafeResponsiveChart heightClassName="h-[220px]">
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <ComposedChart data={points} margin={{ top: 16, right: 72, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mos-pace-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.signal} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART.signal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={CHART_TICK} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={CHART_TICK} tickFormatter={compact} />
              <Tooltip content={<PaceTooltip />} cursor={{ stroke: CHART.signal, strokeOpacity: 0.5, strokeDasharray: "2 3" }} />
              <ReferenceLine
                x={dayOfMonth}
                stroke={CHART.axis}
                strokeDasharray="2 3"
                label={{ value: "Today", position: "insideBottomLeft", fill: CHART.axis, fontSize: 11, offset: 8 }}
              />
              <Line
                type="linear"
                dataKey="pace"
                stroke={CHART.axis}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="stepAfter"
                dataKey="actual"
                stroke={CHART.signal}
                strokeWidth={2}
                fill="url(#mos-pace-fill)"
                connectNulls={false}
                animationDuration={700}
              />
              {last ? (
                <ReferenceDot
                  x={last.day}
                  y={last.pace}
                  r={0}
                  label={{ value: "Even pace", position: "right", fill: CHART.axis, fontSize: 11 }}
                />
              ) : null}
              {todayPoint?.actual != null ? (
                <ReferenceDot
                  x={todayPoint.day}
                  y={todayPoint.actual}
                  r={4}
                  fill={CHART.signal}
                  stroke={CHART.panel}
                  strokeWidth={2}
                  label={{ value: "Spent", position: "top", fill: CHART.signal, fontSize: 11, offset: 8 }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </SafeResponsiveChart>
      <span className="sr-only">Month budget line ends at {formatCurrency(last?.pace ?? 0)}.</span>
    </div>
  );
}
