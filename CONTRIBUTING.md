# Contributing

Issues and pull requests are welcome.

- `npm ci`, then `npm run typecheck && npm run lint && npm run format && npm test` must
  pass. Coverage of `src/` below 100% fails the run. TypeScript is strict, with
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Queries live in `sql/` as plain SQL files so they can be read and run on their own in
  DuckDB. The one runtime dependency is `@duckdb/node-api`.
- Money is whole centavos in `bigint`. Label any rate that is not measured as illustrative.
- A change to the distance model, the classes or the assignment comes with a hand-checked
  case in `docs/derivation.md` and a test. Figures are drawn by `scripts/figures.ts`; re-run
  `npm run figures` and commit the SVGs when the numbers move.
