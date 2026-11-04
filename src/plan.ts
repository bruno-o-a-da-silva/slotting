/** Slot plan: fastest movers into the nearest slots, and the walking it saves. */

import type { Slot } from "./layout.js";

export type Placement = Map<string, Slot>;

export function nearestFirst(slots: readonly Slot[]): Slot[] {
  return [...slots].sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

/**
 * Pair the i-th busiest SKU with the i-th nearest slot. For single-line trips walking is the
 * sum of picks x 2 x distance, and pairing the largest picks with the smallest distances
 * minimises that sum (rearrangement inequality).
 */
export function assign(ranked: readonly string[], slots: readonly Slot[]): Placement {
  if (ranked.length > slots.length) {
    throw new Error(`${ranked.length} SKUs but only ${slots.length} slots`);
  }
  const near = nearestFirst(slots);
  return new Map(ranked.map((sku, i) => [sku, near[i] as Slot]));
}

/** Metres walked when every line is a round trip from the dock to its slot. */
export function travelM(picks: ReadonlyMap<string, number>, placement: Placement): number {
  let m = 0;
  for (const [sku, n] of picks) {
    const slot = placement.get(sku);
    if (slot === undefined) throw new Error(`SKU ${sku} has picks but no slot`);
    m += 2 * slot.distance * n;
  }
  return m;
}

/**
 * Move only the k busiest SKUs into the k nearest slots of the current map. A SKU already
 * in one of those slots takes a slot one of the k left: busiest displaced SKU to the nearest
 * freed slot, so the result does not depend on the order of the map. Returns the new map and
 * how many SKUs physically moved.
 */
export function reslotTop(
  current: Placement,
  ranked: readonly string[],
  k: number,
): { placement: Placement; moves: number } {
  const best = nearestFirst([...current.values()]).slice(0, k);
  const bestIds = new Set(best.map((s) => s.id));
  const top = ranked.slice(0, k);
  const topSet = new Set(top);
  const freed = nearestFirst(
    top.map((s) => current.get(s) as Slot).filter((s) => !bestIds.has(s.id)),
  );
  const rank = new Map(ranked.map((s, i) => [s, i]));
  const displaced = [...current]
    .filter(([sku, slot]) => !topSet.has(sku) && bestIds.has(slot.id))
    .map(([sku]) => sku)
    .sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || a.localeCompare(b));
  const next: Placement = new Map(current);
  top.forEach((sku, i) => next.set(sku, best[i] as Slot));
  displaced.forEach((sku, i) => next.set(sku, freed[i] as Slot));
  let moves = 0;
  for (const [sku, slot] of next) if (current.get(sku)?.id !== slot.id) moves++;
  return { placement: next, moves };
}

/** Swap the contents of two slots; either may be empty. Used by the slot-map editor. */
export function swap(placement: Placement, a: Slot, b: Slot): Placement {
  const next: Placement = new Map(placement);
  for (const [sku, slot] of placement) {
    if (slot.id === a.id) next.set(sku, b);
    else if (slot.id === b.id) next.set(sku, a);
  }
  return next;
}
