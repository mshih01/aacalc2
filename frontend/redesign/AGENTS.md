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
  results tables, grouped history drawer, batch results, icons, retreat popover.
- `src/{engine,types}.ts`, `src/utils/`, `src/hooks/`, `src/data/` — copied
  from the main frontend to keep this app isolated. Engine changes belong in
  the root library, not here.
- `src/BetaApp.test.tsx` covers the new app; shared utils keep their tests.

## Behaviour notes

- The app always uses the advanced calculator; there is no simple/advanced
  toggle.
- Exhaustive OOL is opt-in via settings. When enabled, OOL fields are
  autocomplete inputs whose options are permutations of the legal unit types
  for that side/mode (up to eight types). Custom OOL arrays are stored on
  `WaveConfig.attackOol` / `defenseOol`, flow into share/history through
  `BattleInput.attackOol` / `defenseOol`, and are reset on mode/reset changes.
- Probability calculation is exact. There is no Monte Carlo/Simulations
  control.
- Unit icons are original inline SVG. Multi-wave desktop shows one icon per
  unit row; multi-wave mobile drops the icon column entirely. Legal unit-count
  fields use the page surface (white/black); illegal units for the current mode
  get a grey disabled background.
- Results always show the green “or better” / red “or worse” confidence
  intervals (plus exact probability on desktop). There is no simple-mode table.
  A profit histogram and profit distribution table appear above the casualty
  tables and use the per-wave `profitDistribution[wave]` data. Multi-wave
  results get a Results wave selector (latest wave by default) that also selects
  the per-wave `casualtiesInfoArr[wave]` tables; All waves shows cumulative
  casualties and a note that profit data is per wave. Hide unlikely outcomes
  filters casualty and profit table rows; profit confidence and percentile chips
  are recalculated over the visible rows, while the histogram remains full. The
  profit table mirrors the casualty tables exactly: percentile badges sit in the
  leftmost column and numeric columns (including the individual-outcome
  probability) are right aligned; its blue “Profit” pill spans the badge and
  outcome-probability columns, right-aligned over the probabilities, and a
  single “Confidence %” heading is centred across the confidence and
  reverse-confidence columns. On mobile the probability column is dropped,
  moving the pill into the badge column while the badges keep rendering.
  Casualty header and body rows share one column grid, so every heading
  lines up with its data column: the Attacker/Defender pill spans the badge and
  outcome-probability columns and is right-aligned over the probabilities, while
  a single “Confidence %” heading is centred across the two confidence columns.
  The outcome-probability column is sized to the probability decimal setting
  (`--probability-column` on the results root) so the percentages sit right next
  to the badges and the remaining columns spread across the table.
  Casualty tables gain a Retreating column before Surviving (after the
  confidence columns) when that side’s outcomes include retreated units; it is
  omitted when nothing retreats. At Extra large the histogram and
  profit table share a row; at Large/Extra large the attacker and defender
  tables sit side by side. The histogram bucket size is selectable (Auto plus
  fixed 1–50 IPC sizes).
- Width modes are Small (600), Medium (900), Large (1200) and Extra large
  (1536). At Large and Extra large, Amphibious/Waves/Dice merge into the mode
  row and Reset All/Reset Units become icon+text buttons; smaller layouts stack
  them and use icon-only reset buttons. At Small the title font shrinks so the
  Group field beside it does not clip the default title.
- Per-wave checkbox rows (Submerge subs, Destroyer last, Crash fighters, AA 2nd
  last) follow the reference: when the wave columns are too narrow, the label is
  drawn once above a row of checkboxes centred under each wave column. That
  happens for any multi-wave battle below a 500px viewport, and for three or
  more waves below a 700px viewport or with the Small width setting. Otherwise
  every checkbox keeps its own label beside it.
- Waves after the first get a **Prev wave attackers** checkbox in the defender
  column (land and sea). Checked means the current wave’s defenders are the
  previous wave’s surviving attackers; unchecked (the default) means they are
  the previous wave’s surviving defenders. Wave 1’s slot stays empty because
  there is no earlier wave to carry units over from.
- On mobile the Dead zone checkbox shares the Territory value line, using the
  short “DZ” label (the field label shortens to “Territory IPC”); desktop keeps
  “Dead zone” and “Territory value (IPC)”.
- Army optimization is a task tab on the calculator page (`Battle results` /
  `Army optimization` / `Batch run` for land and sea), shown for land and sea
  only. It optimizes wave 1 with the selected side’s current units as the
  maximum army and the other side as the opponent. The parameters (mode, side,
  target, recommendation count, pwin mode) persist in `aacalc2BetaSettings`; the
  minimal army is transient. `armyRecommend` runs in
  `armyRecommend.worker.ts` through `useArmyRecommendation` (tests use the
  in-process fallback); changing any battle input or optimizer parameter
  cancels the run and clears the results. “Use as attacker/defender” replaces
  wave 1’s units and returns to Battle results.
- History entries are keyed by `group / name`. The **Group** field beside the
  title chooses the destination for new saves; the title is the entry name, and
  loading an entry restores its group. The History drawer groups entries into
  collapsible sections with counts, rename (merging asks first), remove,
  search, and Expand/Collapse all. `aacalc2BetaHistoryGroupsCollapsed` persists
  the collapsed state. Existing flat entries migrate into `Default`.
- **Batch run** (third task tab, land and sea only) re-evaluates every saved
  setting in a selected group against the current armies. `utils/batchEval.ts`
  holds the armies, mode and wave count fixed while replaying each entry’s
  scenario settings; the current Advanced/engine options override the values
  stored on the entry. Entries saved for another mode or above the complexity
  threshold are skipped, errors become rows and do not abort the run, and
  cancellation keeps partial rows. The history group header and the Batch run
  tab both start a run. Results show final-wave metrics and a copyable report;
  the snapshot records the armies and group used, and removing that group
  clears the snapshot.
- Settings → Advanced options holds the display and engine controls:
  probability/IPC decimal places, verbose level, prune and report-prune
  thresholds, complexity threshold, sort mode, and the three experimental
  switches. They persist in `aacalc2BetaSettings`; changing probability
  decimals resets both prune thresholds via `computeThreshold`. Probability
  decimals drive the overview, casualty tables, profit distribution and
  histogram tooltip; IPC decimals drive the overview and profit distribution
  IPC/profit values. Mobile casualty percentages keep their compact rounded
  format. Advanced options are app settings: loading a share link or history
  entry keeps the viewer’s current values rather than restoring the encoded
  ones.
- Waves 1–3 are available everywhere; 4 waves is offered only when the width
  setting is Extra large and the viewport is at least 1000px. Reducing the
  width or viewport clamps an active 4-wave battle to 3 waves.
- Settings/history use isolated keys (`aacalc2BetaSettings`,
  `aacalc2BetaHistory`, `aacalc2BetaHistoryGroupsCollapsed`), and sharing uses
  `#/<lz-state>/<title>`.
- Reference screenshots are in `docs/screenshots/`.
