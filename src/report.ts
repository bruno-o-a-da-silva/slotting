/** One analysis run: ABC from DuckDB, today's map against moving only A and the full plan. */

import type { DuckDBConnection } from "@duckdb/node-api";

import { walkCost } from "./cost.js";
import { analyse, lineCount, withDb, type AbcClass, type Velocity } from "./db.js";
import { slots, type Layout } from "./layout.js";
import { assign, reslotTop, travelM, type Placement } from "./plan.js";

export interface Row {
  label: string;
  kmPerDay: number;
  hours: string;
  brl: string;
  moves?: number;
}

export interface Analysis {
  lines: number;
  days: number;
  velocity: Velocity[];
  counts: Record<AbcClass, number>;
  rows: Row[];
  plan: Placement;
  current: Placement | undefined;
}

export function row(label: string, metresPerDay: number, moves?: number): Row {
  const { hours, brl } = walkCost(metresPerDay);
  const r: Row = { label, kmPerDay: metresPerDay / 1000, hours, brl };
  if (moves !== undefined) r.moves = moves;
  return r;
}

export async function run(
  load: (c: DuckDBConnection) => Promise<void>,
  layout: Layout,
  current?: Placement,
  cuts: [number, number] = [0.8, 0.95],
): Promise<Analysis> {
  const { velocity, days, lines } = await withDb(async (c) => {
    await load(c);
    return { ...(await analyse(c, ...cuts)), lines: await lineCount(c) };
  });
  const picks = new Map(velocity.map((v) => [v.sku, v.picks / days]));
  const ranked = velocity.map((v) => v.sku);
  const counts = { A: 0, B: 0, C: 0 };
  for (const v of velocity) counts[v.cls]++;
  const rows: Row[] = [];
  if (current !== undefined) {
    const missing = ranked.filter((s) => !current.has(s));
    if (missing.length > 0) {
      throw new Error(`SKUs picked but not in the current map: ${missing.slice(0, 5).join(", ")}`);
    }
    ranked.push(...[...current.keys()].filter((s) => !picks.has(s)).sort());
    rows.push(row("today", travelM(picks, current)));
    const a = reslotTop(current, ranked, counts.A);
    rows.push(row("A only", travelM(picks, a.placement), a.moves));
  }
  const plan = assign(ranked, slots(layout));
  rows.push(row("plan", travelM(picks, plan)));
  return { lines, days, velocity, counts, rows, plan, current };
}

export function format(a: Analysis): string {
  const out = [
    `${a.lines} lines, ${a.velocity.length} SKUs, ${a.days} days`,
    `ABC: ${a.counts.A} A, ${a.counts.B} B, ${a.counts.C} C`,
  ];
  for (const r of a.rows) {
    const moved = r.moves === undefined ? "" : `  ${r.moves} moves`;
    out.push(
      `${r.label.padStart(7)}: ${r.kmPerDay.toFixed(2).padStart(6)} km/day  ${r.hours} h/day  ${r.brl} BRL/day${moved}`,
    );
  }
  return out.join("\n") + "\n";
}

/** Everything the browser slot map needs, as plain JSON. */
export interface MapData {
  layout: Layout;
  skus: { sku: string; perDay: number; cls: AbcClass }[];
  current: Record<string, string>;
  plan: Record<string, string>;
}

export function mapData(a: Analysis, layout: Layout): MapData {
  const ids = (p: Placement) => Object.fromEntries([...p].map(([sku, s]) => [sku, s.id]));
  return {
    layout,
    skus: a.velocity.map((v) => ({ sku: v.sku, perDay: v.picks / a.days, cls: v.cls })),
    current: ids(a.current ?? a.plan),
    plan: ids(a.plan),
  };
}
