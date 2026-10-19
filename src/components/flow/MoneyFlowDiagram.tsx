"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORICAL, CHART } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/money-utils";
import type { FlowGroup, FlowNode, MoneyFlow } from "@/lib/money-flow";

const GROUP_COLOR: Record<FlowGroup, string> = {
  income: CHART.inflow,
  refund: CATEGORICAL[2],
  drawn: CHART.outflow,
  bill: CATEGORICAL[0],
  subscription: CATEGORICAL[6],
  spending: CATEGORICAL[8],
  fee: CHART.outflow,
  review: CHART.caution,
  leftover: CHART.inflow,
};

const NODE_W = 10;
const GAP = 10;
const PAD = 8;
const MIN_SLOT = 30;
const BASE_HEIGHT = 300;

type Placed = FlowNode & { x: number; y: number; h: number; slotY: number; slotH: number };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function place(nodes: FlowNode[], x: number, scale: number, top: number): Placed[] {
  let y = top;
  return nodes.map((n) => {
    const h = Math.max(n.value * scale, 2);
    const slotH = Math.max(h, MIN_SLOT);
    const placed = { ...n, x, h, slotY: y, slotH, y: y + (slotH - h) / 2 };
    y += slotH + GAP;
    return placed;
  });
}

function columnHeight(nodes: FlowNode[], scale: number): number {
  if (nodes.length === 0) return 0;
  return nodes.reduce((s, n) => s + Math.max(n.value * scale, MIN_SLOT), 0) + GAP * (nodes.length - 1);
}

function band(x1: number, y1: number, x2: number, y2: number, h: number): string {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2} L${x2},${y2 + h} C${cx},${y2 + h} ${cx},${y1 + h} ${x1},${y1 + h} Z`;
}

function NodeLabel({
  node,
  side,
  narrow,
}: {
  node: Placed;
  side: "left" | "right";
  narrow: boolean;
}) {
  const x = side === "left" ? node.x - 8 : node.x + NODE_W + 8;
  const cy = node.y + node.h / 2;
  const anchor = side === "left" ? "end" : "start";
  const maxChars = narrow ? 11 : 20;
  const label = node.label.length > maxChars ? `${node.label.slice(0, maxChars - 1)}…` : node.label;
  return (
    <>
      <text x={x} y={cy - 2} textAnchor={anchor} fontSize={12} fill={CHART.ink}>
        {label}
      </text>
      <text
        x={x}
        y={cy + 12}
        textAnchor={anchor}
        fontSize={11}
        fill={CHART.axis}
        style={{ fontFamily: "var(--font-figures), ui-monospace, monospace" }}
      >
        {formatCurrency(node.value)}
      </text>
    </>
  );
}

export function MoneyFlowDiagram({ flow }: { flow: MoneyFlow }) {
  const { ref, width } = useWidth();
  const [active, setActive] = useState<string | null>(null);

  const total = Math.max(
    flow.sources.reduce((s, n) => s + n.value, 0),
    flow.uses.reduce((s, n) => s + n.value, 0),
  );

  const narrow = width < 560;
  const labelW = narrow ? 88 : 150;
  const scale = total > 0 ? BASE_HEIGHT / total : 0;
  const innerH = Math.max(columnHeight(flow.sources, scale), columnHeight(flow.uses, scale), BASE_HEIGHT);
  const height = innerH + PAD * 2;

  const xL = labelW;
  const xR = width - labelW - NODE_W;
  const xM = (xL + xR) / 2;

  const leftH = columnHeight(flow.sources, scale);
  const rightH = columnHeight(flow.uses, scale);
  const left = place(flow.sources, xL, scale, PAD + (innerH - leftH) / 2);
  const right = place(flow.uses, xR, scale, PAD + (innerH - rightH) / 2);
  const midH = total * scale;
  const midY = PAD + (innerH - midH) / 2;

  const links: Array<{ id: string; node: Placed; d: string }> = [];
  let acc = 0;
  for (const n of left) {
    links.push({ id: n.id, node: n, d: band(xL + NODE_W, n.y, xM, midY + acc, n.h) });
    acc += n.h;
  }
  acc = 0;
  for (const n of right) {
    links.push({ id: n.id, node: n, d: band(xM + NODE_W, midY + acc, xR, n.y, n.h) });
    acc += n.h;
  }

  const activeNode = [...left, ...right].find((n) => n.id === active) ?? null;
  const pctOfIn = (v: number) => (flow.totalIn > 0 ? Math.round((v / flow.totalIn) * 100) : null);

  return (
    <div>
      <p className="min-h-5 px-1 text-xs text-muted-foreground" aria-live="polite">
        {activeNode ? (
          <>
            <span className="text-foreground">{activeNode.label}</span>{" "}
            <span className="num text-foreground">{formatCurrency(activeNode.value, true)}</span>
            {activeNode.count > 0 ? `, ${activeNode.count} ${activeNode.count === 1 ? "transaction" : "transactions"}` : ""}
            {pctOfIn(activeNode.value) != null ? `, ${pctOfIn(activeNode.value)}% of money in` : ""}
          </>
        ) : (
          "Hover or focus a flow to see its details."
        )}
      </p>
      <div ref={ref} className="w-full">
        {width > 0 && total > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Money flow diagram; the same data is in the table below.">
            <g>
              {links.map((l) => {
                const dim = active != null && active !== l.id;
                return (
                  <path
                    key={l.id}
                    d={l.d}
                    fill={GROUP_COLOR[l.node.group]}
                    fillOpacity={dim ? 0.06 : active === l.id ? 0.5 : 0.22}
                    style={{ transition: "fill-opacity 150ms" }}
                    onMouseEnter={() => setActive(l.id)}
                    onMouseLeave={() => setActive(null)}
                  />
                );
              })}
            </g>
            <rect x={xM} y={midY} width={NODE_W} height={midH} rx={2} fill={CHART.signal} />
            {!narrow ? (
              <>
                <text x={xM + NODE_W / 2} y={midY - 18} textAnchor="middle" fontSize={12} fill={CHART.ink}>
                  {flow.net >= 0 ? "Money in" : "Money out"}
                </text>
                <text
                  x={xM + NODE_W / 2}
                  y={midY - 5}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CHART.axis}
                  style={{ fontFamily: "var(--font-figures), ui-monospace, monospace" }}
                >
                  {formatCurrency(total)}
                </text>
              </>
            ) : null}
            {[...left.map((n) => ({ n, side: "left" as const })), ...right.map((n) => ({ n, side: "right" as const }))].map(
              ({ n, side }) => (
                <g
                  key={n.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.label}: ${formatCurrency(n.value, true)}`}
                  onMouseEnter={() => setActive(n.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(n.id)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                  style={{ cursor: "default" }}
                >
                  <rect
                    x={side === "left" ? 0 : n.x}
                    y={n.slotY}
                    width={side === "left" ? n.x + NODE_W : width - n.x}
                    height={n.slotH}
                    fill="transparent"
                  />
                  <rect
                    x={n.x}
                    y={n.y}
                    width={NODE_W}
                    height={n.h}
                    rx={2}
                    fill={GROUP_COLOR[n.group]}
                    stroke={active === n.id ? CHART.ink : "none"}
                    strokeWidth={1}
                  />
                  <NodeLabel node={n} side={side} narrow={narrow} />
                </g>
              ),
            )}
          </svg>
        ) : (
          <div style={{ height: BASE_HEIGHT }} />
        )}
      </div>
    </div>
  );
}
