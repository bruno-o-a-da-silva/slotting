#!/usr/bin/env node
/** Command line: `demo` on synthetic data, `plan` on your own order lines CSV. */

import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { readMap, writeLines, writeMap } from "./csv.js";
import { insertLines, loadCsv } from "./db.js";
import { DEFAULT_LAYOUT, checkLayout, slots, type Layout } from "./layout.js";
import { format, mapData, run, type Analysis } from "./report.js";
import * as synthetic from "./synthetic.js";

export const USAGE = `usage:
  slotting demo [--seed 7] [--write DIR] [--json FILE]
  slotting plan LINES.csv [--current MAP.csv] [--out plan.csv] [--json FILE]
options: --aisles 10 --bays 20 --a 0.8 --b 0.95`;

const num = (v: string | undefined, name: string, fallback: number): number => {
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name} needs a number`);
  return n;
};

/** Run one command; returns what it prints. */
export async function main(argv: readonly string[]): Promise<string> {
  const { values: o, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      seed: { type: "string" },
      write: { type: "string" },
      json: { type: "string" },
      current: { type: "string" },
      out: { type: "string" },
      aisles: { type: "string" },
      bays: { type: "string" },
      a: { type: "string" },
      b: { type: "string" },
    },
  });
  const [cmd, file] = positionals;
  const layout: Layout = checkLayout({
    ...DEFAULT_LAYOUT,
    aisles: num(o.aisles, "aisles", DEFAULT_LAYOUT.aisles),
    bays: num(o.bays, "bays", DEFAULT_LAYOUT.bays),
  });
  const cuts: [number, number] = [num(o.a, "a", 0.8), num(o.b, "b", 0.95)];
  const all = slots(layout);
  let result: Analysis;
  if (cmd === "demo") {
    const seed = num(o.seed, "seed", 7);
    const n = Math.min(400, all.length);
    const rows = synthetic.lines(seed, n);
    const cur = synthetic.current(seed, all, n);
    result = await run((c) => insertLines(c, rows), layout, cur, cuts);
    if (o.write !== undefined) {
      mkdirSync(o.write, { recursive: true });
      writeLines(join(o.write, "lines.csv"), rows);
      writeMap(join(o.write, "current.csv"), cur);
      writeMap(join(o.write, "plan.csv"), result.plan, result.velocity);
    }
  } else if (cmd === "plan" && file !== undefined) {
    const cur = o.current === undefined ? undefined : readMap(o.current, all);
    result = await run((c) => loadCsv(c, file), layout, cur, cuts);
    writeMap(o.out ?? "plan.csv", result.plan, result.velocity);
  } else {
    throw new Error(
      cmd === "plan" ? "plan needs a CSV of order lines" : `unknown command ${cmd ?? ""}`,
    );
  }
  if (o.json !== undefined) {
    mkdirSync(dirname(o.json), { recursive: true });
    writeFileSync(o.json, JSON.stringify(mapData(result, layout)));
  }
  return format(result);
}

/** True when this file is the script node was started with. */
export function isEntry(url: string, argv1: string | undefined): boolean {
  return argv1 !== undefined && realpathSync(argv1) === realpathSync(fileURLToPath(url));
}

/* v8 ignore start: process glue, exercised by the CI demo step */
if (isEntry(import.meta.url, process.argv[1])) {
  main(process.argv.slice(2)).then(
    (text) => process.stdout.write(text),
    (e: unknown) => {
      process.stderr.write(`slotting: ${e instanceof Error ? e.message : String(e)}\n\n${USAGE}\n`);
      process.exitCode = 2;
    },
  );
}
/* v8 ignore stop */
