"use client";

import { CATEGORICAL, CHART, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import type { CategoryTotal } from "@/lib/transaction-utils";

const COLORS = CATEGORICAL;

export function SpendingByCategoryChart({ data }: { data: CategoryTotal[] }) {
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
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              stroke={CHART.panel}
            >
              {data.map((entry, i) => (
                <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
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

export { COLORS as categoryColors };
