import { describe, expect, it } from "vitest";

import { DEFAULT_LAYOUT, slots } from "../src/layout.js";
import { current, lines, rng, skus } from "../src/synthetic.js";

describe("synthetic", () => {
  it("is repeatable and in [0, 1)", () => {
    const a = rng(7);
    const b = rng(7);
    const xs = Array.from({ length: 1000 }, a);
    expect(xs).toEqual(Array.from({ length: 1000 }, b));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });

  it("makes skewed demand with one line per SKU per order", () => {
    const ls = lines(7, 50, 2, 100);
    expect(ls).toEqual(lines(7, 50, 2, 100));
    const per = new Map<string, number>();
    for (const l of ls) per.set(l.sku, (per.get(l.sku) ?? 0) + 1);
    const counts = [...per.values()].sort((a, b) => b - a);
    expect(counts[0]).toBeGreaterThan(5 * (counts.at(-1) as number));
    const keys = ls.map((l) => `${l.order}/${l.sku}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ls.every((l) => l.qty >= 1 && l.qty <= 6)).toBe(true);
  });

  it("scatters SKUs over distinct slots", () => {
    const all = slots(DEFAULT_LAYOUT);
    const cur = current(7, all);
    expect(cur.size).toBe(400);
    expect(new Set([...cur.values()].map((s) => s.id)).size).toBe(400);
    expect(current(7, all.slice(0, 10)).size).toBe(10);
    expect(skus(2)).toEqual(["SKU0001", "SKU0002"]);
  });
});
