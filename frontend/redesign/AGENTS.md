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

- Probability calculation is exact; the Simulations control is intentionally
  disabled and shows `Exact`.
- Unit icons are original inline SVG. Multi-wave desktop shows one icon per
  unit row; multi-wave mobile drops the icon column entirely.
- Results are mode-aware: simple mode shows exact outcome probabilities;
  advanced mode shows green “or better” / red “or worse” confidence intervals
  (and exact probability on desktop).
- Settings/history use isolated keys (`aacalc2BetaSettings`,
  `aacalc2BetaHistory`), and sharing uses `#/<lz-state>/<title>`.
- Reference screenshots are in `docs/screenshots/`.
