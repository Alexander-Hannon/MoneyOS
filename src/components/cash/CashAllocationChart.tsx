"use client";

import { CATEGORICAL, CHART, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import type { CashAccountRow } from "@/lib/cash-breakdown";

const COLORS = CATEGORICAL;

export function CashAllocationChart({ accounts }: { accounts: CashAccountRow[] }) {
  const data = accounts.map((account) => ({
    name: account.mask ? `${account.name} ••${account.mask}` : account.name,
    total: account.availableBalance ?? account.currentBalance,
  }));

  if (!data.length) return null;

  return (
    <SafeResponsiveChart
      ready={data.length > 0}
      heightClassName="h-[240px] min-h-[240px]"
    >
      {({ width, height }) => (
        <ResponsiveContainer width={width} height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              stroke={CHART.panel}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </SafeResponsiveChart>
  );
}
