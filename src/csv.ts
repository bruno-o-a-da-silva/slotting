/** Plain CSV for the files this tool writes and reads: no quoting, comma separated. */

import { readFileSync, writeFileSync } from "node:fs";

import type { Line, Velocity } from "./db.js";
import type { Slot } from "./layout.js";
import type { Placement } from "./plan.js";

export function writeLines(path: string, rows: readonly Line[]): void {
  const body = rows.map((r) => `${r.day},${r.order},${r.sku},${r.qty}`);
  writeFileSync(path, ["day,order,sku,qty", ...body].join("\n") + "\n");
}

export function readMap(path: string, all: readonly Slot[]): Placement {
  const byId = new Map(all.map((s) => [s.id, s]));
  const [head, ...rows] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const cols = String(head).split(",");
  const [iSku, iSlot] = [cols.indexOf("sku"), cols.indexOf("slot")];
  if (iSku < 0 || iSlot < 0) throw new Error(`${path}: needs columns sku and slot`);
  const out: Placement = new Map();
  for (const r of rows) {
    const f = r.split(",");
    const id = String(f[iSlot]);
    const slot = byId.get(id);
    if (slot === undefined) throw new Error(`${path}: slot ${id} is not in the layout`);
    out.set(String(f[iSku]), slot);
  }
  return out;
}

export function writeMap(path: string, p: Placement, velocity: readonly Velocity[] = []): void {
  const info = new Map(velocity.map((v) => [v.sku, v]));
  const rows = [...p]
    .sort(([, a], [, b]) => a.distance - b.distance || a.id.localeCompare(b.id))
    .map(([sku, s]) => {
      const v = info.get(sku);
      return `${sku},${s.id},${s.distance.toFixed(1)},${v?.cls ?? ""},${v?.picks ?? 0}`;
    });
  writeFileSync(path, ["sku,slot,distance_m,class,picks", ...rows].join("\n") + "\n");
}
