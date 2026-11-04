// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { mount } from "../src/editor.js";
import type { MapData } from "../src/report.js";

const data: MapData = {
  layout: { aisles: 1, bays: 2, aislePitch: 3, bayWidth: 1, front: 1 },
  skus: [
    { sku: "fast", perDay: 10, cls: "A" },
    { sku: "slow", perDay: 1, cls: "C" },
    { sku: "mid", perDay: 2, cls: "B" },
  ],
  // slot distances: bay 0 = 1.5 m, bay 1 = 2.5 m
  current: { fast: "00-01-L", slow: "00-00-L", mid: "00-01-R", ghost: "00-00-R" },
  plan: { fast: "00-00-L", mid: "00-00-R", slow: "00-01-L" },
};

const setup = () => {
  const root = document.createElement("div");
  document.body.append(root);
  return {
    root,
    ed: mount(root, data),
    cell: (id: string) => root.querySelector(`[data-slot="${id}"]`) as HTMLElement,
  };
};

describe("editor", () => {
  it("draws the map coloured by class with today's walking", () => {
    const { root, ed, cell } = setup();
    expect(root.querySelectorAll(".slot")).toHaveLength(4);
    expect(cell("00-01-L").className).toBe("slot cls-A");
    expect(cell("00-00-R").className).toBe("slot cls-C"); // a SKU with no picks
    expect(cell("00-01-L").title).toBe("00-01-L fast 10.0 picks/day");
    expect(ed.metres()).toBeCloseTo(2 * (10 * 2.5 + 1 * 1.5 + 2 * 2.5), 9);
    expect(root.querySelector(".stats")?.textContent).toMatch(/^0\.06 km\/day.*plan: 0\.04 km/);
  });

  it("swaps by two clicks and by drag and drop", () => {
    const { ed, cell } = setup();
    cell("00-01-L").click();
    expect(cell("00-01-L").classList.contains("picked")).toBe(true);
    cell("00-00-L").click();
    expect(ed.placement().get("fast")?.id).toBe("00-00-L");
    const dt = new DataTransfer();
    cell("00-00-L").dispatchEvent(Object.assign(new Event("dragstart"), { dataTransfer: dt }));
    const over = new Event("dragover", { cancelable: true });
    cell("00-01-L").dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    cell("00-01-L").dispatchEvent(
      Object.assign(new Event("drop", { cancelable: true }), { dataTransfer: dt }),
    );
    expect(ed.placement().get("fast")?.id).toBe("00-01-L");
    cell("00-01-L").dispatchEvent(new Event("drop")); // no payload: nothing happens
    cell("00-01-L").dispatchEvent(new Event("dragstart"));
    expect(ed.placement().get("fast")?.id).toBe("00-01-L");
  });

  it("shows the presets and leaves empty slots dark", () => {
    const { root, ed, cell } = setup();
    (root.querySelector('[data-preset="plan"]') as HTMLElement).click();
    expect(ed.placement().get("fast")?.id).toBe("00-00-L");
    expect(cell("00-01-R").className).toBe("slot cls-empty");
    expect(cell("00-01-R").title).toBe("00-01-R empty");
    (root.querySelector('[data-preset="a"]') as HTMLElement).click();
    expect(ed.placement().get("fast")?.id).toBe("00-00-L");
    expect(ed.placement().get("slow")?.id).toBe("00-01-L");
    ed.show("today");
    expect(ed.placement().get("fast")?.id).toBe("00-01-L");
    expect(() => {
      ed.swapIds("nope", "00-00-L");
    }).toThrow(/no slot nope/);
    expect(() => {
      ed.swapIds("00-00-L", "nope");
    }).toThrow(/no slot nope/);
  });
});
