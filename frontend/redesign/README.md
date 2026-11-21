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

- **Modes** — Land / Sea / SBR with waves (1–3; 4 waves only at Extra large
  desktop width), dice modes, retreat popover, land-units-to-die-last, dead
  zone, territory value, AA 2nd last, battle in progress, and naval submerge /
  destroyer-last / crash-fighter options. **Exhaustive OOL** can replace the
  preset picker with an autocomplete of the legal unit orders for that mode and
  side; custom orders survive sharing and history.
- **Unit grid** — per-wave columns with attack/defense colours, summary stats,
  side swap and wave swap. Single-wave layouts show the unit icon next to the
  input; multi-wave desktop shows the icon once per unit row; multi-wave mobile
  drops icons entirely so the wave inputs get the full width. Legal unit-count
  fields use the page surface (white/black); units that are illegal for the
  current mode are greyed out with a disabled background.
- **Results** — rounds, attacker survives/conquers, defender survives,
  attacker/defender IPC, attacker profit, 95/68/50/32/5% confidence chips, and
  full attacker/defender casualty tables. The green “or better” and red “or
  worse” confidence intervals are shown in the tables (plus exact probability
  on desktop; mobile keeps the confidence intervals only). A profit histogram
  and profit distribution table sit above the casualty tables, using the
  per-wave `profitDistribution[wave]` data. Multi-wave results get a Results
  wave selector (defaulting to the latest wave); All waves shows the cumulative
  casualty tables with a note that profit data is per wave. Hide unlikely
  outcomes filters both casualty and profit table rows; profit confidence and
  percentile chips are recalculated over the visible rows, while the histogram
  continues to show the full distribution. The profit table mirrors the casualty
  tables: percentile badges sit in the leftmost column and the numeric columns
  (including the individual-outcome probability) are right aligned; on mobile
  the probability column is dropped while the badges keep rendering. At Large
  and Extra large widths, the attacker and defender casualty tables sit side by
  side; at Extra large the histogram and profit distribution table also share a
  row.
- **Drawers** — menu, settings, common battles, and a grouped history drawer.
- **Grouped history** — each saved calculation is keyed by `group / name`. The
  **Group** field beside the title chooses the destination for new saves (the
  title is the entry name), and loading an entry restores its group. History
  groups are collapsible, searchable, renameable (merging into an existing
  group asks first), removable, and can be expanded/collapsed together. The
  collapsed state persists in `localStorage`.
- **Batch run** — a third task tab next to **Battle results** and **Army
  optimization** (land and sea only). It re-evaluates every saved setting in a
  selected history group against the current armies, holding the armies, mode
  and wave count fixed while replaying each entry’s OOL, rounds, retreat and
  other scenario settings. Current Advanced/engine options override the values
  stored with an entry. Rows report profit, losses, survivors, conquest odds,
  rounds and runtime; entries saved for another mode or above the complexity
  threshold are marked skipped, and engine errors do not abort the run. The
  history group headers and the Batch run tab both start a run, with progress,
  cancellation, a copyable report, and a snapshot of the armies used. Removing a
  group also clears that group’s batch snapshot.
- **Settings** — IPC display (absolute/ROI), exhaustive OOL autocomplete, hide
  unlikely outcomes (including `< 5%`, defaulting to `< 0.01%`), history
  sort/show/hide-unnamed, width (Small / Medium / Large / Extra large), dark
  mode, and **Advanced options**: probability/IPC decimal places, verbose level,
  prune and report-prune thresholds, complexity threshold, sort mode, and the
  three experimental switches. Changing probability decimals also resets both
  prune thresholds.
- **Wide layouts** — at Large and Extra large widths, Amphibious assault,
  Waves and Dice mode merge into the mode row, and Reset All / Reset Units
  become outlined icon+text buttons. Smaller widths keep them stacked and use
  icon-only reset buttons. Per-wave checkbox rows (Submerge subs, Destroyer
  last, Crash fighters, AA 2nd last) draw their label once above a row of
  checkboxes when the wave columns are narrow (multi-wave below 500px viewport,
  or three or more waves below 700px / with the Small width); otherwise every
  checkbox keeps its own label.
- **Multi-wave options** — every wave has its own order of loss, rounds, retreat,
  and side options. Waves after the first get a **Prev wave attackers** checkbox
  in the defender column (land and sea): checked means the wave’s defenders are
  the previous wave’s surviving attackers, unchecked (default) means they are
  the previous wave’s surviving defenders. Wave 1 has no slot because there is
  no earlier wave to carry survivors over from.
- **Army optimization** — a **Battle results / Army optimization** task switch
  sits below the unit grid (hidden in SBR mode). The optimizer reuses the wave-1
  setup: the selected side is the maximum army and the other side is the
  opponent. It supports target-win and max-profit modes, takes/destroys win
  conditions, an optional minimum army, and one or more recommendations. It runs
  in a Web Worker and can be cancelled; **Use as attacker/defender** applies a
  recommendation to wave 1 and returns to the battle results. Optimizer
  parameters persist in `aacalc2BetaSettings`; recommendations are transient.
- **Persistence** — settings, grouped history, and collapsed history groups in
  `localStorage`; history entries are saved when a titled battle is calculated.
- **Sharing** — the URL hash updates automatically and can be copied; links
  restore the full battle state and title, including the three experimental
  engine switches (they change the computed results). Display and tuning
  settings such as width, dark mode and decimal places stay per viewer.
- **Responsive/dark** — mobile header/unit-grid layout and dark palette. On
  mobile the results overview keeps Attacker Profit and drops Defender IPC, and
  casualty tables show all outcome rows with the green/red confidence intervals
  and percentile chips. Mobile also keeps Dead zone on the Territory value line
  with a short “DZ” label (“Territory IPC” on the field); desktop keeps the full
  labels.

## Deliberate differences from beta

- **Single advanced layout** — no simple/advanced toggle; all calculator
  controls are always available.
- **No Monte Carlo controls** — the engine computes exact probabilities, and
  there is no Simulations picker.
- **No video tutorial** or related setting.
- **Original unit icons** — the unit artwork is original inline SVG line art,
  not copied from the target's packaged game assets.
- **Common battles** is a smaller curated list of generic matchups.
- **Menu pages** (Overview / FAQ / About) are simplified placeholders.
- Settings are a focused subset of the target's drawer (no exhaustive-OOL,
  simulation-size, calculation-mode or log-level controls).
- History groups and batch run are ported from the existing frontend rather than
  the beta target; they follow this app's rule that Advanced/engine options are
  viewer settings rather than saved state.

## Tests

```bash
npm run test
npm run build
```

The existing engine/history tests continue to pass, and
`src/BetaApp.test.tsx` covers the calculator rendering, grouped saving and a
batch run. `src/components/redesign/HistoryDrawer.test.tsx` covers group
management and
`src/utils/batchEval.test.ts` covers batch merging, skipping, cancellation and
report formatting.
