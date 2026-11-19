/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { multiwaveComplexityFastV2, type MultiwaveOutput } from 'aacalc2';
import ReactGA from 'react-ga4';
import './beta.css';
import {
  MAX_WAVES,
  DEFAULT_WAVE_CONFIG,
  type BattleInput,
  type BattleMode,
  type HistoryEntry,
  type UnitId,
  type WaveConfig,
} from './types.ts';
import { useWaveState } from './hooks/useWaveState.ts';
import {
  buildMultiwaveInput,
  computeBattle,
  computeSbrBattle,
  validateArmySizes,
} from './engine.ts';
import { decodeStateFromHash, decodeStateFromUrl, encodeStateToHash } from './utils/format.ts';
import {
  DEFAULT_GROUP,
  normalizeHistory,
  removeHistoryEntry,
  upsertHistoryEntry,
} from './utils/history.ts';
import {
  attackerAmphibOolPresets,
  attackerOolPresets,
  defenderOolPresets,
  modeUnitMap,
} from './data/oolPresets.ts';
import { computeThreshold } from './utils/threshold.ts';
import { Icon } from './components/redesign/Icon.tsx';
import { Drawer } from './components/redesign/Drawer.tsx';
import { ConfigSection } from './components/redesign/ConfigSection.tsx';
import { UnitGrid } from './components/redesign/UnitGrid.tsx';
import { Results } from './components/redesign/Results.tsx';
import {
  CheckboxControl,
  SelectField,
  SwitchControl,
  TextField,
} from './components/redesign/primitives.tsx';
import {
  RETREAT_TYPES,
  applyRetreat,
  retreatThreshold,
  type RetreatType,
} from './components/redesign/retreat.ts';

const MAX_COMPLEXITY = 4_000_000;
const TARGET_MAX_WAVES = 4;
const SETTINGS_KEY = 'aacalc2BetaSettings';
const ANALYTICS_ENABLED = import.meta.env.MODE !== 'test';

if (ANALYTICS_ENABLED) {
  ReactGA.initialize('G-XFRR47N18Q');
}
const HISTORY_KEY = 'aacalc2BetaHistory';

type DrawerState = null | 'menu' | 'settings' | 'common' | 'history';
type Page = 'calculator' | 'overview' | 'faq' | 'about';

interface BetaSettings {
  darkMode: 'auto' | 'light' | 'dark';
  width: 'sm' | 'md' | 'lg' | 'xl';
  ipcDiffDisplay: 'absolute' | 'roi';
  exhaustiveOOL: boolean;
  hideUnlikely: 'off' | '0.01' | '0.1' | '1' | '5';
  probabilityDecimals: number;
  ipcDecimals: number;
  verboseLevel: number;
  pruneThreshold: number;
  reportPruneThreshold: number;
  complexityThreshold: number;
  sortMode: 'unit_count' | 'ipc_cost';
  experimentalConvolution: boolean;
  evFutureWave: boolean;
  retreatZeroRound: boolean;
  historySortOrder: 'title' | 'date';
  showHistoryDetails: boolean;
  hideUnnamedHistory: boolean;
}

const DEFAULT_SETTINGS: BetaSettings = {
  darkMode: 'auto',
  width: 'sm',
  ipcDiffDisplay: 'absolute',
  exhaustiveOOL: false,
  hideUnlikely: '0.01',
  probabilityDecimals: 2,
  ipcDecimals: 2,
  verboseLevel: 0,
  pruneThreshold: computeThreshold(2),
  reportPruneThreshold: computeThreshold(2),
  complexityThreshold: MAX_COMPLEXITY,
  sortMode: 'ipc_cost',
  experimentalConvolution: false,
  evFutureWave: false,
  retreatZeroRound: false,
  historySortOrder: 'title',
  showHistoryDetails: false,
  hideUnnamedHistory: true,
};

const WIDTHS: Record<BetaSettings['width'], string> = {
  sm: '600px',
  md: '900px',
  lg: '1200px',
  xl: '1536px',
};

function clampDecimalPlaces(raw: string, fallback = 2): number {
  if (raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(10, Math.round(value)));
}

function parseNonNegativeInt(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function parseThreshold(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function loadSettings(): BetaSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<BetaSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return normalizeHistory(JSON.parse(stored));
  } catch (err) {
    console.warn('Failed to load history', err);
    return [];
  }
}

function basePresetInput(
  attack: Record<string, number>,
  defense: Record<string, number>,
): BattleInput {
  return {
    attack: { 0: attack },
    defense: { 0: defense },
    attackOol: { 0: ['inf', 'art', 'arm', 'fig', 'bom'] },
    defenseOol: { 0: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'] },
    rounds: { 0: 'all' },
    retreatThreshold: { 0: 0 },
    takesTerritory: { 0: 0 },
    aaLast: { 0: false },
    attackerSubmerge: { 0: false },
    defenderSubmerge: { 0: false },
    attackerDestroyerLast: { 0: false },
    defenderDestroyerLast: { 0: false },
    crashFighters: { 0: false },
    useAttackersFromPreviousWave: { 0: false },
    retreatModes: { 0: 'unitCount' },
    mode: 'land',
    diceMode: 'standard',
    inProgress: false,
    verboseLevel: 0,
    pruneThreshold: computeThreshold(2),
    reportPruneThreshold: computeThreshold(2),
    sortMode: 'ipc_cost',
    territoryValue: 0,
    isDeadzone: false,
    numWaves: 1,
    amphibious: false,
    experimentalConvolution: false,
    evFutureWave: false,
    retreatZeroRound: false,
  };
}

const COMMON_BATTLES: Array<{ name: string; input: BattleInput }> = [
  { name: '2 Inf vs 1 Inf', input: basePresetInput({ inf: 2 }, { inf: 1 }) },
  {
    name: '2 Inf, 1 Fig vs 1 Inf',
    input: basePresetInput({ inf: 2, fig: 1 }, { inf: 1 }),
  },
  {
    name: '2 Inf, 2 Fig vs 1 Inf',
    input: basePresetInput({ inf: 2, fig: 2 }, { inf: 1 }),
  },
  {
    name: '1 Inf, 1 Art vs 1 Inf',
    input: basePresetInput({ inf: 1, art: 1 }, { inf: 1 }),
  },
  {
    name: '2 Inf, 1 Art vs 1 Inf',
    input: basePresetInput({ inf: 2, art: 1 }, { inf: 1 }),
  },
  {
    name: '3 Inf, 2 Fig vs 2 Inf',
    input: basePresetInput({ inf: 3, fig: 2 }, { inf: 2 }),
  },
  {
    name: '3 Inf, 1 Art, 1 Fig vs 2 Inf',
    input: basePresetInput({ inf: 3, art: 1, fig: 1 }, { inf: 2 }),
  },
  {
    name: '4 Inf, 1 Art vs 2 Inf',
    input: basePresetInput({ inf: 4, art: 1 }, { inf: 2 }),
  },
  {
    name: '3 Inf, 1 Art, 1 Tnk vs 3 Inf',
    input: basePresetInput({ inf: 3, art: 1, arm: 1 }, { inf: 3 }),
  },
  {
    name: '2 Inf, 2 Art, 1 Tnk vs 3 Inf',
    input: basePresetInput({ inf: 2, art: 2, arm: 1 }, { inf: 3 }),
  },
];

export default function BetaApp() {
  const [mode, setMode] = useState<BattleMode>('land');
  const [numWaves, setNumWaves] = useState(1);
  const [diceMode, setDiceMode] = useState<'standard' | 'lowluck' | 'biased'>('standard');
  const [amphibious, setAmphibious] = useState(false);
  const [territoryValue, setTerritoryValue] = useState(0);
  const [isDeadzone, setIsDeadzone] = useState(false);
  const [inProgress, setInProgress] = useState(false);

  const { waveConfigs, updateWave } = useWaveState(MAX_WAVES);

  const emptyWaves = useCallback(() => {
    const next: Record<number, Record<string, number>> = {};
    for (let index = 0; index < MAX_WAVES; index++) next[index] = {};
    return next;
  }, []);

  const [attack, setAttack] = useState<Record<number, Record<string, number>>>(emptyWaves);
  const [defense, setDefense] = useState<Record<number, Record<string, number>>>(emptyWaves);
  const [result, setResult] = useState<MultiwaveOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complexityWarning, setComplexityWarning] = useState<{
    complexity: number;
    threshold: number;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [page, setPage] = useState<Page>('calculator');
  const [settings, setSettings] = useState<BetaSettings>(loadSettings);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [historySearch, setHistorySearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [retreatPopover, setRetreatPopover] = useState<{
    wave: number;
    left: number;
    top: number;
  } | null>(null);

  const allowFourWaves = settings.width === 'xl' && viewportWidth >= 1000;
  const maxWaves = allowFourWaves ? 4 : 3;

  // The reference UI moves the per-wave checkbox label above the boxes when
  // the wave columns get too narrow for a label beside every box.
  const inlineTwoWaveCheckboxes = viewportWidth >= 500;
  const inlineThreeWaveCheckboxes = viewportWidth >= 700 && settings.width !== 'sm';
  const stackedCheckboxes =
    (numWaves > 1 && !inlineTwoWaveCheckboxes) ||
    (numWaves > 2 && !inlineThreeWaveCheckboxes);

  const isLoadingRef = useRef(false);
  const shouldRunBattleRef = useRef(false);
  const lastInputRef = useRef<BattleInput | null>(null);

  const wavePresets = useCallback(
    (forMode: BattleMode, amphibiousMode: boolean) =>
      amphibiousMode && forMode === 'land' ? attackerAmphibOolPresets : attackerOolPresets,
    [],
  );

  const buildCurrentInput = useCallback((): BattleInput => {
    const attackOol: Record<number, UnitId[]> = {};
    const defenseOol: Record<number, UnitId[]> = {};
    const rounds: Record<number, number | string> = {};
    const retreatThresholds: Record<number, number> = {};
    const takesTerritory: Record<number, number> = {};
    const aaLast: Record<number, boolean> = {};
    const attackerSubmerge: Record<number, boolean> = {};
    const defenderSubmerge: Record<number, boolean> = {};
    const attackerDestroyerLast: Record<number, boolean> = {};
    const defenderDestroyerLast: Record<number, boolean> = {};
    const crashFighters: Record<number, boolean> = {};
    const useAttackersFromPreviousWave: Record<number, boolean> = {};
    const retreatModes: Record<number, string> = {};
    const retreatExpectedIpcProfitThresholds: Record<number, number | undefined> = {};
    const retreatPwinThresholds: Record<number, number | undefined> = {};
    const retreatStrafeThresholds: Record<number, number | undefined> = {};
    const retreatLoseAirProbabilityThresholds: Record<number, number | undefined> = {};
    const evDeadzone: Record<number, boolean | undefined> = {};
    const evTerritoryValue: Record<number, number | undefined> = {};

    for (let wave = 0; wave < numWaves; wave++) {
      const config = waveConfigs[wave];
      const attackPreset = wavePresets(mode, amphibious)[mode].find(
        (preset) => preset.id === config?.attackOolPreset,
      );
      const defensePreset = defenderOolPresets[mode].find(
        (preset) => preset.id === config?.defenseOolPreset,
      );
      attackOol[wave] = config?.attackOol ?? attackPreset?.ool ?? [];
      defenseOol[wave] = config?.defenseOol ?? defensePreset?.ool ?? [];
      rounds[wave] = config?.rounds ?? 'all';
      retreatThresholds[wave] = config?.retreatThreshold ?? 0;
      takesTerritory[wave] = config?.takesTerritory ?? 0;
      aaLast[wave] = config?.aaLast ?? false;
      attackerSubmerge[wave] = config?.attackerSubmerge ?? false;
      defenderSubmerge[wave] = config?.defenderSubmerge ?? false;
      attackerDestroyerLast[wave] = config?.attackerDestroyerLast ?? false;
      defenderDestroyerLast[wave] = config?.defenderDestroyerLast ?? false;
      crashFighters[wave] = config?.crashFighters ?? false;
      useAttackersFromPreviousWave[wave] = config?.useAttackersFromPreviousWave ?? false;
      retreatModes[wave] = config?.retreatMode || 'unitCount';
      retreatExpectedIpcProfitThresholds[wave] = config?.retreatExpectedIpcProfitThreshold;
      retreatPwinThresholds[wave] = config?.retreatPwinThreshold;
      retreatStrafeThresholds[wave] = config?.retreatStrafeThreshold;
      retreatLoseAirProbabilityThresholds[wave] = config?.retreatLoseAirProbabilityThreshold;
      evDeadzone[wave] = config?.evDeadzone;
      evTerritoryValue[wave] = config?.evTerritoryValue;
    }

    return {
      attack,
      defense,
      attackOol,
      defenseOol,
      rounds,
      retreatThreshold: retreatThresholds,
      takesTerritory,
      aaLast,
      attackerSubmerge,
      defenderSubmerge,
      attackerDestroyerLast,
      defenderDestroyerLast,
      crashFighters,
      useAttackersFromPreviousWave,
      retreatModes,
      retreatExpectedIpcProfitThresholds,
      retreatPwinThresholds,
      retreatStrafeThresholds,
      retreatLoseAirProbabilityThresholds,
      mode,
      diceMode,
      inProgress,
      verboseLevel: settings.verboseLevel,
      pruneThreshold: settings.pruneThreshold,
      reportPruneThreshold: settings.reportPruneThreshold,
      sortMode: settings.sortMode,
      territoryValue,
      isDeadzone,
      numWaves,
      amphibious,
      experimentalConvolution: settings.experimentalConvolution,
      evFutureWave: settings.evFutureWave,
      retreatZeroRound: settings.retreatZeroRound,
      evDeadzone,
      evTerritoryValue,
    };
  }, [
    attack,
    defense,
    numWaves,
    waveConfigs,
    mode,
    diceMode,
    inProgress,
    settings,
    territoryValue,
    isDeadzone,
    amphibious,
    wavePresets,
  ]);

  const updateHash = useCallback((input: BattleInput, nextTitle: string) => {
    try {
      const hash = encodeStateToHash(input, nextTitle);
      window.history.replaceState(null, '', hash);
      lastInputRef.current = input;
    } catch (err) {
      console.warn('Failed to update share URL', err);
    }
  }, []);

  const saveHistoryEntry = useCallback((input: BattleInput, nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    const entry: HistoryEntry = {
      group: DEFAULT_GROUP,
      name: trimmed,
      timestamp: Date.now(),
      input,
    };
    setHistory((prev) => upsertHistoryEntry(prev, entry));
  }, []);

  const runBattle = useCallback(
    (options?: { saveToHistory?: boolean }) => {
      setError(null);
      setComplexityWarning(null);
      try {
        const validation = validateArmySizes(attack, defense, numWaves);
        if (!validation.valid) {
          setError(validation.error || 'Invalid army configuration');
          setResult(null);
          return;
        }

        const input = buildCurrentInput();
        const complexityInput = buildMultiwaveInput(input);
        const complexity = multiwaveComplexityFastV2(complexityInput);
        if (complexity > settings.complexityThreshold) {
          setComplexityWarning({ complexity, threshold: settings.complexityThreshold });
          setResult(null);
          return;
        }

        const output = mode === 'sbr' ? computeSbrBattle(input) : computeBattle(input);
        setResult(output);
        if (ANALYTICS_ENABLED) {
          ReactGA.event({
            category: 'battle',
            action: 'calculate',
            label: `${mode}-${numWaves}wave${diceMode !== 'standard' ? `-${diceMode}` : ''}`,
          });
        }
        lastInputRef.current = input;
        updateHash(input, title);
        if (options?.saveToHistory !== false) {
          saveHistoryEntry(input, title);
        }
      } catch (err) {
        setError((err as Error).message ?? 'Unknown error');
        setResult(null);
      }
    },
    [
      attack,
      defense,
      numWaves,
      buildCurrentInput,
      mode,
      diceMode,
      updateHash,
      title,
      saveHistoryEntry,
      settings.complexityThreshold,
    ],
  );

  const loadFromHistoryInput = useCallback(
    (input: BattleInput) => {
      isLoadingRef.current = true;
      const nextMode = input.mode ?? 'land';
      const nextWaves = Math.min(input.numWaves ?? 1, TARGET_MAX_WAVES);
      setMode(nextMode);
      setNumWaves(nextWaves);
      setAttack(input.attack ?? {});
      setDefense(input.defense ?? {});
      setAmphibious(input.amphibious ?? false);
      setDiceMode(input.diceMode ?? 'standard');
      setTerritoryValue(input.territoryValue ?? 0);
      setIsDeadzone(input.isDeadzone ?? false);
      setInProgress(input.inProgress ?? false);

      for (let wave = 0; wave < nextWaves; wave++) {
        const attackOol = input.attackOol?.[wave];
        const defenseOol = input.defenseOol?.[wave];
        const attackPreset = attackOol
          ? [
              ...attackerOolPresets[nextMode],
              ...(nextMode === 'land' ? attackerAmphibOolPresets[nextMode] : []),
            ].find((preset) => JSON.stringify(preset.ool) === JSON.stringify(attackOol))
          : undefined;
        const defensePreset = defenseOol
          ? defenderOolPresets[nextMode].find(
              (preset) => JSON.stringify(preset.ool) === JSON.stringify(defenseOol),
            )
          : undefined;

        const savedRetreatMode = input.retreatModes?.[wave] || 'unitCount';
        const retreatMode =
          nextMode === 'sea' && (savedRetreatMode === 'strafe' || savedRetreatMode === 'loseAir')
            ? 'unitCount'
            : savedRetreatMode;
        const thresholdUpdates: Partial<WaveConfig> = {
          retreatThreshold: undefined,
          retreatExpectedIpcProfitThreshold: undefined,
          retreatPwinThreshold: undefined,
          retreatStrafeThreshold: undefined,
          retreatLoseAirProbabilityThreshold: undefined,
        };
        if (retreatMode === 'unitCount') {
          thresholdUpdates.retreatThreshold = input.retreatThreshold?.[wave] ?? 0;
        } else if (retreatMode === 'expectedIpcProfit') {
          thresholdUpdates.retreatExpectedIpcProfitThreshold =
            input.retreatExpectedIpcProfitThresholds?.[wave];
        } else if (retreatMode === 'probabilityWins') {
          thresholdUpdates.retreatPwinThreshold = input.retreatPwinThresholds?.[wave];
        } else if (retreatMode === 'strafe') {
          thresholdUpdates.retreatStrafeThreshold = input.retreatStrafeThresholds?.[wave];
        } else if (retreatMode === 'loseAir') {
          thresholdUpdates.retreatLoseAirProbabilityThreshold =
            input.retreatLoseAirProbabilityThresholds?.[wave];
        }

        updateWave(wave, {
          attackOolPreset: attackPreset?.id ?? DEFAULT_WAVE_CONFIG.attackOolPreset,
          defenseOolPreset: defensePreset?.id ?? DEFAULT_WAVE_CONFIG.defenseOolPreset,
          attackOol: attackPreset ? undefined : attackOol,
          defenseOol: defensePreset ? undefined : defenseOol,
          rounds: input.rounds?.[wave]?.toString() ?? 'all',
          takesTerritory: input.takesTerritory?.[wave] ?? 0,
          aaLast: input.aaLast?.[wave] ?? false,
          attackerSubmerge: input.attackerSubmerge?.[wave] ?? false,
          defenderSubmerge: input.defenderSubmerge?.[wave] ?? false,
          attackerDestroyerLast: input.attackerDestroyerLast?.[wave] ?? false,
          defenderDestroyerLast: input.defenderDestroyerLast?.[wave] ?? false,
          crashFighters: input.crashFighters?.[wave] ?? false,
          useAttackersFromPreviousWave: input.useAttackersFromPreviousWave?.[wave] ?? false,
          retreatMode,
          evDeadzone: input.evDeadzone?.[wave],
          evTerritoryValue: input.evTerritoryValue?.[wave],
          ...thresholdUpdates,
        });
      }

      lastInputRef.current = input;
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 0);
    },
    [updateWave],
  );

  const loadHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      setTitle(entry.name);
      loadFromHistoryInput(entry.input);
      shouldRunBattleRef.current = true;
      setDrawer(null);
      setPage('calculator');
    },
    [loadFromHistoryInput],
  );

  const loadCommonBattle = useCallback(
    (preset: { name: string; input: BattleInput }) => {
      setTitle(preset.name);
      loadFromHistoryInput(preset.input);
      shouldRunBattleRef.current = true;
      setDrawer(null);
      setPage('calculator');
    },
    [loadFromHistoryInput],
  );

  useEffect(() => {
    if (shouldRunBattleRef.current) {
      shouldRunBattleRef.current = false;
      runBattle({ saveToHistory: false });
    }
  }, [runBattle]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark =
        settings.darkMode === 'dark' || (settings.darkMode === 'auto' && Boolean(media?.matches));
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media?.addEventListener?.('change', apply);
    return () => media?.removeEventListener?.('change', apply);
  }, [settings.darkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--beta-container-width', WIDTHS[settings.width]);
  }, [settings.width]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (numWaves > maxWaves) {
      setNumWaves(maxWaves);
      setResult(null);
    }
  }, [maxWaves, numWaves]);

  useEffect(() => {
    const fromHash = decodeStateFromHash();
    if (fromHash) {
      setTitle(fromHash.title);
      loadFromHistoryInput(fromHash.input);
      shouldRunBattleRef.current = validateArmySizes(
        fromHash.input.attack,
        fromHash.input.defense,
        fromHash.input.numWaves ?? 1,
      ).valid;
      return;
    }
    const fromQuery = decodeStateFromUrl();
    if (fromQuery) {
      loadFromHistoryInput(fromQuery);
      shouldRunBattleRef.current = validateArmySizes(
        fromQuery.attack,
        fromQuery.defense,
        fromQuery.numWaves ?? 1,
      ).valid;
    }
  }, [loadFromHistoryInput]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    const timer = window.setTimeout(() => {
      try {
        const input = buildCurrentInput();
        lastInputRef.current = input;
        const hasUnits = [input.attack, input.defense].some((side) =>
          Object.values(side).some((units) =>
            Object.values(units ?? {}).some((count) => count > 0),
          ),
        );
        const meaningful =
          hasUnits ||
          Boolean(title.trim()) ||
          input.mode !== 'land' ||
          (input.numWaves ?? 1) > 1 ||
          Boolean(input.amphibious) ||
          Boolean(input.territoryValue) ||
          Boolean(input.isDeadzone) ||
          Boolean(input.inProgress);
        if (!meaningful) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }
        window.history.replaceState(null, '', encodeStateToHash(input, title));
      } catch (err) {
        console.warn('Failed to update share URL', err);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [buildCurrentInput, title]);

  useEffect(() => {
    if (mode === 'sbr' && numWaves !== 1) setNumWaves(1);
  }, [mode, numWaves]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    const allowed = new Set(modeUnitMap[mode]);
    if (amphibious && mode === 'land') {
      allowed.add('inf_a');
      allowed.add('art_a');
      allowed.add('arm_a');
    }
    setAttack((prev) => {
      const next: Record<number, Record<string, number>> = {};
      for (let wave = 0; wave < MAX_WAVES; wave++) {
        next[wave] = Object.fromEntries(
          Object.entries(prev[wave] ?? {}).filter(([unit]) => allowed.has(unit as UnitId)),
        );
      }
      return next;
    });
    setDefense((prev) => {
      const next: Record<number, Record<string, number>> = {};
      for (let wave = 0; wave < MAX_WAVES; wave++) {
        next[wave] = Object.fromEntries(
          Object.entries(prev[wave] ?? {}).filter(([unit]) => allowed.has(unit as UnitId)),
        );
      }
      return next;
    });
    const attackPresetsForMode = wavePresets(mode, amphibious)[mode];
    for (let wave = 0; wave < MAX_WAVES; wave++) {
      updateWave(wave, {
        attackOolPreset: attackPresetsForMode[0]?.id ?? DEFAULT_WAVE_CONFIG.attackOolPreset,
        defenseOolPreset: defenderOolPresets[mode][0]?.id ?? DEFAULT_WAVE_CONFIG.defenseOolPreset,
        attackOol: undefined,
        defenseOol: undefined,
      });
    }
  }, [mode, amphibious, updateWave, wavePresets]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!drawer && !retreatPopover) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawer(null);
        setRetreatPopover(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawer, retreatPopover]);

  useEffect(() => {
    document.title = title.trim() || 'Axis & Allies 1942 Calculator';
  }, [title]);

  const validation = useMemo(
    () => validateArmySizes(attack, defense, numWaves),
    [attack, defense, numWaves],
  );
  const canCalculate = validation.valid;

  const setUnit = useCallback(
    (side: 'attack' | 'defense', wave: number, unit: string, count: number) => {
      const updater = side === 'attack' ? setAttack : setDefense;
      updater((prev) => {
        const waveUnits = { ...(prev[wave] ?? {}) };
        if (count === 0) delete waveUnits[unit];
        else waveUnits[unit] = count;
        return { ...prev, [wave]: waveUnits };
      });
      setResult(null);
      setError(null);
      setComplexityWarning(null);
    },
    [],
  );

  const swapSides = useCallback(() => {
    setAttack((prevAttack) => {
      const next = { ...prevAttack };
      for (let wave = 0; wave < numWaves; wave++) {
        const filtered: Record<string, number> = {};
        for (const [unit, count] of Object.entries(defense[wave] ?? {})) {
          if (unit !== 'aa' && count > 0) filtered[unit] = count;
        }
        next[wave] = filtered;
      }
      return next;
    });
    setDefense((prevDefense) => {
      const next = { ...prevDefense };
      for (let wave = 0; wave < numWaves; wave++) {
        const filtered: Record<string, number> = {};
        for (const [unit, count] of Object.entries(attack[wave] ?? {})) {
          if (count <= 0) continue;
          if (mode === 'land' && (unit === 'cru' || unit === 'bat')) continue;
          if (unit === 'aa') continue;
          filtered[unit] = count;
        }
        next[wave] = filtered;
      }
      return next;
    });
    setResult(null);
    setError(null);
  }, [attack, defense, mode, numWaves]);

  const swapWave = useCallback((side: 'attack' | 'defense', from: number, to: number) => {
    const updater = side === 'attack' ? setAttack : setDefense;
    updater((prev) => {
      const next = { ...prev };
      const fromUnits = { ...(prev[from] ?? {}) };
      const toUnits = { ...(prev[to] ?? {}) };
      if (side === 'defense' && from === 0) {
        for (const [unit, count] of Object.entries(toUnits)) {
          if (count < 0) delete toUnits[unit];
        }
      }
      next[from] = toUnits;
      next[to] = fromUnits;
      return next;
    });
    setResult(null);
    setError(null);
  }, []);

  const resetUnits = useCallback(() => {
    setAttack(emptyWaves());
    setDefense(emptyWaves());
    setResult(null);
    setError(null);
    setComplexityWarning(null);
    setToast('Unit counts reset');
  }, [emptyWaves]);

  const resetAll = useCallback(() => {
    setAttack(emptyWaves());
    setDefense(emptyWaves());
    setMode('land');
    setNumWaves(1);
    setDiceMode('standard');
    setAmphibious(false);
    setTerritoryValue(0);
    setIsDeadzone(false);
    setInProgress(false);
    setResult(null);
    setError(null);
    setComplexityWarning(null);
    setTitle('');
    for (let wave = 0; wave < MAX_WAVES; wave++) {
      updateWave(wave, {
        ...DEFAULT_WAVE_CONFIG,
        attackOol: undefined,
        defenseOol: undefined,
      });
    }
    setToast('Calculator reset');
  }, [emptyWaves, updateWave]);

  const applyRetreatPopover = useCallback(
    (nextType: RetreatType, threshold: number) => {
      if (!retreatPopover) return;
      updateWave(retreatPopover.wave, applyRetreat(nextType, threshold));
      setRetreatPopover(null);
      setResult(null);
    },
    [retreatPopover, updateWave],
  );

  const visibleHistory = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    const list = history.filter((entry) => {
      if (settings.hideUnnamedHistory && !entry.name.trim()) return false;
      if (!search) return true;
      return entry.name.toLowerCase().includes(search);
    });
    if (settings.historySortOrder === 'date') {
      return [...list].sort((a, b) => b.timestamp - a.timestamp);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [history, historySearch, settings.hideUnnamedHistory, settings.historySortOrder]);

  const onModeChange = (next: BattleMode) => {
    setMode(next);
    setResult(null);
    setError(null);
  };

  const copyShareLink = () => {
    const input = buildCurrentInput();
    const hash = encodeStateToHash(input, title);
    const url = window.location.origin + window.location.pathname + hash;
    window.history.replaceState(null, '', hash);
    lastInputRef.current = input;
    const write = navigator.clipboard?.writeText(url);
    if (write) {
      write
        .then(() => setToast('Share link copied to clipboard'))
        .catch(() => setToast('Unable to copy link'));
    } else {
      setToast(`Share link: ${url}`);
    }
  };

  const filteredRetreatTypes = RETREAT_TYPES.filter((option) => mode !== 'sea' || option.naval);

  return (
    <div className={`beta-app beta-app--${settings.width}`}>
      <div className={`beta-container beta-container--${settings.width}`}>
        <header className="beta-header">
          <button
            type="button"
            className="icon-button"
            onClick={() => setDrawer(drawer === 'menu' ? null : 'menu')}
            aria-label="Open menu"
            title="Menu"
          >
            <Icon name="menu" />
          </button>
          <div className="beta-header__title">
            <input
              className="beta-title"
              value={title}
              maxLength={60}
              placeholder="Axis & Allies 1942 Calculator"
              aria-label="Battle title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="beta-header__actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setDrawer(drawer === 'settings' ? null : 'settings')}
              aria-label="Settings"
              title="Settings"
            >
              <Icon name="settings" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setDrawer(drawer === 'common' ? null : 'common')}
              aria-label="Common battles"
              title="Common battles"
            >
              <Icon name="star" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setDrawer(drawer === 'history' ? null : 'history')}
              aria-label="History"
              title="History"
            >
              <Icon name="history" />
            </button>
          </div>
        </header>

        {page === 'calculator' ? (
          <>
            <div className="beta-top-controls">
              <div className="beta-radio-group" role="radiogroup" aria-label="Battle mode">
                <label className="beta-radio">
                  <input
                    type="radio"
                    name="mode"
                    value="land"
                    checked={mode === 'land'}
                    onChange={() => onModeChange('land')}
                  />
                  Land
                </label>
                <label className="beta-radio">
                  <input
                    type="radio"
                    name="mode"
                    value="sea"
                    checked={mode === 'sea'}
                    onChange={() => onModeChange('sea')}
                  />
                  Sea
                </label>
                <label className="beta-radio">
                  <input
                    type="radio"
                    name="mode"
                    value="sbr"
                    checked={mode === 'sbr'}
                    onChange={() => onModeChange('sbr')}
                  />
                  SBR
                </label>
              </div>

              <div className="beta-advanced-top">
                {mode === 'land' ? (
                  <div className="beta-toggle-line">
                    <CheckboxControl
                      label="Amphibious assault"
                      checked={amphibious}
                      onChange={setAmphibious}
                    />
                  </div>
                ) : null}
                <div className="beta-select-row">
                  {mode !== 'sbr' ? (
                    <SelectField
                      className="field--waves"
                      label="Waves"
                      value={String(numWaves)}
                      options={Array.from({ length: maxWaves }, (_, index) => ({
                        value: String(index + 1),
                        label: `${index + 1} wave${index === 0 ? '' : 's'}`,
                      }))}
                      onChange={(value) => setNumWaves(Number(value) || 1)}
                    />
                  ) : null}
                  <SelectField
                    className="field--dice"
                    label="Dice mode"
                    value={diceMode}
                    options={[
                      { value: 'standard', label: 'Standard' },
                      { value: 'lowluck', label: 'Low luck' },
                      { value: 'biased', label: 'Biased' },
                    ]}
                    onChange={(value) => setDiceMode(value as 'standard' | 'lowluck' | 'biased')}
                  />
                </div>
                {mode === 'sbr' ? (
                  <CheckboxControl
                    label="Battle in progress"
                    checked={inProgress}
                    onChange={setInProgress}
                  />
                ) : null}
              </div>

              <div className="beta-mode-actions">
                <button
                  type="button"
                  className="reset-action"
                  onClick={resetUnits}
                  aria-label="Reset units"
                  title="Reset units"
                >
                  <Icon name="delete" size={18} />
                  <span className="reset-action__label">Reset units</span>
                </button>
                <button
                  type="button"
                  className="reset-action"
                  onClick={resetAll}
                  aria-label="Reset all"
                  title="Reset all"
                >
                  <Icon name="block" size={18} />
                  <span className="reset-action__label">Reset all</span>
                </button>
              </div>
            </div>

            {mode !== 'sbr' ? (
              <ConfigSection
                mode={mode}
                numWaves={numWaves}
                amphibious={amphibious}
                waveConfigs={waveConfigs}
                inProgress={inProgress}
                onInProgress={setInProgress}
                territoryValue={territoryValue}
                onTerritoryValue={setTerritoryValue}
                isDeadzone={isDeadzone}
                onDeadzone={setIsDeadzone}
                onUpdateWave={updateWave}
                exhaustiveOOL={settings.exhaustiveOOL}
                stackedCheckboxes={stackedCheckboxes}
                onRetreatClick={(wave, rect) =>
                  setRetreatPopover({
                    wave,
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 330)),
                    top: Math.min(rect.bottom + 4, Math.max(8, window.innerHeight - 260)),
                  })
                }
              />
            ) : null}

            <UnitGrid
              mode={mode}
              numWaves={numWaves}
              amphibious={amphibious}
              attack={attack}
              defense={defense}
              onUnitChange={(side, wave, unit, count) => setUnit(side, wave, unit, count)}
              onSwapSides={swapSides}
              onSwapWave={swapWave}
            />

            <button
              type="button"
              className="beta-calculate"
              disabled={!canCalculate}
              onClick={() => {
                setRetreatPopover(null);
                runBattle({ saveToHistory: true });
              }}
            >
              Calculate
            </button>

            {error ? <div className="results__error">{error}</div> : null}
            {complexityWarning ? (
              <div className="results__warning">
                This battle is too complex to evaluate exactly. Try fewer units, fewer waves, a
                simpler order of loss, or raise the complexity threshold in Settings → Advanced
                options.
              </div>
            ) : null}

            {result ? (
              <Results
                result={result}
                numWaves={numWaves}
                settings={{
                  ipcDiffDisplay: settings.ipcDiffDisplay,
                  hideUnlikely: settings.hideUnlikely,
                  probabilityDecimals: settings.probabilityDecimals,
                  ipcDecimals: settings.ipcDecimals,
                }}
              />
            ) : null}
          </>
        ) : (
          <StaticPage page={page} onBack={() => setPage('calculator')} version="2.2.4" />
        )}
      </div>

      <Drawer
        open={drawer === 'menu'}
        side="left"
        title="Axis & Allies 1942 Calculator"
        onClose={() => setDrawer(null)}
        className="drawer-panel--menu"
        modal
        footer={
          <>
            Powered by aacalc2@2.2.4
            <br />
            UI redesign preview · Copyright 2022-2026
          </>
        }
      >
        <nav className="menu-nav">
          {[
            { page: 'overview' as Page, label: 'Overview', icon: 'list' as const },
            { page: 'calculator' as Page, label: 'Calculator', icon: 'calculator' as const },
            { page: 'faq' as Page, label: 'FAQ', icon: 'help' as const },
            { page: 'about' as Page, label: 'About', icon: 'info' as const },
          ].map((item) => (
            <button
              type="button"
              className="menu-nav__item"
              key={item.label}
              onClick={() => {
                setPage(item.page);
                setDrawer(null);
              }}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
      </Drawer>

      <Drawer
        open={drawer === 'settings'}
        side="right"
        title="Settings"
        onClose={() => setDrawer(null)}
        className="drawer-panel--settings"
      >
        <div className="settings-section">
          <SettingRow
            title="IPC difference"
            description="Show the average IPC gain as an absolute number or as a return on investment percentage."
          >
            <SelectField
              className="field--outlined"
              compact
              label="IPC difference"
              value={settings.ipcDiffDisplay}
              options={[
                { value: 'absolute', label: 'Absolute' },
                { value: 'roi', label: 'ROI' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  ipcDiffDisplay: value as BetaSettings['ipcDiffDisplay'],
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Exhaustive OOL"
            description="Change the OOL picker to an autocomplete field. Nearly all OOLs will be available, with some restrictions."
          >
            <SwitchControl
              label="Exhaustive OOL"
              checked={settings.exhaustiveOOL}
              onChange={(checked) => setSettings((prev) => ({ ...prev, exhaustiveOOL: checked }))}
            />
          </SettingRow>
          <SettingRow
            title="Hide unlikely outcomes"
            description="Hide low-probability rows in the casualty and profit tables. The 95/68/50 confidence intervals are still shown."
          >
            <SelectField
              className="field--outlined"
              compact
              label="Hide unlikely outcomes"
              value={settings.hideUnlikely}
              options={[
                { value: 'off', label: 'Off' },
                { value: '0.01', label: '< 0.01%' },
                { value: '0.1', label: '< 0.1%' },
                { value: '1', label: '< 1%' },
                { value: '5', label: '< 5%' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  hideUnlikely: value as BetaSettings['hideUnlikely'],
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Hide unnamed history entries"
            description="Hide calculations from the History drawer for which you did not provide a custom title."
          >
            <SwitchControl
              label="Hide unnamed history entries"
              checked={settings.hideUnnamedHistory}
              onChange={(checked) =>
                setSettings((prev) => ({ ...prev, hideUnnamedHistory: checked }))
              }
            />
          </SettingRow>
          <SettingRow
            title="History sort order"
            description="Configure the sort order for entries in the History drawer."
          >
            <SelectField
              className="field--outlined"
              compact
              label="History sort order"
              value={settings.historySortOrder}
              options={[
                { value: 'title', label: 'By title' },
                { value: 'date', label: 'By date' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  historySortOrder: value as BetaSettings['historySortOrder'],
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Show History details"
            description="Show survive %, conquer % and IPC difference in the History drawer."
          >
            <SwitchControl
              label="Show History details"
              checked={settings.showHistoryDetails}
              onChange={(checked) =>
                setSettings((prev) => ({ ...prev, showHistoryDetails: checked }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Width"
            description="Configure the max width of the calculator, regardless of the browser window size."
          >
            <SelectField
              className="field--outlined"
              compact
              label="Width"
              value={settings.width}
              options={[
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra large' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  width: value as BetaSettings['width'],
                }))
              }
            />
          </SettingRow>
          <SettingRow title="Dark Mode" description="Automatic follows your system preference.">
            <SelectField
              className="field--outlined"
              compact
              label="Dark Mode"
              value={settings.darkMode}
              options={[
                { value: 'auto', label: 'Automatic' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  darkMode: value as BetaSettings['darkMode'],
                }))
              }
            />
          </SettingRow>
        </div>
        <div className="settings-section">
          <div className="settings-section__heading">
            <div className="settings-section__title">Advanced options</div>
            <div className="settings-section__desc">
              Display precision and engine tuning for calculated results.
            </div>
          </div>
          <SettingRow
            title="Probability decimal places"
            description="Decimals shown for probabilities in the overview, casualty tables, and profit distribution. Changing this also resets the prune thresholds below."
          >
            <TextField
              className="field--outlined"
              compact
              label="Probability decimal places"
              type="number"
              min={0}
              max={10}
              step={1}
              value={String(settings.probabilityDecimals)}
              onChange={(value) =>
                setSettings((prev) => {
                  const probabilityDecimals = clampDecimalPlaces(value);
                  return {
                    ...prev,
                    probabilityDecimals,
                    pruneThreshold: computeThreshold(probabilityDecimals),
                    reportPruneThreshold: computeThreshold(probabilityDecimals),
                  };
                })
              }
            />
          </SettingRow>
          <SettingRow
            title="IPC loss decimal places"
            description="Decimals shown for IPC and profit values in the overview and profit distribution."
          >
            <TextField
              className="field--outlined"
              compact
              label="IPC loss decimal places"
              type="number"
              min={0}
              max={10}
              step={1}
              value={String(settings.ipcDecimals)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  ipcDecimals: clampDecimalPlaces(value),
                }))
              }
            />
          </SettingRow>
          <div className="settings-subheading">Engine</div>
          <SettingRow
            title="Verbose level"
            description="Engine logging verbosity. 0 disables verbose logging."
          >
            <TextField
              className="field--outlined"
              compact
              label="Verbose level"
              type="number"
              min={0}
              step={1}
              value={String(settings.verboseLevel)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  verboseLevel: parseNonNegativeInt(value, 0),
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Prune threshold"
            description="Probabilities below this value are pruned while solving. Lower values are slower but more precise."
          >
            <TextField
              className="field--outlined"
              compact
              label="Prune threshold"
              type="number"
              min={0}
              step="1e-15"
              value={String(settings.pruneThreshold)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  pruneThreshold: parseThreshold(value, computeThreshold(prev.probabilityDecimals)),
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Report prune threshold"
            description="Probabilities below this value are pruned when building the result tables."
          >
            <TextField
              className="field--outlined"
              compact
              label="Report prune threshold"
              type="number"
              min={0}
              step="1e-15"
              value={String(settings.reportPruneThreshold)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  reportPruneThreshold: parseThreshold(
                    value,
                    computeThreshold(prev.probabilityDecimals),
                  ),
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Complexity threshold"
            description="Battles whose estimated complexity exceeds this value are blocked with a warning. Raise it to allow heavier battles."
          >
            <TextField
              className="field--outlined"
              compact
              label="Complexity threshold"
              type="number"
              min={0}
              step={10000}
              value={String(settings.complexityThreshold)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  complexityThreshold: parseNonNegativeInt(value, MAX_COMPLEXITY),
                }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Sort mode"
            description="How the engine orders units internally. IPC cost is the default."
          >
            <SelectField
              className="field--outlined"
              compact
              label="Sort mode"
              value={settings.sortMode}
              options={[
                { value: 'unit_count', label: 'Unit count' },
                { value: 'ipc_cost', label: 'IPC cost' },
              ]}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  sortMode: value as BetaSettings['sortMode'],
                }))
              }
            />
          </SettingRow>
          <div className="settings-subheading">Experimental</div>
          <SettingRow
            title="Fix defender profit via convolution"
            description="Replace later-wave defender profit with a convolution of the wave and prior distributions, assuming independence."
          >
            <SwitchControl
              label="Fix defender profit via convolution"
              checked={settings.experimentalConvolution}
              onChange={(checked) =>
                setSettings((prev) => ({ ...prev, experimentalConvolution: checked }))
              }
            />
          </SettingRow>
          <SettingRow
            title="Future-wave-aware EV retreat"
            description="Make expected-value retreat decisions aware of the remaining waves."
          >
            <SwitchControl
              label="Future-wave-aware EV retreat"
              checked={settings.evFutureWave}
              onChange={(checked) => setSettings((prev) => ({ ...prev, evFutureWave: checked }))}
            />
          </SettingRow>
          <SettingRow
            title="Allow retreat on round zero"
            description="Allow retreat decisions before the first combat round."
          >
            <SwitchControl
              label="Allow retreat on round zero"
              checked={settings.retreatZeroRound}
              onChange={(checked) => setSettings((prev) => ({ ...prev, retreatZeroRound: checked }))}
            />
          </SettingRow>
        </div>
        <div className="settings-actions">
          <button
            type="button"
            className="beta-text-button"
            onClick={() => {
              setHistory([]);
              setToast('History cleared');
            }}
          >
            Clear history
          </button>
          <button
            type="button"
            className="beta-text-button"
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              setToast('Default settings restored');
            }}
          >
            Restore default settings
          </button>
          <button type="button" className="beta-text-button" onClick={copyShareLink}>
            Copy share link
          </button>
        </div>
      </Drawer>

      <Drawer
        open={drawer === 'common'}
        side="right"
        title="Common battles"
        onClose={() => setDrawer(null)}
        className="drawer-panel--common"
      >
        <ul className="drawer-list">
          {COMMON_BATTLES.map((preset) => (
            <li key={preset.name}>
              <button
                type="button"
                className="drawer-list__item"
                onClick={() => loadCommonBattle(preset)}
              >
                <span className="drawer-list__item-text">{preset.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </Drawer>

      <Drawer
        open={drawer === 'history'}
        side="right"
        title="History"
        onClose={() => setDrawer(null)}
        className="drawer-panel--history"
      >
        <div className="history-search">
          <div className="search-field">
            <Icon name="search" />
            <input
              value={historySearch}
              placeholder="Search"
              aria-label="Search history"
              onChange={(event) => setHistorySearch(event.target.value)}
            />
          </div>
        </div>
        {visibleHistory.length === 0 ? (
          <div className="history-empty">No saved battles yet.</div>
        ) : (
          <div>
            {visibleHistory.map((entry) => (
              <div className="history-entry" key={`${entry.group}/${entry.name}`}>
                <button
                  type="button"
                  className="history-entry__main"
                  onClick={() => loadHistoryEntry(entry)}
                >
                  <span className="history-entry__name">{entry.name}</span>
                  {settings.showHistoryDetails ? (
                    <span className="history-entry__meta">
                      {entry.input.mode ?? 'land'} · {entry.input.numWaves ?? 1} wave
                      {(entry.input.numWaves ?? 1) === 1 ? '' : 's'} ·{' '}
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="icon-button history-entry__delete"
                  onClick={() => {
                    setHistory((prev) => removeHistoryEntry(prev, entry.group, entry.name));
                    setToast('History entry removed');
                  }}
                  aria-label={`Delete ${entry.name}`}
                  title="Delete"
                >
                  <Icon name="delete" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {retreatPopover ? (
        <RetreatPopover
          config={waveConfigs[retreatPopover.wave]}
          left={retreatPopover.left}
          top={retreatPopover.top}
          types={filteredRetreatTypes}
          onClose={() => setRetreatPopover(null)}
          onApply={(type, threshold) => applyRetreatPopover(type, threshold)}
        />
      ) : null}

      {toast ? <div className="beta-toast">{toast}</div> : null}
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting">
      <div className="setting__text">
        <div className="setting__title">{title}</div>
        <div className="setting__desc">{description}</div>
      </div>
      <div className="setting__control">{children}</div>
    </div>
  );
}

function RetreatPopover({
  config,
  left,
  top,
  types,
  onClose,
  onApply,
}: {
  config: WaveConfig;
  left: number;
  top: number;
  types: typeof RETREAT_TYPES;
  onClose: () => void;
  onApply: (type: RetreatType, threshold: number) => void;
}) {
  const initialType = (config.retreatMode || 'unitCount') as RetreatType;
  const [type, setType] = useState<RetreatType>(
    types.some((option) => option.value === initialType) ? initialType : 'unitCount',
  );
  const [threshold, setThreshold] = useState(String(retreatThreshold(config)));
  const numericThreshold = Number(threshold) || 0;
  const summary =
    type === 'unitCount'
      ? `Retreat when there are ≤ ${numericThreshold} attacking units left.`
      : type === 'expectedIpcProfit'
        ? `Retreat when expected IPC profit is below ${numericThreshold}.`
        : type === 'probabilityWins'
          ? `Retreat when the probability of winning is at or below ${numericThreshold}.`
          : type === 'strafe'
            ? `Retreat when the probability of killing all defenders is above ${numericThreshold}.`
            : `Retreat when the probability of losing air is above ${numericThreshold}.`;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1290 }}
        onClick={onClose}
        role="presentation"
      />
      <div className="popover" style={{ left, top }} role="dialog" aria-label="Retreat settings">
        <div className="popover__row">
          <SelectField
            className="field--outlined"
            label="Retreat Type"
            value={type}
            options={types.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) => setType(value as RetreatType)}
          />
        </div>
        <div className="popover__row">
          <TextField
            className="field--outlined"
            label="Threshold"
            type="number"
            step="any"
            value={threshold}
            onChange={setThreshold}
          />
        </div>
        <p className="popover__summary">{summary}</p>
        <div className="popover__actions">
          <button
            type="button"
            className="beta-calculate"
            style={{ width: 'auto', minWidth: 64, marginTop: 0 }}
            onClick={() => onApply(type, numericThreshold)}
          >
            OK
          </button>
          <button
            type="button"
            className="beta-text-button"
            onClick={() => {
              onApply('unitCount', 0);
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}

function StaticPage({
  page,
  onBack,
  version,
}: {
  page: Exclude<Page, 'calculator'>;
  onBack: () => void;
  version: string;
}) {
  return (
    <div className="page">
      <button type="button" className="beta-text-button" onClick={onBack}>
        ← Back to calculator
      </button>
      {page === 'overview' ? (
        <>
          <h1>Overview</h1>
          <p>
            Axis &amp; Allies 1942 Calculator is a fast, exact probability calculator for land, sea
            and strategic bombing battles.
          </p>
          <p>
            Pick a mode, enter the attacking and defending units, choose an order of loss and
            calculate. Waves, dice modes, retreat rules and naval options are always available.
          </p>
          <p>
            Results include the average number of rounds, survival and conquest chances, IPC
            outcomes, and full casualty tables with confidence intervals.
          </p>
        </>
      ) : page === 'faq' ? (
        <>
          <h1>FAQ</h1>
          <h2>Why is the Calculate button disabled?</h2>
          <p>Both sides need at least one unit in the battle.</p>
          <h2>What is order of loss?</h2>
          <p>
            The order in which units are removed as casualties. It affects the exact probability of
            each outcome.
          </p>
          <h2>Do I need to save?</h2>
          <p>
            No. Give the battle a title and press Calculate to add it to History; the URL also
            updates so you can share it.
          </p>
        </>
      ) : (
        <>
          <h1>About</h1>
          <p>
            This redesigned front end is built on the open-source aacalc2 engine, version {version}.
            The calculation engine, share encoding and history model are reused from the existing
            app.
          </p>
          <p>
            The interface is a behavioral reimplementation inspired by beta.aa1942calc.com. Unit
            artwork is original SVG line art rather than copied game assets.
          </p>
        </>
      )}
    </div>
  );
}
