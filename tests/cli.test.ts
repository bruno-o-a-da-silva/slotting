import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isEntry, main } from "../src/cli.js";
import type { MapData } from "../src/report.js";

const tmp = () => mkdtempSync(join(tmpdir(), "slotting-"));

describe("cli", () => {
  it("runs the demo and writes its files", async () => {
    const dir = tmp();
    const out = await main([
      "demo",
      "--seed",
      "7",
      "--write",
      dir,
      "--json",
      join(dir, "web", "m.json"),
    ]);
    expect(out).toMatch(/SKUs, 20 days/);
    expect(out).toMatch(/today:.*\n.*A only:.*moves\n.*plan:/);
    for (const f of ["lines.csv", "current.csv", "plan.csv"])
      expect(existsSync(join(dir, f))).toBe(true);
    const data = JSON.parse(readFileSync(join(dir, "web", "m.json"), "utf8")) as MapData;
    expect(Object.keys(data.plan)).toHaveLength(400);
  });

  it("plans from the demo's own CSVs and matches the demo", async () => {
    const dir = tmp();
    const demo = await main(["demo", "--write", dir]);
    const out = await main([
      "plan",
      join(dir, "lines.csv"),
      "--current",
      join(dir, "current.csv"),
      "--out",
      join(dir, "p.csv"),
    ]);
    expect(out).toBe(demo);
    expect(readFileSync(join(dir, "p.csv"), "utf8")).toBe(
      readFileSync(join(dir, "plan.csv"), "utf8"),
    );
  });

  it("plans without a current map, with smaller layouts and other cuts", async () => {
    const dir = tmp();
    await main(["demo", "--write", dir]);
    const p = join(dir, "x.csv");
    const out = await main([
      "plan",
      join(dir, "lines.csv"),
      "--out",
      p,
      "--a",
      "0.5",
      "--b",
      "0.6",
      "--json",
      join(dir, "j.json"),
    ]);
    expect(out).not.toMatch(/today/);
    const data = JSON.parse(readFileSync(join(dir, "j.json"), "utf8")) as MapData;
    expect(data.current).toEqual(data.plan);
    const small = await main(["demo", "--aisles", "2", "--bays", "5"]);
    expect(small).toMatch(/20 SKUs/);
  });

  it("writes plan.csv in the working directory by default", async () => {
    const dir = tmp();
    await main(["demo", "--write", dir]);
    const here = process.cwd();
    process.chdir(dir);
    try {
      await main(["plan", "lines.csv"]);
    } finally {
      process.chdir(here);
    }
    expect(readFileSync(join(dir, "plan.csv"), "utf8")).toMatch(
      /^sku,slot,distance_m,class,picks\n/,
    );
  });

  it("explains mistakes", async () => {
    const dir = tmp();
    await expect(main([])).rejects.toThrow(/unknown command/);
    await expect(main(["plan"])).rejects.toThrow(/needs a CSV/);
    await expect(main(["demo", "--seed", "x"])).rejects.toThrow(/--seed needs a number/);
    const bad = join(dir, "bad.csv");
    writeFileSync(bad, "sku,where\nA,1\n");
    await expect(main(["plan", bad, "--current", bad])).rejects.toThrow(/sku and slot/);
    writeFileSync(bad, "sku,slot\nA,99-99-L\n");
    await expect(main(["plan", bad, "--current", bad])).rejects.toThrow(/not in the layout/);
    const ls = join(dir, "l.csv");
    writeFileSync(ls, "day,order,sku,qty\nD1,o1,A,1\nD1,o1,B,1\n");
    writeFileSync(bad, "sku,slot\nA,00-00-L\n");
    await expect(main(["plan", ls, "--current", bad, "--out", join(dir, "o.csv")])).rejects.toThrow(
      /not in the current map: B/,
    );
  });

  it("knows when it is the entry script", () => {
    const self = fileURLToPath(import.meta.url);
    expect(isEntry(import.meta.url, self)).toBe(true);
    expect(isEntry(import.meta.url, undefined)).toBe(false);
  });
});
