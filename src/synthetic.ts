/** Seeded synthetic order lines and a "slotted by arrival" starting map. Not real data. */

import type { Line } from "./db.js";
import type { Slot } from "./layout.js";
import type { Placement } from "./plan.js";

/** mulberry32: a small 32-bit generator; the same seed gives the same data everywhere. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function skus(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `SKU${String(i + 1).padStart(4, "0")}`);
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [xs[i], xs[j]] = [xs[j] as T, xs[i] as T];
  }
  return xs;
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** Demand falls off as 1 / rank (a Zipf curve), the usual shape of warehouse picks. */
export function lines(seed: number, nSkus = 400, days = 20, orders = 250): Line[] {
  const r = rng(seed);
  const ids = shuffle(skus(nSkus), r);
  const cum: number[] = [];
  let total = 0;
  for (let k = 1; k <= nSkus; k++) cum.push((total += 1 / k));
  const draw = (): string => {
    const x = r() * total;
    let lo = 0;
    let hi = nSkus - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((cum[mid] as number) <= x) lo = mid + 1;
      else hi = mid;
    }
    return ids[lo] as string;
  };
  const out: Line[] = [];
  for (let d = 1; d <= days; d++) {
    for (let o = 0; o < orders; o++) {
      const n = 1 + Math.floor(r() * 5);
      const picked = new Set(Array.from({ length: n }, draw));
      for (const sku of [...picked].sort()) {
        out.push({
          day: `D${pad(d, 2)}`,
          order: `D${pad(d, 2)}-${pad(o, 4)}`,
          sku,
          qty: 1 + Math.floor(r() * 6),
        });
      }
    }
  }
  return out;
}

/** Today's map: items went wherever a slot was free when they arrived. */
export function current(seed: number, all: readonly Slot[], nSkus = 400): Placement {
  const free = shuffle([...all], rng(seed + 1000));
  return new Map(skus(Math.min(nSkus, free.length)).map((s, i) => [s, free[i] as Slot]));
}
