import {
  armyRecommend,
  getSubArmies,
  multiwaveExternal,
  type Army,
  type ArmyRecommendInput,
  type MultiwaveInput,
  type SolveType,
  type WaveInput,
} from './index.js';
import type { AttDefType } from './optimize.js';
import { getArmyCost } from './external.js';
import { test, expect } from 'vitest';

function zeroArmy(army: Army): Army {
  const result: Army = {};
  for (const uid of Object.keys(army)) {
    result[<keyof Army>uid] = 0;
  }
  return result;
}

function oneArmy(army: Army): Army {
  const result: Army = {};
  for (const uid of Object.keys(army)) {
    result[<keyof Army>uid] = 1;
  }
  return result;
}

function hasUnits(army: Army): boolean {
  return Object.values(army).some((count) => (count ?? 0) > 0);
}

function sameArmy(a: Army, b: Army): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const uid = <keyof Army>key;
    if ((a[uid] ?? 0) !== (b[uid] ?? 0)) {
      return false;
    }
  }
  return true;
}

function makeInput(
  attackUnits: Army = { inf: 10, art: 3, arm: 2 },
  defenseUnits: Army = { inf: 12, art: 4, arm: 2 },
  overrides: Partial<WaveInput> = {},
): MultiwaveInput {
  const wave: WaveInput = {
    attack: {
      units: attackUnits,
      ool: ['inf', 'art', 'arm', 'fig', 'bom'],
      takes: 0,
      aaLast: false,
    },
    defense: {
      units: defenseUnits,
      ool: ['aa', 'bom', 'inf', 'art', 'arm', 'fig'],
      takes: 0,
      aaLast: true,
    },
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: false,
    rounds: 100,
    retreat_threshold: 0,
    pwinMode: 'destroys',
    ...overrides,
  };
  return {
    wave_info: [wave],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    is_deadzone: false,
    territory_value: 0,
    do_roundless_eval: true,
    retreat_round_zero: false,
  };
}

function makeRecommendInput(
  attDefType: AttDefType,
  solveType: SolveType,
  targetProfit: number,
  overrides: Partial<ArmyRecommendInput> = {},
  input: MultiwaveInput = makeInput(),
): ArmyRecommendInput {
  return {
    ...input,
    attDefType,
    optimizeMode: 'targetProfit',
    targetProfit,
    solveType,
    pwinMode: 'destroys',
    ...overrides,
  };
}

interface ExhaustiveResult {
  army: Army;
  tuv: number;
  winPct: number;
  profit: number;
}

// Evaluate every legal non-empty sub-army exactly, using the same profit and
// win-probability conventions as the optimizer.
function exhaustive(input: ArmyRecommendInput): ExhaustiveResult[] {
  const attDefType = input.attDefType;
  const maxArmy =
    attDefType === 'attacker' ? input.wave_info[0].attack.units : input.wave_info[0].defense.units;
  const minArmy = input.minArmy ?? zeroArmy(maxArmy);
  const armies = getSubArmies(maxArmy, minArmy, oneArmy(maxArmy));
  const results: ExhaustiveResult[] = [];
  for (const [army, cost] of armies) {
    if (!hasUnits(army)) {
      continue;
    }
    const wave0 = input.wave_info[0];
    const wave: WaveInput = {
      ...wave0,
      attack: { ...wave0.attack, units: attDefType === 'attacker' ? army : wave0.attack.units },
      defense: {
        ...wave0.defense,
        units: attDefType === 'defender' ? army : wave0.defense.units,
      },
    };
    const output = multiwaveExternal({
      ...input,
      wave_info: [wave, ...input.wave_info.slice(1)],
    });
    const winPct =
      attDefType === 'defender' ? output.defense.survives[0] : output.attack.survives[0];
    const profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];
    results.push({ army, tuv: cost, winPct, profit });
  }
  return results;
}

function feasibleFor(
  results: ExhaustiveResult[],
  attDefType: AttDefType,
  targetProfit: number,
): ExhaustiveResult[] {
  return results.filter((result) =>
    attDefType === 'defender' ? result.profit <= targetProfit : result.profit >= targetProfit,
  );
}

function bestFeasible(
  results: ExhaustiveResult[],
  attDefType: AttDefType,
  targetProfit: number,
): ExhaustiveResult | undefined {
  const feasible = feasibleFor(results, attDefType, targetProfit);
  feasible.sort((a, b) => {
    if (a.tuv !== b.tuv) return a.tuv - b.tuv;
    return attDefType === 'defender' ? a.profit - b.profit : b.profit - a.profit;
  });
  return feasible[0];
}

function bestFallback(
  results: ExhaustiveResult[],
  attDefType: AttDefType,
  targetProfit: number,
): ExhaustiveResult | undefined {
  const sorted = [...results].sort((a, b) => {
    const av = attDefType === 'defender' ? a.profit - targetProfit : targetProfit - a.profit;
    const bv = attDefType === 'defender' ? b.profit - targetProfit : targetProfit - b.profit;
    if (av !== bv) return av - bv;
    return a.tuv - b.tuv;
  });
  return sorted[0];
}

test('exhaust defender target profit returns the minimum-TUV feasible army', () => {
  const input = makeRecommendInput(
    'defender',
    'exhaust',
    -2,
    {},
    makeInput(
      { inf: 10, art: 3, arm: 2 },
      { inf: 12, art: 4, arm: 2 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const results = exhaustive(input);
  const best = bestFeasible(results, 'defender', -2);
  expect(best).toBeDefined();

  const output = armyRecommend(input);
  expect(output.feasible).toBe(true);
  expect(output.recommendations).toHaveLength(1);
  const rec = output.recommendations[0];
  expect(rec.cost).toBeCloseTo(best!.tuv, 10);
  expect(rec.profit).toBeCloseTo(best!.profit, 10);
  expect(rec.winPct).toBeCloseTo(best!.winPct, 10);
  expect(rec.profit!).toBeLessThanOrEqual(-2);
  expect(getArmyCost(rec.army)).toBeCloseTo(rec.cost, 10);
  expect(results.some((result) => sameArmy(result.army, rec.army) && result.profit <= -2)).toBe(
    true,
  );
});

test('exhaust attacker target profit returns the minimum-TUV feasible army', () => {
  const input = makeRecommendInput(
    'attacker',
    'exhaust',
    2,
    {},
    makeInput(
      { inf: 5, art: 2, arm: 1 },
      { inf: 3, art: 1, arm: 1 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const results = exhaustive(input);
  const best = bestFeasible(results, 'attacker', 2);
  expect(best).toBeDefined();

  const output = armyRecommend(input);
  expect(output.feasible).toBe(true);
  const rec = output.recommendations[0];
  expect(rec.cost).toBeCloseTo(best!.tuv, 10);
  expect(rec.profit).toBeCloseTo(best!.profit, 10);
  expect(rec.profit!).toBeGreaterThanOrEqual(2);
});

test('target profit keeps the EV retreat thresholds active', () => {
  // The cheapest target-profit defender is different when EV retreat is on,
  // so the optimizer must not strip the threshold the way fuzzyBinarySearch
  // does for the target-win objective.
  const retreatInput = makeInput(
    { inf: 10, art: 3, arm: 2 },
    { inf: 12, art: 4, arm: 2 },
    { retreat_expected_ipc_profit_threshold: 0 },
  );
  const input = makeRecommendInput('defender', 'exhaust', -2, {}, retreatInput);
  const rec = armyRecommend(input).recommendations[0];

  const withRetreat = multiwaveExternal({
    ...retreatInput,
    wave_info: [
      {
        ...retreatInput.wave_info[0],
        defense: { ...retreatInput.wave_info[0].defense, units: rec.army },
      },
    ],
  });
  const withoutRetreatInput = {
    ...retreatInput,
    wave_info: [
      {
        ...retreatInput.wave_info[0],
        retreat_expected_ipc_profit_threshold: undefined,
        defense: { ...retreatInput.wave_info[0].defense, units: rec.army },
      },
    ],
  };
  const withoutRetreat = multiwaveExternal(withoutRetreatInput);
  const activeProfit = withRetreat.defense.ipcLoss[0] - withRetreat.attack.ipcLoss[0];
  const strippedProfit = withoutRetreat.defense.ipcLoss[0] - withoutRetreat.attack.ipcLoss[0];

  expect(Math.abs(activeProfit - strippedProfit)).toBeGreaterThan(1e-6);
  expect(rec.profit).toBeCloseTo(activeProfit, 10);
});

test('target profit uses the engine profit including territory and dead zone', () => {
  // In a dead zone the attacker's surviving ground units are charged in the
  // counterattack, so a tiny defender can already hold the attacker to a very
  // negative profit.  This is the engine profit the optimizer must use.
  const attack = { inf: 12, art: 5, arm: 5, fig: 3, bom: 3 };
  const defense = { inf: 8, art: 2, arm: 1, aa: 1 };
  const open = makeInput(attack, defense, { retreat_expected_ipc_profit_threshold: 0 });
  const deadzone: MultiwaveInput = { ...open, is_deadzone: true, territory_value: 2 };

  const openOutput = armyRecommend(makeRecommendInput('defender', 'exhaust', -20, {}, open));
  const deadzoneOutput = armyRecommend(
    makeRecommendInput('defender', 'exhaust', -20, {}, deadzone),
  );

  expect(deadzoneOutput.feasible).toBe(true);
  expect(deadzoneOutput.recommendations[0].profit).toBeLessThanOrEqual(-20);
  // Without the dead-zone charge the target is not reachable from this pool,
  // so the fallback is much more expensive than the dead-zone recommendation.
  expect(deadzoneOutput.recommendations[0].cost).toBeLessThan(openOutput.recommendations[0].cost);
});

test('target profit handles a non-monotonic feasible set', () => {
  // With a high EV retreat threshold this pool has a feasible island around
  // 23 IPC, then infeasible larger armies, then feasible armies again.  The
  // smallest feasible army is 6 inf + 1 aa, not the full army and not the
  // cheapest army that merely looks close to the target.
  const input = makeRecommendInput(
    'defender',
    'exhaust',
    1.96,
    {},
    makeInput(
      { inf: 6, art: 2, arm: 1, fig: 2 },
      { inf: 10, art: 3, arm: 2, aa: 1 },
      {
        retreat_expected_ipc_profit_threshold: 10,
      },
    ),
  );
  const results = exhaustive(input);
  const best = bestFeasible(results, 'defender', 1.96);
  expect(best).toBeDefined();
  expect(best!.tuv).toBeCloseTo(23, 10);

  const largerInfeasible = results.find((result) => result.tuv > best!.tuv && result.profit > 1.96);
  expect(largerInfeasible).toBeDefined();

  const output = armyRecommend(input);
  expect(output.feasible).toBe(true);
  expect(output.recommendations[0].cost).toBeCloseTo(23, 10);
  expect(output.recommendations[0].profit).toBeCloseTo(best!.profit, 10);
});

test('grid search matches the exhaustive target-profit optimum on a small pool', () => {
  const input = makeRecommendInput(
    'attacker',
    'gridSearch',
    1,
    { granularity: 5, beamWidth: 3 },
    makeInput(
      { inf: 5, art: 2, arm: 1 },
      { inf: 3, art: 1, arm: 1 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const results = exhaustive(input);
  const best = bestFeasible(results, 'attacker', 1);
  expect(best).toBeDefined();

  const output = armyRecommend(input);
  expect(output.feasible).toBe(true);
  const rec = output.recommendations[0];
  expect(rec.cost).toBeCloseTo(best!.tuv, 10);
  expect(rec.profit).toBeCloseTo(best!.profit, 10);
  expect(rec.profit!).toBeGreaterThanOrEqual(1);
});

test('linear search returns a target-profit recommendation with profit and win odds', () => {
  const input = makeRecommendInput(
    'attacker',
    'linearSearch',
    1,
    {},
    makeInput(
      { inf: 5, art: 2, arm: 1 },
      { inf: 3, art: 1, arm: 1 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const output = armyRecommend(input);
  expect(output.recommendations).toHaveLength(1);
  expect(output.recommendations[0].profit).toBeDefined();
  expect(output.recommendations[0].winPct).toBeDefined();
  expect(hasUnits(output.recommendations[0].army)).toBe(true);
});

test('an infeasible target returns the closest fallback and feasible=false', () => {
  const input = makeRecommendInput(
    'defender',
    'exhaust',
    -100,
    {},
    makeInput(
      { inf: 10, art: 3, arm: 2 },
      { inf: 12, art: 4, arm: 2 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const results = exhaustive(input);
  const fallback = bestFallback(results, 'defender', -100);
  expect(fallback).toBeDefined();

  const output = armyRecommend(input);
  expect(output.feasible).toBe(false);
  expect(output.recommendations).toHaveLength(1);
  const rec = output.recommendations[0];
  expect(rec.cost).toBeCloseTo(fallback!.tuv, 10);
  expect(rec.profit).toBeCloseTo(fallback!.profit, 10);
});

test('target profit respects minArmy', () => {
  const minArmy: Army = { inf: 10, art: 2 };
  const input = makeRecommendInput(
    'defender',
    'exhaust',
    -2,
    { minArmy },
    makeInput(
      { inf: 10, art: 3, arm: 2 },
      { inf: 12, art: 4, arm: 2 },
      {
        retreat_expected_ipc_profit_threshold: 0,
      },
    ),
  );
  const results = exhaustive(input);
  const best = bestFeasible(results, 'defender', -2);
  expect(best).toBeDefined();

  const rec = armyRecommend(input).recommendations[0];
  expect(rec.cost).toBeCloseTo(best!.tuv, 10);
  for (const [key, minimum] of Object.entries(minArmy)) {
    const uid = <keyof Army>key;
    expect(rec.army[uid] ?? 0).toBeGreaterThanOrEqual(minimum);
  }
});

test('target profit does not recommend the empty army', () => {
  // The empty army has profit 0 and satisfies a target of 2, but it is not a
  // useful recommendation.  The cheapest non-empty feasible army is 1 inf.
  const input = makeRecommendInput(
    'defender',
    'exhaust',
    2,
    {},
    makeInput(
      { inf: 6, art: 2, arm: 1, fig: 2 },
      { inf: 10, art: 3, arm: 2, aa: 1 },
      {
        retreat_expected_ipc_profit_threshold: 10,
      },
    ),
  );
  const output = armyRecommend(input);
  expect(output.feasible).toBe(true);
  const rec = output.recommendations[0];
  expect(hasUnits(rec.army)).toBe(true);
  expect(rec.cost).toBeGreaterThan(0);
  expect(rec.cost).toBeCloseTo(3, 10);

  const gridOutput = armyRecommend({ ...input, solveType: 'gridSearch' });
  expect(gridOutput.feasible).toBe(true);
  expect(hasUnits(gridOutput.recommendations[0].army)).toBe(true);
  expect(gridOutput.recommendations[0].cost).toBeGreaterThan(0);
});

test('target profit rejects fuzzyBinarySearch and branchAndBound', () => {
  for (const solveType of ['fuzzyBinarySearch', 'branchAndBound'] as SolveType[]) {
    const input = makeRecommendInput('defender', solveType, -2);
    const output = armyRecommend(input);
    expect(output.recommendations).toHaveLength(0);
    expect(output.feasible).toBe(false);
  }
});
