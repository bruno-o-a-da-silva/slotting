/** Draw docs/img/hero.svg, pareto.svg and topk.svg from the seed 7 demo. Run: npm run figures */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { insertLines, root } from "../src/db.js";
import { DEFAULT_LAYOUT, slots, type Slot } from "../src/layout.js";
import { reslotTop, travelM, type Placement } from "../src/plan.js";
import { run } from "../src/report.js";
import * as synthetic from "../src/synthetic.js";

const INK = "#111111";
const GOLD = "#D4AF37";
const PAPER = "#F5F2E8";
const DIM = "#7D6A2A";
const GREY = "#444444";
const FONT = `font-family="Helvetica, Arial, sans-serif"`;

const svg = (w: number, h: number, body: string[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
  `<rect width="${w}" height="${h}" fill="${INK}"/>\n${body.join("\n")}\n</svg>\n`;
const text = (x: number, y: number, s: string, size = 14, fill = PAPER, anchor = "start") =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, stroke = GREY, w = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`;
const path = (pts: [number, number][], stroke: string, w = 2.5) =>
  `<polyline fill="none" stroke="${stroke}" stroke-width="${w}" points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}"/>`;

const seed = 7;
const all = slots(DEFAULT_LAYOUT);
const rows = synthetic.lines(seed);
const today = synthetic.current(seed, all);
const a = await run((c) => insertLines(c, rows), DEFAULT_LAYOUT, today);
const cls = new Map(a.velocity.map((v) => [v.sku, v.cls]));
const picks = new Map(a.velocity.map((v) => [v.sku, v.picks / a.days]));
const ranked = a.velocity.map((v) => v.sku);
const out = join(root(), "docs", "img");
mkdirSync(out, { recursive: true });

function map(p: Placement, x0: number, y0: number, cell: number): string[] {
  const at = new Map<string, string>();
  for (const [sku, s] of p) at.set(s.id, sku);
  const fill = (s: Slot) => {
    const c = cls.get(at.get(s.id) ?? "");
    return c === "A" ? GOLD : c === "B" ? DIM : GREY;
  };
  return all.map((s) => {
    const x = x0 + s.aisle * (2 * cell + 8) + (s.side === "R" ? cell : 0);
    const y = y0 + (DEFAULT_LAYOUT.bays - 1 - s.bay) * cell;
    return `<rect x="${x}" y="${y}" width="${cell - 1.5}" height="${cell - 1.5}" fill="${fill(s)}"/>`;
  });
}

const row = (label: string) => a.rows.find((r) => r.label === label);
const t = row("today");
const pl = row("plan");
const hero = [
  text(40, 52, "slotting", 34, GOLD),
  text(40, 80, "Busiest SKUs into the nearest slots. Synthetic data, seed 7.", 16),
  ...map(today, 40, 120, 14),
  ...map(a.plan, 460, 120, 14),
  text(40, 425, `Today: ${t?.kmPerDay.toFixed(1) ?? ""} km walked a day`, 16),
  text(460, 425, `Plan: ${pl?.kmPerDay.toFixed(1) ?? ""} km a day`, 16, GOLD),
  text(40, 450, "Dock at bottom left. Gold A, dim gold B, grey C.", 13, "#B8B3A6"),
];
writeFileSync(join(out, "hero.svg"), svg(880, 480, hero));

// Pareto of picks with the A and B cuts.
const W = 720;
const H = 420;
const [L, R, T, B] = [70, 30, 50, 60];
const px = (f: number) => L + f * (W - L - R);
const py = (f: number) => H - B - f * (H - T - B);
const n = a.velocity.length;
const pareto = [
  text(L, 30, "Share of picks covered by the busiest SKUs", 18, PAPER),
  line(L, py(0), px(1), py(0), PAPER),
  line(L, py(0), L, py(1), PAPER),
  ...[0.8, 0.95].map((c) => line(L, py(c), px(1), py(c), GREY)),
  text(px(1), py(0.8) - 6, "80%", 12, PAPER, "end"),
  text(px(1), py(0.95) - 6, "95%", 12, PAPER, "end"),
  path(
    a.velocity.map((v, i) => [px((i + 1) / n), py(v.share)]),
    GOLD,
  ),
  line(px(a.counts.A / n), py(0), px(a.counts.A / n), py(1), DIM),
  text(px(a.counts.A / n) + 6, py(0.1), `${a.counts.A} A SKUs`, 13, GOLD),
  text((L + W - R) / 2, H - 20, `SKU rank (of ${n})`, 13, PAPER, "middle"),
  text(L - 10, py(1) + 4, "100%", 12, PAPER, "end"),
  text(L - 10, py(0) + 4, "0", 12, PAPER, "end"),
];
writeFileSync(join(out, "pareto.svg"), svg(W, H, pareto));

// Walking left as the k busiest SKUs are moved, k = 0..400.
const ks = Array.from({ length: n / 5 + 1 }, (_, i) => i * 5);
const km = ks.map((k) => travelM(picks, reslotTop(today, ranked, k).placement) / 1000);
const top = Math.ceil(Math.max(...km) / 10) * 10;
const best = travelM(picks, a.plan) / 1000;
const topk = [
  text(L, 30, "Walking per day after moving only the k busiest SKUs", 18, PAPER),
  line(L, py(0), px(1), py(0), PAPER),
  line(L, py(0), L, py(1), PAPER),
  line(L, py(best / top), px(1), py(best / top), DIM),
  text(px(1), py(best / top) - 6, `full plan ${best.toFixed(1)} km`, 12, GOLD, "end"),
  path(
    ks.map((k, i) => [px(k / n), py((km[i] as number) / top)]),
    GOLD,
  ),
  line(px(a.counts.A / n), py(0), px(a.counts.A / n), py(1), GREY),
  text(px(a.counts.A / n) + 6, py(0.95), `k = ${a.counts.A} (all A)`, 13, PAPER),
  text((L + W - R) / 2, H - 20, "k, SKUs moved", 13, PAPER, "middle"),
  text(L - 10, py(1) + 4, `${top} km`, 12, PAPER, "end"),
  text(L - 10, py(0) + 4, "0", 12, PAPER, "end"),
];
writeFileSync(join(out, "topk.svg"), svg(W, H, topk));
process.stdout.write(`wrote hero.svg, pareto.svg, topk.svg to ${out}\n`);
