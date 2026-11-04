import { describe, expect, it } from "vitest";

import { money, walkCost } from "../src/cost.js";

describe("cost", () => {
  it("prices walking exactly (hand case 4)", () => {
    // 11,520 m / 0.8 m/s = 14,400 s = 4.00 h; x 25.00 BRL = 100.00 BRL
    expect(walkCost(11520)).toEqual({ hours: "4.00", brl: "100.00" });
  });

  it("rounds half up once at the end", () => {
    // 14.4 m = 144 dm; 144 x 2500 / 28800 = 12.5 centavos, which rounds up to 13
    expect(walkCost(14.4).brl).toBe("0.13");
    expect(walkCost(14.3).brl).toBe("0.12");
    expect(walkCost(0)).toEqual({ hours: "0.00", brl: "0.00" });
    expect(walkCost(11520, { speedDmS: 10n, wageCents: 3000n }).brl).toBe("96.00");
  });

  it("formats centavos and rejects negative distance", () => {
    expect(money(123405n)).toBe("1234.05");
    expect(() => walkCost(-1)).toThrow(/negative/);
  });
});
