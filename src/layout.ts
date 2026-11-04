/** Warehouse grid: parallel aisles off one front cross aisle, dock at the front left corner. */

export interface Slot {
  id: string;
  aisle: number;
  bay: number;
  side: "L" | "R";
  /** One-way walk from the dock, metres. */
  distance: number;
}

export interface Layout {
  aisles: number;
  bays: number;
  /** Metres between aisle centre lines. */
  aislePitch: number;
  /** Metres of aisle per bay. */
  bayWidth: number;
  /** Metres from the dock to the first bay along any aisle. */
  front: number;
}

export const DEFAULT_LAYOUT: Layout = {
  aisles: 10,
  bays: 20,
  aislePitch: 3,
  bayWidth: 1.2,
  front: 2,
};

export function checkLayout(l: Layout): Layout {
  if (!Number.isInteger(l.aisles) || !Number.isInteger(l.bays) || l.aisles < 1 || l.bays < 1) {
    throw new Error("layout needs a whole number of aisles and bays, at least one each");
  }
  if (l.aislePitch <= 0 || l.bayWidth <= 0 || l.front < 0) {
    throw new Error("aisle pitch and bay width must be positive, front cannot be negative");
  }
  return l;
}

/** Walk along the cross aisle to the aisle, then down it to the middle of the bay. */
export function distance(l: Layout, aisle: number, bay: number): number {
  return aisle * l.aislePitch + l.front + (bay + 0.5) * l.bayWidth;
}

export function slotId(aisle: number, bay: number, side: "L" | "R"): string {
  return `${String(aisle).padStart(2, "0")}-${String(bay).padStart(2, "0")}-${side}`;
}

export function slots(l: Layout): Slot[] {
  checkLayout(l);
  const out: Slot[] = [];
  for (let aisle = 0; aisle < l.aisles; aisle++) {
    for (let bay = 0; bay < l.bays; bay++) {
      for (const side of ["L", "R"] as const) {
        out.push({
          id: slotId(aisle, bay, side),
          aisle,
          bay,
          side,
          distance: distance(l, aisle, bay),
        });
      }
    }
  }
  return out;
}
