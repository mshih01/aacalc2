# aa1942calc UI redesign (isolated)

This directory is an **isolated copy** of `frontend/` used to build a
beta-style UI that matches [beta.aa1942calc.com](https://beta.aa1942calc.com).
The current `frontend/` source and build are untouched.

## Run it

```bash
cd frontend/redesign
npm install            # only needed on a fresh checkout
npm run dev -- --port 5174
```

Open **http://127.0.0.1:5174/aacalc2/redesign/**.

The app builds under `/aacalc2/redesign/` so it can coexist with the current frontend at `/aacalc2/`.

For a production build:

```bash
npm run build
npm run preview -- --port 5175
# http://127.0.0.1:5175/aacalc2/redesign/
```

## What is implemented

- **Simple mode** — Land / Sea, order-of-loss pickers, unit grid, calculate.
- **Advanced mode** — Land / Sea / SBR, waves (1–3), dice mode, retreat
  popover, land-units-to-die-last, dead zone, territory value, AA 2nd last,
  battle in progress, and naval submerge / destroyer-last / crash-fighter
  options.
- **Unit grid** — per-wave columns with attack/defense colours, summary stats,
  side swap and wave swap. Single-wave layouts show the unit icon next to the
  input; multi-wave desktop shows the icon once per unit row; multi-wave mobile
  drops icons entirely so the wave inputs get the full width.
- **Results** — rounds, attacker survives/conquers, defender survives,
  attacker/defender IPC, attacker profit, 95/68/50/32/5% confidence chips, and
  full attacker/defender casualty tables. Multi-wave adds the `1`, `2`, …,
  `All` overview rows. Simple mode shows the exact outcome probability; advanced
  mode shows the green "or better" and red "or worse" confidence intervals
  (plus exact probability on desktop).
- **Drawers** — menu, settings, common battles, history.
- **Settings** — IPC display (absolute/ROI), hide unlikely outcomes, history
  sort/show/hide-unnamed, width, dark mode, hide video tutorial.
- **Persistence** — settings and history in `localStorage`; history entries are
  saved when a titled battle is calculated.
- **Sharing** — the URL hash updates automatically and can be copied; links
  restore the full battle state and title.
- **Responsive/dark** — mobile header/unit-grid layout and dark palette. On
  mobile the results overview drops two columns; simple mode keeps Defender IPC,
  while advanced mode keeps Attacker Profit with a highlighted pill. Simple
  casualty tables collapse to four columns with the exact outcome probability;
  advanced tables show all outcome rows with the green/red confidence
  intervals, while the highlighted percentile rows still carry the
  5/32/50/68/95% chips, matching beta.

## Deliberate differences from beta

- **No Monte Carlo controls.** The engine used here computes exact
  probabilities, so the Simulations picker is shown disabled with `Exact`.
- **Original unit icons.** The unit artwork is original inline SVG line art,
  not copied from the target's packaged game assets.
- **Common battles** is a smaller curated list of generic matchups.
- **Menu pages** (Overview / FAQ / About / Video) are simplified placeholders.
- Settings are a focused subset of the target's drawer (no exhaustive-OOL,
  simulation-size, calculation-mode or log-level controls).
- Analysis/history features from the existing frontend (army recommendation,
  batch evaluation, profit histograms) are not part of this beta-style UI.

## Tests

```bash
npm run test
npm run build
```

The existing engine/history tests continue to pass, and
`src/BetaApp.test.tsx` covers the new calculator rendering, simple-mode
calculation, and advanced-mode controls.
