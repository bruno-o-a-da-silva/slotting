# Derivation and hand-checked cases

Every case below is also a test. Distances are in metres.

## Walking distance

Aisle `a` (0 at the dock), bay `b` (0 nearest the cross aisle), aisle pitch `p`, bay width
`w`, front gap `f`:

```
d(a, b) = a * p + f + (b + 0.5) * w
```

A line costs one round trip, `2 d`. A SKU with `n` picks a day in a slot at `d` costs `2 n d`
metres a day, and the map costs the sum over SKUs.

**Case 1** (`tests/layout.test.ts`). Default layout, `p = 3`, `w = 1.2`, `f = 2`, aisle 2,
bay 3: `2 x 3 + 2 + 3.5 x 1.2 = 6 + 2 + 4.2 = 12.2 m`.

## ABC classes

Sort SKUs by picks, largest first. Let `c` be the running total including the SKU and `T`
the grand total. The SKU is A if `c - picks < a T`, B if `c - picks < b T`, else C. Using the
share before the SKU means the SKU that crosses the cut is still counted in the class below
it, so A always reaches at least `a` of the picks.

**Case 2** (`tests/db.test.ts`). Picks 6, 2, 1, 1, so `T = 10`, cuts `a = 0.8`, `b = 0.9`.
Shares before each SKU: 0, 0.6, 0.8, 0.9. Classes: A (0 < 0.8), A (0.6 < 0.8), B
(0.8 is not < 0.8, but < 0.9), C (0.9 is not < 0.9).

## Assignment

For picks `n1 >= n2 >= ...` and distances `d1 <= d2 <= ...`, the rearrangement inequality
says the sum of `n_i d_s(i)` over a permutation `s` is smallest when `s` is the identity.
So busiest SKU to nearest slot is optimal for round-trip walking, with no search.

**Case 3** (`tests/plan.test.ts`). Picks 6, 3, 1 into slots at 2, 5 and 9 m:
`2 x (6 x 2 + 3 x 5 + 1 x 9) = 2 x 36 = 72 m`. The reverse order gives
`2 x (1 x 2 + 3 x 5 + 6 x 9) = 2 x 71 = 142 m`. The test also tries all 24 orders of four
SKUs in four slots and none beats the plan.

## Cost

Speed `v` in decimetres per second, wage `W` in centavos per hour, distance rounded to whole
decimetres `D`:

```
hours    = D / (v x 3600)
centavos = D x W / (v x 3600), rounded half up once
```

**Case 4** (`tests/cost.test.ts`). 11,520 m = 115,200 dm at 8 dm/s is 14,400 s = 4.00 h.
At 2,500 centavos an hour: `115,200 x 2,500 / 28,800 = 10,000` centavos = 100.00 BRL.
Rounding: 14.4 m gives `144 x 2,500 / 28,800 = 12.5` centavos, which rounds up to 0.13;
14.3 m gives 12.41, which rounds to 0.12.

## Moving only the top k

Take the k nearest slots of the current map. Each of the k busiest SKUs moves into one of
them, in order. A SKU already sitting in one of those slots and not in the top k is pushed
out to a slot freed by a top SKU; the busiest pushed-out SKU gets the nearest freed slot.

**Case 5** (`tests/plan.test.ts`). Slots a (2 m), b (5 m), c (9 m), d (9 m); x in d, y in a,
z in b, w in c; ranking x, y, z, w.

- k = 0: nothing changes, 0 moves.
- k = 4: x a, y b, z c, w d, the full plan.
- k = 1: x takes a, y is pushed out of a into d, x's old slot. 2 moves.

## Slot map check

**Case 6** (`tests/editor.test.ts`). One aisle, 2 bays, `p = 3`, `w = 1`, `f = 1`: bay 0 is
at 1.5 m and bay 1 at 2.5 m. Today: 10 picks/day at 2.5 m, 1 at 1.5 m, 2 at 2.5 m:
`2 x (25 + 1.5 + 5) = 63 m`, shown as 0.06 km. The plan puts 10 and 2 at 1.5 m and 1 at
2.5 m: `2 x (15 + 3 + 2.5) = 41 m`, shown as 0.04 km.
