# frontend-redesign

Isolated beta-style UI for the aacalc2 calculator. This app lives under
`frontend/redesign`; the production frontend in `frontend/` must remain
untouched.

## Commands

| Command           | Action                       |
| ----------------- | ---------------------------- |
| `npm run dev`     | Vite dev server on port 5174 |
| `npm run build`   | `tsc -b && vite build`       |
| `npm run preview` | Serve the production build   |
| `npm run test`    | `vitest run`                 |
| `npm run lint`    | `eslint .`                   |

The app is served at **http://127.0.0.1:5174/aacalc2/redesign/**.

## Architecture

- `src/main.tsx` → `src/BetaApp.tsx` — the new beta-style app.
- `src/beta.css` — hand-written Material-like styling. **No MUI/Emotion**;
  keep new UI primitives in `src/components/redesign/primitives.tsx`.
- `src/components/redesign/` — header/drawers, advanced config, unit grid,
  results tables, icons, retreat popover.
- `src/{engine,types}.ts`, `src/utils/`, `src/hooks/`, `src/data/` — copied
  from the main frontend to keep this app isolated. Engine changes belong in
  the root library, not here.
- `src/BetaApp.test.tsx` covers the new app; shared utils keep their tests.

## Behaviour notes

- The app always uses the advanced calculator; there is no simple/advanced
  toggle.
- Probability calculation is exact. There is no Monte Carlo/Simulations
  control.
- Unit icons are original inline SVG. Multi-wave desktop shows one icon per
  unit row; multi-wave mobile drops the icon column entirely.
- Results always show the green “or better” / red “or worse” confidence
  intervals (plus exact probability on desktop). There is no simple-mode table.
  A profit histogram and profit distribution table appear above the casualty
  tables and use the per-wave `profitDistribution[wave]` data. Multi-wave
  results get a Results wave selector (latest wave by default) that also selects
  the per-wave `casualtiesInfoArr[wave]` tables; All waves shows cumulative
  casualties and a note that profit data is per wave. Hide unlikely outcomes
  filters casualty and profit table rows; profit confidence and percentile chips
  are recalculated over the visible rows, while the histogram remains full. At Extra
  large the histogram and profit table share a row; at Large/Extra large the
  attacker and defender tables sit side by side.
- Width modes are Small (600), Medium (900), Large (1200) and Extra large
  (1536). At Large and Extra large, Amphibious/Waves/Dice merge into the mode
  row and Reset All/Reset Units become icon+text buttons; smaller layouts stack
  them and use icon-only reset buttons.
- Waves 1–3 are available everywhere; 4 waves is offered only when the width
  setting is Extra large and the viewport is at least 1000px. Reducing the
  width or viewport clamps an active 4-wave battle to 3 waves.
- Settings/history use isolated keys (`aacalc2BetaSettings`,
  `aacalc2BetaHistory`), and sharing uses `#/<lz-state>/<title>`.
- Reference screenshots are in `docs/screenshots/`.
