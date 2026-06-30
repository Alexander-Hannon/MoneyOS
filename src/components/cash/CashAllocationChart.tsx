"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SafeResponsiveChart } from "@/components/shared/SafeResponsiveChart";
import type { CashAccountRow } from "@/lib/cash-breakdown";

const COLORS = [
  "hsl(152 62% 47%)",
  "hsl(205 90% 60%)",
  "hsl(38 92% 56%)",
  "hsl(280 65% 65%)",
  "hsl(0 72% 60%)",
  "hsl(190 70% 50%)",
];

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
              stroke="hsl(224 26% 9%)"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(224 26% 9%)",
                border: "1px solid hsl(220 16% 17%)",
                borderRadius: 12,
                color: "hsl(210 22% 96%)",
                fontSize: 12,
              }}
              formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </SafeResponsiveChart>
  );
}
