"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import type { HistoryAccount, HistoryPoint } from "@/lib/balance-history";

type Metric = "netWorth" | "cash";

function compact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function HistoryTooltip({
  active,
  payload,
  metric,
  accountsById,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HistoryPoint }>;
  metric: Metric;
  accountsById: Map<string, HistoryAccount>;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="max-w-64 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{formatDate(p.date)}, recorded</p>
      <p className="num mt-0.5 text-base text-foreground">{formatCurrency(p[metric], true)}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {p.measuredCount} {p.measuredCount === 1 ? "account" : "accounts"} read this day
      </p>
      {p.carriedForward.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-xs text-warning">
          {p.carriedForward.map((c) => (
            <li key={c.accountId}>
              {accountsById.get(c.accountId)?.name ?? "Account"}: reading from {formatDate(c.fromDate)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function NetWorthChart({
  points,
  metric,
  accounts,
}: {
  points: HistoryPoint[];
  metric: Metric;
  accounts: HistoryAccount[];
}) {
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const data = points.map((p) => ({ ...p, label: formatDate(p.date) }));
  const values = points.map((p) => p[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 100);
  // A line chart (not an area), so the axis may start above zero to show change.
  const domain: [number, number] = [Math.floor(min - pad), Math.ceil(max + pad)];

  return (
    <div
      role="img"
      aria-label={`${metric === "cash" ? "Cash" : "Net worth"} history with ${points.length} recorded readings.`}
    >
      <SafeResponsiveChart heightClassName="h-[300px]">
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <LineChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={CHART_TICK}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                domain={domain}
                tickLine={false}
                axisLine={false}
                width={64}
                tick={CHART_TICK}
                tickFormatter={compact}
              />
              {domain[0] < 0 && domain[1] > 0 ? (
                <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.6} />
              ) : null}
              <Tooltip
                content={<HistoryTooltip metric={metric} accountsById={accountsById} />}
                cursor={{ stroke: CHART.signal, strokeOpacity: 0.5, strokeDasharray: "2 3" }}
              />
              {/* Step line: a balance holds until the next recorded reading. */}
              <Line
                type="stepAfter"
                dataKey={metric}
                stroke={CHART.signal}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.signal, stroke: CHART.panel, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: CHART.signal, stroke: CHART.panel, strokeWidth: 2 }}
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SafeResponsiveChart>
    </div>
  );
}
