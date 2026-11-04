import { describe, expect, it } from "vitest";

import type { Slot } from "../src/layout.js";
import { assign, nearestFirst, reslotTop, swap, travelM } from "../src/plan.js";

const s = (id: string, distance: number): Slot => ({ id, aisle: 0, bay: 0, side: "L", distance });
const four = [s("d", 9), s("a", 2), s("c", 9), s("b", 5)];

function* permutations<T>(xs: T[]): Generator<T[]> {
  if (xs.length <= 1) {
    yield xs;
    return;
  }
  for (let i = 0; i < xs.length; i++) {
    for (const p of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) yield [xs[i] as T, ...p];
  }
}

describe("plan", () => {
  it("sorts by distance then id", () => {
    expect(nearestFirst(four).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the busiest SKU nearest (hand case 3)", () => {
    const picks = new Map([
      ["x", 6],
      ["y", 3],
      ["z", 1],
    ]);
    const p = assign(["x", "y", "z"], four.slice(1));
    expect(travelM(picks, p)).toBe(72); // 2 x (6x2 + 3x5 + 1x9)
    const worst = assign(["z", "y", "x"], four.slice(1));
    expect(travelM(picks, worst)).toBe(142);
  });

  it("is never beaten by any other assignment", () => {
    const picks = new Map([
      ["w", 7],
      ["x", 6],
      ["y", 3],
      ["z", 1],
    ]);
    const best = travelM(picks, assign(["w", "x", "y", "z"], four));
    for (const order of permutations(["w", "x", "y", "z"])) {
      const m = new Map(order.map((sku, i) => [sku, four[i] as Slot]));
      expect(travelM(picks, m)).toBeGreaterThanOrEqual(best);
    }
  });

  it("refuses more SKUs than slots and picks without a slot", () => {
    expect(() => assign(["a", "b"], [s("a", 1)])).toThrow(/only 1 slots/);
    expect(() => travelM(new Map([["q", 1]]), new Map())).toThrow(/no slot/);
  });

  it("moves only the top k (hand case 5)", () => {
    const cur = new Map([
      ["x", four[0] as Slot],
      ["y", four[1] as Slot],
      ["z", four[3] as Slot],
      ["w", four[2] as Slot],
    ]);
    expect(reslotTop(cur, ["x", "y", "z", "w"], 0)).toEqual({ placement: cur, moves: 0 });
    const all = reslotTop(cur, ["x", "y", "z", "w"], 4);
    expect([...all.placement].map(([k, v]) => `${k}${v.id}`)).toEqual(["xa", "yb", "zc", "wd"]);
    // k = 1: x takes a, y (in a) takes x's old slot d
    const one = reslotTop(cur, ["x", "y", "z", "w"], 1);
    expect(one.placement.get("x")?.id).toBe("a");
    expect(one.placement.get("y")?.id).toBe("d");
    expect(one.moves).toBe(2);
    // a top SKU already in the best set stays put
    expect(reslotTop(cur, ["y", "x"], 1).moves).toBe(0);
    // SKUs pushed out but missing from the ranking go last, by name
    const off = reslotTop(cur, ["x", "w"], 2).placement;
    expect([...off].map(([k, v]) => `${k}${v.id}`).sort()).toEqual(["wb", "xa", "yc", "zd"]);
  });

  it("swaps two slots, one possibly empty", () => {
    const p = new Map([
      ["x", four[0] as Slot],
      ["y", four[1] as Slot],
    ]);
    const q = swap(p, four[0] as Slot, four[1] as Slot);
    expect(q.get("x")?.id).toBe("a");
    expect(q.get("y")?.id).toBe("d");
    expect(swap(p, four[0] as Slot, four[3] as Slot).get("x")?.id).toBe("b");
  });
});
