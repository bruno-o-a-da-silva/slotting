/**
 * Picker time and labour cost of the walking. Rates are illustrative. Money is kept as a
 * whole number of centavos in bigint and rounded half up once, so there is no float error.
 */

export interface Terms {
  /** Walking speed in decimetres per second (8 = 0.8 m/s, with a cart). */
  speedDmS: bigint;
  /** Loaded wage in centavos per picker hour (2500 = 25.00 BRL). */
  wageCents: bigint;
}

export const TERMS: Terms = { speedDmS: 8n, wageCents: 2500n };

/** num / den rounded half up, both non-negative. */
function roundDiv(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

export function money(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

/** Hours walked (two decimals, as text) and their cost in BRL (as text). */
export function walkCost(metres: number, terms: Terms = TERMS): { hours: string; brl: string } {
  if (metres < 0) throw new Error("metres cannot be negative");
  const dm = BigInt(Math.round(metres * 10));
  const secondsDen = terms.speedDmS * 3600n; // hours = dm / (speed * 3600)
  return {
    hours: money(roundDiv(dm * 100n, secondsDen)),
    brl: money(roundDiv(dm * terms.wageCents, secondsDen)),
  };
}
