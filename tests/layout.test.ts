import { describe, expect, it } from "vitest";

import { DEFAULT_LAYOUT, checkLayout, distance, slotId, slots } from "../src/layout.js";

describe("layout", () => {
  it("walks the cross aisle then down the aisle (hand case 1)", () => {
    // 2 x 3 + 2 + 3.5 x 1.2 = 12.2 m
    expect(distance(DEFAULT_LAYOUT, 2, 3)).toBeCloseTo(12.2, 9);
  });

  it("makes two slots per bay with stable ids", () => {
    const all = slots(DEFAULT_LAYOUT);
    expect(all).toHaveLength(400);
    expect(all[0]).toEqual({ id: "00-00-L", aisle: 0, bay: 0, side: "L", distance: 2.6 });
    expect(slotId(9, 19, "R")).toBe("09-19-R");
  });

  it("rejects impossible layouts", () => {
    expect(() => checkLayout({ ...DEFAULT_LAYOUT, aisles: 0 })).toThrow(/whole number/);
    expect(() => checkLayout({ ...DEFAULT_LAYOUT, bays: 1.5 })).toThrow(/whole number/);
    expect(() => checkLayout({ ...DEFAULT_LAYOUT, bayWidth: 0 })).toThrow(/positive/);
    expect(() => checkLayout({ ...DEFAULT_LAYOUT, front: -1 })).toThrow(/positive/);
  });
});
