import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyse, insertLines, lineCount, loadCsv, root, withDb } from "../src/db.js";

const line = (order: string, sku: string) => ({ day: "D1", order, sku, qty: 2 });

describe("db", () => {
  it("classes by the share before each SKU (hand case 2)", async () => {
    // picks 6, 2, 1, 1 of 10: shares before are 0, 0.6, 0.8, 0.9
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => line(`o${i}`, "S1")),
      line("o0", "S2"),
      line("o1", "S2"),
      line("o2", "S3"),
      { ...line("o3", "S4"), day: "D2" },
    ];
    const r = await withDb(async (c) => {
      await insertLines(c, rows);
      return { ...(await analyse(c, 0.8, 0.9)), n: await lineCount(c) };
    });
    expect(r.velocity.map((v) => v.cls)).toEqual(["A", "A", "B", "C"]);
    expect(r.velocity[0]).toEqual({ sku: "S1", picks: 6, units: 12, share: 0.6, cls: "A" });
    expect(r.days).toBe(2);
    expect(r.n).toBe(10);
  });

  it("reads a CSV and rejects bad cuts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "slotting-"));
    const path = join(dir, "l.csv");
    writeFileSync(path, "day,order,sku,qty\nD1,o1,A,1\nD1,o2,A,3\n");
    const v = await withDb(async (c) => {
      await loadCsv(c, path);
      return (await analyse(c)).velocity;
    });
    expect(v).toEqual([{ sku: "A", picks: 2, units: 4, share: 1, cls: "A" }]);
    await expect(withDb((c) => analyse(c, 0.9, 0.8))).rejects.toThrow(/cuts/);
  });

  it("finds the repository root or says why not", () => {
    expect(root(join(root(), "src"))).toBe(root());
    expect(() => root("/")).toThrow(/no package.json/);
  });
});
