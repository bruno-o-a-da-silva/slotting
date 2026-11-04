/** DuckDB in memory: load order lines, then the ABC and velocity queries in sql/. */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";

export interface Line {
  day: string;
  order: string;
  sku: string;
  qty: number;
}

export type AbcClass = "A" | "B" | "C";

export interface Velocity {
  sku: string;
  picks: number;
  units: number;
  share: number;
  cls: AbcClass;
}

/** The repository root, found by walking up to package.json from this file. */
export function root(from: string = dirname(fileURLToPath(import.meta.url))): string {
  let dir = from;
  while (!existsSync(join(dir, "package.json"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error(`no package.json above ${from}`);
    dir = up;
  }
  return dir;
}

export function sql(name: string): string {
  return readFileSync(join(root(), "sql", name), "utf8");
}

/** Open an in-memory database, run `fn`, and always close the connection and database. */
export async function withDb<T>(fn: (c: DuckDBConnection) => Promise<T>): Promise<T> {
  const db = await DuckDBInstance.create(":memory:");
  const c = await db.connect();
  try {
    await c.run(sql("schema.sql"));
    return await fn(c);
  } finally {
    c.closeSync();
    db.closeSync();
  }
}

export async function insertLines(c: DuckDBConnection, rows: readonly Line[]): Promise<void> {
  const ap = await c.createAppender("lines");
  try {
    for (const r of rows) {
      ap.appendVarchar(r.day);
      ap.appendVarchar(r.order);
      ap.appendVarchar(r.sku);
      ap.appendInteger(r.qty);
      ap.endRow();
    }
    ap.flushSync();
  } finally {
    ap.closeSync();
  }
}

export async function loadCsv(c: DuckDBConnection, path: string): Promise<void> {
  await c.run(sql("load_csv.sql"), { path });
}

export async function lineCount(c: DuckDBConnection): Promise<number> {
  const r = await c.runAndReadAll("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lines");
  return r.getRowObjectsJS()[0]?.n as number;
}

/** Velocity and ABC class per SKU, busiest first, and the number of days in the data. */
export async function analyse(
  c: DuckDBConnection,
  a = 0.8,
  b = 0.95,
): Promise<{ velocity: Velocity[]; days: number }> {
  if (!(0 < a && a <= b && b <= 1)) throw new Error("ABC cuts need 0 < a <= b <= 1");
  const rows = (await c.runAndReadAll(sql("abc.sql"), { a, b })).getRowObjectsJS();
  const velocity = rows.map((r) => ({
    sku: r.sku as string,
    picks: r.picks as number,
    units: r.units as number,
    share: r.share as number,
    cls: r.class as AbcClass,
  }));
  const days = (await c.runAndReadAll(sql("days.sql"))).getRowObjectsJS()[0]?.days as number;
  return { velocity, days };
}
