# aacalc2

Axis & Allies 1942 Online probability calculator — a math-based battle odds library.

## Commands

| Command                 | Action                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run build`         | `tsc` — compile src/ → dist/                                         |
| `npm run test`          | `vitest run`                                                         |
| `npm run dev`           | `vitest` (watch mode)                                                |
| `npm run format`        | `prettier --write .`                                                 |
| `npm run check-format`  | `prettier --check .`                                                 |
| `npm run check-exports` | `attw --pack . --ignore-rules=cjs-resolves-to-esm`                   |
| `npm run ci`            | `build && check-format && check-exports && test` — **order matters** |
| `npm run copy`          | Regenerates `solveone1.ts`–`solveone4.ts` from `solveone.ts`         |

## Architecture

- **Root library** (`src/`): TypeScript, ESM, builds to `dist/`. Entrypoint `src/index.ts` exports from `external.ts` and `optimize.ts`. Published to npm via changesets.
- **Frontend** (`frontend/`): Separate React + Vite + TypeScript app. Depends on `aacalc2` as a library. Deployed to GitHub Pages at `/aacalc2/` base path.
- **Landing page** (`index.html`): Static page linking to the frontend.

## Generated code

`solveone1.ts`–`solveone4.ts` are **generated** from `solveone.ts` by `scripts/copy.sh`. If you edit `solveone.ts`, run `npm run copy` to regenerate. These are performance duplications of `solve_one_general_state` with renamed function names.

## Tests

- `src/external.test.ts` — focused unit tests with `toCloseTo` assertions
- `src/main.test.ts` — large snapshot-based regression tests
- Snapshot file: `src/__snapshots__/main.test.ts.snap`
- `test/` directory contains legacy scripts (not part of `vitest`)

## Frontend dev

1. `npm run build` in root (builds library to `dist/`)
2. Set `LOCAL_ENGINE=true` env var, then `npm run dev` in `frontend/`

## Publishing

Uses [changesets](https://github.com/changesets/changesets). `npm run local-release` runs `changeset version && changeset publish`. `prepublishOnly` runs the full CI pipeline.

## Unit system

Internally units are single-character codes (`i`=inf, `a`=art, `f`=fig, `b`=bom, `c`=aa, `S`=sub, `D`=des, etc.). Mapping lives in `src/external.ts` (`UnitIdentifier2UnitMap`, `Unit2ExternalNameMap`).
