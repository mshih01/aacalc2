import { describe, expect, it } from 'vitest';
import type { BattleInput } from '../types.ts';
import {
  DEFAULT_ARMY_OPTIMIZER_PARAMS,
  buildArmyRecommendInput,
  type ArmyOptimizerParams,
} from './armyOptimizer.ts';

function battleInput(overrides: Partial<BattleInput> = {}): BattleInput {
  return {
    attack: { 0: { inf: 3, art: 1 } },
    defense: { 0: { inf: 2 } },
    attackOol: { 0: ['inf', 'art'] },
    defenseOol: { 0: ['inf'] },
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
    pruneThreshold: 1e-10,
    reportPruneThreshold: 1e-10,
    sortMode: 'ipc_cost',
    territoryValue: 0,
    isDeadzone: false,
    numWaves: 1,
    amphibious: false,
    experimentalConvolution: false,
    evFutureWave: false,
    retreatZeroRound: false,
    ...overrides,
  };
}

const params: ArmyOptimizerParams = {
  ...DEFAULT_ARMY_OPTIMIZER_PARAMS,
  optimizeMode: 'targetWinPercentage',
  optimizeFor: 'defender',
  targetPercentage: 0.8,
  numRecommendations: 5,
  pwinMode: 'destroys',
};

describe('buildArmyRecommendInput', () => {
  it('optimizes the selected side and uses the target-search solver', () => {
    const input = buildArmyRecommendInput(battleInput(), params);

    expect(input.attDefType).toBe('defender');
    expect(input.solveType).toBe('fuzzyBinarySearch');
    expect(input.numRecommendations).toBe(1);
    expect(input.targetPercentage).toBe(0.8);
    expect(input.pwinMode).toBe('destroys');
    expect(input.wave_info[0].pwinMode).toBe('destroys');
    expect(input.wave_info[0].attack.units).toEqual({ inf: 3, art: 1 });
    expect(input.wave_info[0].defense.units).toEqual({ inf: 2 });
  });

  it('forces the attacker and grid search for max-profit mode', () => {
    const input = buildArmyRecommendInput(battleInput(), {
      ...params,
      optimizeMode: 'maxProfit',
      optimizeFor: 'defender',
      numRecommendations: 7,
    });

    expect(input.attDefType).toBe('attacker');
    expect(input.optimizeMode).toBe('maxProfit');
    expect(input.solveType).toBe('gridSearch');
    expect(input.numRecommendations).toBe(7);
  });

  it('uses grid search and the selected side for target-profit mode', () => {
    const input = buildArmyRecommendInput(battleInput(), {
      ...params,
      optimizeMode: 'targetProfit',
      optimizeFor: 'defender',
      targetProfit: -20,
    });

    expect(input.attDefType).toBe('defender');
    expect(input.optimizeMode).toBe('targetProfit');
    expect(input.solveType).toBe('gridSearch');
    expect(input.targetProfit).toBe(-20);
    expect(input.numRecommendations).toBe(1);
  });

  it('uses only wave 1 even when the battle has multiple waves', () => {
    const input = buildArmyRecommendInput(
      battleInput({
        numWaves: 3,
        attack: { 0: { inf: 2 }, 1: { art: 5 }, 2: { arm: 9 } },
        defense: { 0: { inf: 1 }, 1: { inf: 6 } },
      }),
      params,
    );

    expect(input.wave_info).toHaveLength(1);
    expect(input.wave_info[0].attack.units).toEqual({ inf: 2 });
    expect(input.wave_info[0].defense.units).toEqual({ inf: 1 });
  });

  it('clamps targets, recommendation counts, and minimum armies', () => {
    const high = buildArmyRecommendInput(battleInput(), {
      ...params,
      targetPercentage: 2,
      optimizeMode: 'maxProfit',
      numRecommendations: 99,
    });
    expect(high.targetPercentage).toBe(1);
    expect(high.numRecommendations).toBe(10);

    const low = buildArmyRecommendInput(battleInput(), {
      ...params,
      targetPercentage: -1,
      optimizeMode: 'maxProfit',
      numRecommendations: 0,
    });
    expect(low.targetPercentage).toBe(0);
    expect(low.numRecommendations).toBe(1);

    const attackerParams = { ...params, optimizeFor: 'attacker' as const };
    const withMin = buildArmyRecommendInput(battleInput(), attackerParams, {
      inf: 2,
      art: 9,
    });
    expect(withMin.minArmy).toEqual({ inf: 2, art: 1 });

    const zeroMin = buildArmyRecommendInput(battleInput(), attackerParams, { inf: 0 });
    expect(zeroMin.minArmy).toBeUndefined();
  });
});
