"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import type { RunwayEvent, RunwayResult } from "@/lib/runway";

type Point = {
  date: string;
  label: string;
  balance: number;
  inflow: number;
  outflow: number;
  events: RunwayEvent[];
};

// Both charts share these so the event strip lines up under the balance line.
const MARGIN = { top: 12, right: 24, left: 0, bottom: 0 };
const Y_WIDTH = 64;

function compactCurrency(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function RunwayTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Point }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="min-w-52 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] text-muted-foreground">
          {formatDate(point.date)}
        </span>
        <span className="text-[11px] text-muted-foreground">Projected</span>
      </div>
      <p className="num mt-0.5 text-base text-foreground">
        {formatCurrency(point.balance, true)}
      </p>
      {point.events.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {point.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-4 text-xs">
              <span className="truncate text-muted-foreground">
                {e.label}
                {e.overdue ? " (overdue)" : ""}
              </span>
              <span className={e.amount >= 0 ? "num text-success" : "num text-destructive"}>
                {e.amount >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(e.amount), true)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No scheduled activity</p>
      )}
    </div>
  );
}

export function RunwayChart({
  result,
  compact = false,
}: {
  result: RunwayResult;
  compact?: boolean;
}) {
  const data: Point[] = result.days.map((d) => ({
    date: d.date,
    label: formatDate(d.date),
    balance: d.balance,
    inflow: d.inflow,
    outflow: -d.outflow,
    events: d.events,
  }));

  const balances = data.map((d) => d.balance);
  const minY = Math.min(0, result.buffer, ...balances);
  const maxY = Math.max(...balances, result.buffer);
  const pad = Math.max((maxY - minY) * 0.12, 50);
  const domain: [number, number] = [Math.floor(minY - (minY < 0 ? pad : 0)), Math.ceil(maxY + pad)];
  const hasFlows = data.some((d) => d.inflow !== 0 || d.outflow !== 0);
  const lowDay = data.find((d) => d.date === result.lowest.date);
  const lowIsBelowStart = result.lowest.balance < result.startingBalance;

  return (
    <div
      role="img"
      aria-label={`Projected balance from ${formatDate(result.startDate)} to ${formatDate(result.endDate)}. Lowest ${formatCurrency(result.lowest.balance, true)} on ${formatDate(result.lowest.date)}.`}
    >
      <SafeResponsiveChart heightClassName={compact ? "h-[180px]" : "h-[300px]"}>
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <AreaChart data={data} margin={MARGIN} syncId="runway">
              <defs>
                <linearGradient id="mos-runway-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.signal} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART.signal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={CHART_TICK}
                interval="preserveStartEnd"
                minTickGap={28}
                hide={hasFlows}
              />
              <YAxis
                domain={domain}
                tickLine={false}
                axisLine={false}
                width={Y_WIDTH}
                tick={CHART_TICK}
                tickFormatter={compactCurrency}
                tickCount={compact ? 3 : 5}
              />
              <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.6} />
              {result.buffer > 0 ? (
                <ReferenceLine
                  y={result.buffer}
                  stroke={CHART.caution}
                  strokeDasharray="4 4"
                  strokeOpacity={0.8}
                  label={
                    compact
                      ? undefined
                      : {
                          value: `Buffer ${compactCurrency(result.buffer)}`,
                          position: "insideTopRight",
                          fill: CHART.caution,
                          fontSize: 11,
                        }
                  }
                />
              ) : null}
              <Tooltip
                content={<RunwayTooltip />}
                cursor={{ stroke: CHART.signal, strokeOpacity: 0.5, strokeDasharray: "2 3" }}
              />
              <Area
                type="stepAfter"
                dataKey="balance"
                stroke={CHART.signal}
                strokeWidth={2}
                fill="url(#mos-runway-fill)"
                animationDuration={900}
                activeDot={{ r: 4, fill: CHART.signal, stroke: CHART.panel, strokeWidth: 2 }}
                isAnimationActive
              />
              {lowDay && lowIsBelowStart ? (
                <ReferenceDot
                  x={lowDay.label}
                  y={lowDay.balance}
                  r={5}
                  fill={result.lowest.balance < 0 ? CHART.outflow : CHART.caution}
                  stroke={CHART.panel}
                  strokeWidth={2}
                  label={
                    compact
                      ? undefined
                      : {
                          value: `Low ${compactCurrency(lowDay.balance)}`,
                          position: "bottom",
                          fill: CHART.ink,
                          fontSize: 11,
                          offset: 10,
                        }
                  }
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SafeResponsiveChart>

      {hasFlows ? (
        <SafeResponsiveChart heightClassName={compact ? "h-[64px]" : "h-[92px]"}>
          {({ width, height }) => (
            <ResponsiveContainer width={width} height={height}>
              <BarChart
                data={data}
                margin={{ ...MARGIN, top: 4 }}
                syncId="runway"
                stackOffset="sign"
                barCategoryGap={1}
              >
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_TICK}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis width={Y_WIDTH} tick={false} axisLine={false} tickLine={false} />
                <ReferenceLine y={0} stroke={CHART.grid} />
                <Tooltip content={() => null} cursor={{ fill: CHART.signal, fillOpacity: 0.06 }} />
                <Bar dataKey="inflow" stackId="flow" fill={CHART.inflow} radius={[2, 2, 0, 0]} maxBarSize={10} isAnimationActive={false} />
                <Bar dataKey="outflow" stackId="flow" fill={CHART.outflow} radius={[0, 0, 2, 2]} maxBarSize={10} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SafeResponsiveChart>
      ) : null}
    </div>
  );
}
