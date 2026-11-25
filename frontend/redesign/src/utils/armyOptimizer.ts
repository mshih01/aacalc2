import type { Army, ArmyRecommendInput, OptimizeMode, UnitIdentifier } from 'aacalc2';
import { unitIds, type BattleInput } from '../types.ts';
import { buildMultiwaveInput } from '../engine.ts';

export type ArmyOptimizeSide = 'attacker' | 'defender';
export type ArmyPwinMode = 'takes' | 'destroys';

export interface ArmyOptimizerParams {
  optimizeMode: OptimizeMode;
  optimizeFor: ArmyOptimizeSide;
  targetPercentage: number;
  // Target expected attacker IPC profit.  Defender optimization requires
  // profit <= targetProfit; attacker optimization requires profit >= it.
  targetProfit: number;
  numRecommendations: number;
  pwinMode: ArmyPwinMode;
}

export const DEFAULT_ARMY_OPTIMIZER_PARAMS: ArmyOptimizerParams = {
  optimizeMode: 'targetWinPercentage',
  optimizeFor: 'attacker',
  targetPercentage: 0.9,
  targetProfit: -20,
  numRecommendations: 3,
  pwinMode: 'destroys',
};

/** Max-profit mode only optimizes the attacker's army. */
export function optimizerSide(params: ArmyOptimizerParams): ArmyOptimizeSide {
  return params.optimizeMode === 'maxProfit' ? 'attacker' : params.optimizeFor;
}

export function hasPositiveUnits(units: Record<string, number> | undefined): boolean {
  return Object.values(units ?? {}).some((count) => count > 0);
}

/** Unit keys with a positive count, in the calculator's canonical order. */
export function positiveUnitKeys(units: Record<string, number> | undefined): string[] {
  const order = new Map<string, number>(unitIds.map((id, index) => [id, index]));
  return Object.entries(units ?? {})
    .filter(([, count]) => count > 0)
    .map(([unit]) => unit)
    .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeMinArmy(minArmy: Record<string, number>, maxArmy: Army): Army | undefined {
  const out: Army = {};
  let any = false;
  for (const [unit, max] of Object.entries(maxArmy)) {
    if ((max ?? 0) <= 0) continue;
    const value = clamp(Math.floor(minArmy[unit] ?? 0), 0, max);
    if (value > 0) {
      out[unit as UnitIdentifier] = value;
      any = true;
    }
  }
  return any ? out : undefined;
}

/**
 * Build the optimizer input for the first wave only. `armyRecommend` uses
 * `wave_info[0]` as the maximum army, and the UI optimizes the current wave 1
 * setup rather than trying to model wave carry-over.
 */
export function buildArmyRecommendInput(
  input: BattleInput,
  params: ArmyOptimizerParams,
  minArmy?: Record<string, number>,
): ArmyRecommendInput {
  const base = buildMultiwaveInput({ ...input, numWaves: 1 });
  const side = optimizerSide(params);
  const wave = {
    ...base.wave_info[0],
    // `buildMultiwaveInput` pins pwinMode to "takes"; the optimizer exposes it.
    pwinMode: params.pwinMode,
  };
  const maxArmy = side === 'attacker' ? wave.attack.units : wave.defense.units;

  return {
    ...base,
    wave_info: [wave],
    attDefType: side,
    optimizeMode: params.optimizeMode,
    // Max profit returns N; target-win and target-profit return one army.
    numRecommendations:
      params.optimizeMode === 'maxProfit' ? clamp(Math.round(params.numRecommendations), 1, 10) : 1,
    targetPercentage: clamp(params.targetPercentage, 0, 1),
    targetProfit: Number.isFinite(params.targetProfit) ? params.targetProfit : 0,
    pwinMode: params.pwinMode,
    // Target-profit feasibility is not monotonic in army cost (especially with
    // EV retreat), so fuzzy binary search does not apply.  Grid search handles
    // the arbitrary objective; max-profit uses it as well.
    solveType: params.optimizeMode === 'targetWinPercentage' ? 'fuzzyBinarySearch' : 'gridSearch',
    minArmy: minArmy ? normalizeMinArmy(minArmy, maxArmy) : undefined,
  };
}
