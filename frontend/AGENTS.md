# aacalc2 Frontend

React + Vite + TypeScript frontend for the Axis & Allies 1942 Online probability calculator.

## Commands

| Command            | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `npm run dev`      | `vite` — dev server with HMR                               |
| `npm run build`    | `tsc -b && vite build` — type-check then bundle             |
| `npm run lint`     | `eslint .`                                                  |
| `npm run preview`  | `vite preview` — serve production build locally             |
| `npm run test`     | `vitest run`                                                 |
| `npm run test:watch` | `vitest` — watch mode                                      |
| `LOCAL_ENGINE=true npm run dev` | Dev server using root `dist/` instead of published package |

## Architecture

```
src/
├── App.tsx                  # Root app component (~1260 lines)
├── App.css                  # Global styles + utility classes
├── main.tsx                 # Entry point
├── types.ts                 # Shared types: BattleInput, WaveConfig, UnitId, etc.
├── constants.ts             # UI constants: MODES, ROUND_OPTIONS, RETREAT_OPTIONS
├── engine.ts                # computeBattle, computeSbrBattle, validateArmySizes
├── hooks/
│   └── useWaveState.ts      # Custom hook for per-wave config state
├── utils/
│   ├── format.ts            # getUnitName, getUnitString, encodeStateToUrl/decodeStateFromUrl, compact URL encoding
│   └── unitStats.ts         # UNIT_STATS, calculateUnitSummary
├── data/
│   └── oolPresets.ts        # OOL preset definitions for all modes
└── components/
    ├── WaveCard.tsx          # Per-wave attacker/defender unit input card
    ├── WaveOptions.tsx       # Per-wave options (rounds, retreat, sea/land controls)
    ├── DetailedCasualties.tsx # Casualty breakdown table (attack & defense merged)
    ├── HistoryPanel.tsx      # Saved battle history sidebar
    ├── SBRModeSection.tsx    # SBR mode unit inputs
    ├── ArmyRecommendSection.tsx # Army recommendation UI
    ├── UnitSummaryDisplay.tsx # IPC/HP/Power summary line
    ├── charts/
    │   ├── ProfitDistributionTable.tsx     # IPC profit distribution table
    │   └── ProfitDistributionHistogram.tsx # IPC profit distribution bar chart
    ├── controls/
    │   ├── ModeSelector.tsx  # Sea/Land/SBR radio selector
    │   └── ResetButtons.tsx  # Reset All / Reset Units buttons
    └── ui/
        ├── CollapsibleSection.tsx    # Collapsible panel
        ├── CollapsibleSubsection.tsx # Smaller collapsible variant
        └── Toast.tsx                 # Toast notification overlay
```

## Component patterns

- **Presentational components** (pure UI, no engine logic) go in `components/ui/` or `components/controls/`.
- **Feature components** (tied to battle state, engine calls) live directly in `components/`.
- **Chart components** (recharts-based) go in `components/charts/`.
- All components are default-export-free — use named exports.

## State management

All state lives in `App.tsx` via `useState` hooks (no global state library). Per-wave config is managed by the `useWaveState` hook (`hooks/useWaveState.ts`). State flows down via props; mutations flow up via callbacks.

## Code style

- `verbatimModuleSyntax` is on — use `.ts`/`.tsx` extensions in all imports.
  ```tsx
  import { Foo } from './Bar.tsx'       // ✓ value import
  import type { Foo } from './Bar.tsx'  // ✓ type import
  ```
- Prefer `className` over inline `style={{}}` where practical. Utility classes are in `App.css` (`.btn`, `.table`, `.card`, `.info-box`, etc.).
- No `as any` casts. If TypeScript complains, fix the types.
- Prettier config matches root: single quotes, trailing commas, 80 print width.

## Tests

- Uses `vitest` with `jsdom` environment and `@testing-library/react`.
- Test files: `src/**/*.test.{ts,tsx}`, co-located with the module under test.
- Run with `npm run test` or `npm run test:watch`.
- Test setup in `src/test-setup.ts` (imports `@testing-library/jest-dom` matchers).
- Pure functions (formatting, validation, unit stats) are well-tested. Component tests are minimal (App smoke test).
- The `aacalc2` library module resolves naturally from `node_modules` in tests (no mocking needed for the smoke test).
- To add a new test: create a `.test.ts` file next to the source file.

## Data flow

```
App.tsx (state owner)
├── ModeSelector      → setMode()
├── ResetButtons      → reset callbacks
├── WaveCard[]        → onUnitChange / onSwapSides / onSwapWave / onUpdateConfig
│   └── WaveOptions   → onUpdate (isNaval prop)
├── SBRModeSection    → onUnitChange / onDiceModeChange
├── ArmyRecommendSection → reads battleInput, calls armyRecommend library
├── Run Battle button → computeBattle / computeSbrBattle (engine.ts)
└── Results section (inline in App.tsx)
    ├── DetailedCasualties (attack/defense)
    ├── ProfitDistributionTable
    └── ProfitDistributionHistogram
```

## Known gaps

- **ArmyRecommendSection state not persisted.** The entire `ArmyRecommendSection` state (`config`, `minArmy`, `showMinArmy`, `results`) is component-local `useState` — it is never serialized into URL share (`encodeStateToUrl`), never saved to localStorage history, and never restored from history. If persisting this state is needed later, the fields must be added to `BattleInput` in `types.ts`, included in the `shareInput` construction in `App.tsx` (~line 606), restored in `loadFromHistoryInput` (~line 436), and passed as props to `ArmyRecommendSection`.

## Key types

All shared types live in `types.ts`:
- `BattleInput` — frontend's battle configuration (maps to library `MultiwaveInput`)
- `WaveConfig` — per-wave settings (OOL presets, retreat options, etc.)
- `BattleMode` — `'land' | 'sea' | 'sbr'`
- `UnitId` — union of all valid unit codes
- `WaveRecords` — per-wave records generated by `buildWaveRecords()` helper

## Share URL encoding

Share links use a compact + compressed query parameter format:

    https://<host>/?state=<lz-string-compressed-JSON>

No backend is involved — GitHub Pages is static-only, so all encoding/decoding is done client-side in `format.ts`.

### Encode pipeline (`encodeStateToUrl`)

1. **Build compact object** — Iterate over `BattleInput` entries and apply two rules:
   - **Scalar fields** (e.g., `mode`, `diceMode`): if the value matches `FIELD_DEFAULTS`, omit it entirely.
   - **Per-wave record fields** (e.g., `rounds`, `aaLast`): for each wave entry, if the value matches `RECORD_DEFAULTS`, drop it. If all wave entries were dropped, omit the entire field.
2. **Alias remaining keys** — Replace full key names with 1–2 char codes from `KEY_MAP` (e.g., `retreatExpectedIpcProfitThresholds` → `re`).
3. **Compress** — `JSON.stringify` → `LZString.compressToEncodedURIComponent`.
4. **Append** — Result goes in `?state=...` on the current URL.

### Decode pipeline (`decodeStateFromUrl`)

1. **Decompress** — `LZString.decompressFromEncodedURIComponent`. If it returns falsy, fall back to `atob` (old base64 format) for backward compatibility.
2. **Parse** — `JSON.parse` the result.
3. **Restore keys** — Map aliases back to full names via `REVERSE_KEY_MAP`. Unknown aliases are kept as-is.
4. **Fill defaults** — For each key in `RECORD_KEYS` where the default is not `undefined`, fill missing wave indices with the default. Wave count is inferred from `Object.keys(result.attack)`.

### Adding a new field to `BattleInput`

Every field must be registered in `format.ts` or it will not survive a share roundtrip:

| Field type | Registration required |
|------------|----------------------|
| Top-level scalar | `KEY_MAP` + `FIELD_DEFAULTS` |
| Per-wave `Record<number, T>` | `KEY_MAP` + `RECORD_KEYS` + `RECORD_DEFAULTS` |

Set the default to the value used by the UI when the user hasn't touched that control. This determines when the field/entry is stripped from the compact JSON.

### Known gap: ArmyRecommendSection

Army recommendation state is **not** included in the share URL (tracked in *Known gaps* above).

## Local development

1. `npm run build` in root (produces `dist/` that frontend depends on).
2. In `frontend/`:
   - `LOCAL_ENGINE=true npm run dev` (vite alias → root `dist/`)
   - Restart dev server after library rebuilds (Vite caches modules).
