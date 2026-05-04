# aacalc2

Axis & Allies 1942 Online probability calculator — a math-based battle odds library.

## Commands

| Command                 | Action                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run build`         | `tsc` — compile `src/` → `dist/`                                     |
| `npm run test`          | `vitest run`                                                         |
| `npm run dev`           | `vitest` (watch mode)                                                |
| `npm run format`        | `prettier --write .`                                                 |
| `npm run check-format`  | `prettier --check .`                                                 |
| `npm run check-exports` | `attw --pack . --ignore-rules=cjs-resolves-to-esm`                   |
| `npm run ci`            | `build && check-format && check-exports && test` — **order matters** |
| `npm run copy`          | Regenerates `solveone1.ts`–`solveone4.ts` from `solveone.ts`         |

`npm run ci` **order matters** — `check-exports` requires `dist/` from the build step.

## Architecture

- **Root library** (`src/`): TypeScript, ESM, builds to `dist/`. Entrypoint `src/index.ts` re-exports from `external.ts` and `optimize.ts`. Published to npm via changesets. Only runtime dependency: `heap-js`.
- **Frontend** (`frontend/`): Separate React + Vite + TypeScript app. Depends on `aacalc2` as a library. Deployed to GitHub Pages at `/aacalc2/` base path.
- **Landing page** (`index.html`): Static page linking to the frontend.

## Generated code

`solveone1.ts`–`solveone4.ts` are generated from `solveone.ts` by `scripts/copy.sh` (a `sed` that renames `solve_one_general_state` → `solve_one_general_state_copy$i`). Edit `solveone.ts`, then `npm run copy` to regenerate.

## Code style

- `verbatimModuleSyntax` is on — all imports must use `.js` extensions (e.g. `'./external.js'`).
- Prettier config: single quotes, trailing commas, 80 print width, 2-space indent.

## Tests

- `src/external.test.ts` — focused unit tests using vitest's `toCloseTo` matcher.
- `src/main.test.ts` — large regression tests with **custom snapshot serializer** that rounds all floats to 14 decimal places. Update with `npx vitest run --update`.
- Snapshot file: `src/__snapshots__/main.test.ts.snap`.
- `test/` directory contains legacy scripts, is gitignored, and is **not** part of the vitest suite.

## Frontend dev

1. `npm run build` in root (produces `dist/` that the frontend depends on).
2. In `frontend/`:
   - `LOCAL_ENGINE=true npm run dev` (vite alias → root `dist/`)
   - or symlink: `ln -s ../.. node_modules/aacalc2`
3. Restart dev server after library rebuilds (Vite caches modules).
4. Frontend has its own commands: `npm run build` (runs `tsc -b && vite build`), `npm run lint`.

## Publishing

Uses [changesets](https://github.com/changesets/changesets). `npm run local-release` runs `changeset version && changeset publish`. `prepublishOnly` triggers full CI. `.npmignore` excludes `dist/regressions` from the published package.

## Unit system

Internally units are single-character codes (`i`=inf, `a`=art, `f`=fig, `b`=bom, `c`=aa, `S`=sub, `D`=des, etc.). Mapping in `src/external.ts` (`UnitIdentifier2UnitMap` / `Unit2ExternalNameMap`).

## experimentalConvolution

Checkbox in Advanced Options. When enabled, replaces `profitDistribution` for waves > 0 by convolving the final (defender-cumulative) profit distribution with the initial (defender prior) profit distribution under the independence assumption. Corrects defender side from cumulative to incremental. Only affects multiwave battles with 2+ waves. Flag is `experimentalConvolution` on `MultiwaveInput` / `multiwave_input`.
