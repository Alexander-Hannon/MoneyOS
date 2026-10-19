"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import { CHART, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

type Point = { month: string; income: number; spending: number };

const INCOME = CHART.inflow;
const SPENDING = CHART.outflow;

export function CashflowChart({ data }: { data: Point[] }) {
  if (!data.length) return null;

  return (
    <SafeResponsiveChart ready={data.length > 0}>
      {({ width, height }) => (
        <ResponsiveContainer width={width} height={height}>
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="mos-income-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INCOME} stopOpacity={0.35} />
                <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mos-spending-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SPENDING} stopOpacity={0.3} />
                <stop offset="100%" stopColor={SPENDING} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={CHART_TICK}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={CHART_TICK}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value, name) => [
                `$${Number(value).toLocaleString()}`,
                name === "income" ? "Income" : "Spending",
              ]}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={INCOME}
              strokeWidth={2}
              fill="url(#mos-income-gradient)"
            />
            <Area
              type="monotone"
              dataKey="spending"
              stroke={SPENDING}
              strokeWidth={2}
              fill="url(#mos-spending-gradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </SafeResponsiveChart>
  );
}
