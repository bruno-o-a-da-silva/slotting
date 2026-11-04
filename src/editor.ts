/**
 * Browser slot map. Each cell is a slot coloured by the ABC class of what sits in it. Drag a
 * cell onto another, or click two cells, to swap them; walking and cost update at once.
 */

import { walkCost } from "./cost.js";
import { slots, type Slot } from "./layout.js";
import { reslotTop, swap, travelM, type Placement } from "./plan.js";
import type { MapData } from "./report.js";

export interface Editor {
  placement(): Placement;
  /** Metres walked per day with the map as it stands. */
  metres(): number;
  swapIds(a: string, b: string): void;
  show(which: "today" | "a" | "plan"): void;
}

function toPlacement(ids: Record<string, string>, byId: Map<string, Slot>): Placement {
  return new Map(Object.entries(ids).map(([sku, id]) => [sku, byId.get(id) as Slot]));
}

export function mount(root: HTMLElement, data: MapData): Editor {
  const doc = root.ownerDocument;
  const all = slots(data.layout);
  const byId = new Map(all.map((s) => [s.id, s]));
  const info = new Map(data.skus.map((s) => [s.sku, s]));
  const picks = new Map(data.skus.map((s) => [s.sku, s.perDay]));
  const today = toPlacement(data.current, byId);
  const ranked = data.skus.map((s) => s.sku);
  const aCount = data.skus.filter((s) => s.cls === "A").length;
  const presets = {
    today,
    a: reslotTop(today, ranked, aCount).placement,
    plan: toPlacement(data.plan, byId),
  };
  let placement = today;
  let picked: string | undefined;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") => {
    const e = doc.createElement(tag);
    e.className = cls;
    e.textContent = text;
    return e;
  };

  root.replaceChildren();
  const stats = el("p", "stats");
  const bar = el("div", "bar");
  for (const [key, label] of [
    ["today", "Today"],
    ["a", "Move A only"],
    ["plan", "Full plan"],
  ] as const) {
    const btn = el("button", "preset", label);
    btn.dataset.preset = key;
    btn.addEventListener("click", () => {
      editor.show(key);
    });
    bar.append(btn);
  }
  const grid = el("div", "grid");
  grid.style.gridTemplateColumns = `repeat(${data.layout.aisles * 2}, 1fr)`;
  const cells = new Map<string, HTMLElement>();
  for (let bay = data.layout.bays - 1; bay >= 0; bay--) {
    for (const s of all.filter((x) => x.bay === bay)) {
      const cell = el("div", "slot");
      cell.dataset.slot = s.id;
      cell.draggable = true;
      cell.addEventListener("dragstart", (e) => e.dataTransfer?.setData("text/plain", s.id));
      cell.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      cell.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = e.dataTransfer?.getData("text/plain");
        if (from) editor.swapIds(from, s.id);
      });
      cell.addEventListener("click", () => {
        if (picked === undefined) {
          picked = s.id;
          cell.classList.add("picked");
        } else {
          const from = picked;
          picked = undefined;
          editor.swapIds(from, s.id);
        }
      });
      cells.set(s.id, cell);
      grid.append(cell);
    }
  }
  root.append(stats, bar, grid);

  const draw = () => {
    const at = new Map([...placement].map(([sku, s]) => [s.id, sku]));
    for (const [id, cell] of cells) {
      const sku = at.get(id);
      const v = sku === undefined ? undefined : info.get(sku);
      cell.className = `slot cls-${v?.cls ?? (sku === undefined ? "empty" : "C")}`;
      cell.title =
        sku === undefined ? `${id} empty` : `${id} ${sku} ${(v?.perDay ?? 0).toFixed(1)} picks/day`;
    }
    const m = editor.metres();
    const { hours, brl } = walkCost(m);
    const best = travelM(picks, presets.plan);
    stats.textContent = `${(m / 1000).toFixed(2)} km/day, ${hours} h, ${brl} BRL per day (plan: ${(best / 1000).toFixed(2)} km)`;
  };

  const editor: Editor = {
    placement: () => placement,
    metres: () => travelM(picks, placement),
    swapIds(a, b) {
      const sa = byId.get(a);
      const sb = byId.get(b);
      if (sa === undefined || sb === undefined) throw new Error(`no slot ${sa ? b : a}`);
      placement = swap(placement, sa, sb);
      draw();
    },
    show(which) {
      placement = presets[which];
      picked = undefined;
      draw();
    },
  };
  draw();
  return editor;
}
