import {
  armyRecommend,
  getSubArmies,
  multiwaveExternal,
  type Army,
  type ArmyRecommendInput,
  type MultiwaveInput,
  type WaveInput,
} from './index.js';
import { optimizeSubArmy, lanchesterScore, type BnbUnitSpec } from './branchandbound.js';
import { getArmyCost } from './external.js';
import { scoreFloorFactor, type AttDefType, type OptimizeMode } from './optimize.js';
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
  attackUnits: Army = { inf: 5, art: 2, arm: 1, fig: 1 },
  defenseUnits: Army = { inf: 5, art: 2, arm: 1, aa: 1 },
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
      ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
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
    is_deadzone: true,
    territory_value: 2,
    do_roundless_eval: true,
    retreat_round_zero: false,
  };
}

function makeRecommendInput(
  attDefType: AttDefType,
  optimizeMode: OptimizeMode,
  overrides: Partial<ArmyRecommendInput> = {},
  input: MultiwaveInput = makeInput(),
): ArmyRecommendInput {
  return {
    ...input,
    attDefType,
    optimizeMode,
    targetPercentage: 0.5,
    numRecommendations: 3,
    solveType: 'branchAndBound',
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

// Evaluate every legal sub-army exactly, using the same conventions as the
// optimizer (winPct = P(optimized side has survivors), profit = engine profit).
function exhaustive(input: ArmyRecommendInput): ExhaustiveResult[] {
  const attDefType = input.attDefType;
  const maxArmy =
    attDefType === 'attacker' ? input.wave_info[0].attack.units : input.wave_info[0].defense.units;
  const minArmy = input.minArmy ?? zeroArmy(maxArmy);
  const armies = getSubArmies(maxArmy, minArmy, oneArmy(maxArmy));
  const results: ExhaustiveResult[] = [];
  for (const [army, cost] of armies) {
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

function groundHP(army: Army): number {
  let hp = 0;
  for (const [key, count] of Object.entries(army)) {
    const uid = <keyof Army>key;
    if (uid === 'inf' || uid === 'art' || uid === 'arm') {
      hp += count;
    }
  }
  return hp;
}

test('branchAndBound target win % matches exhaustive search', () => {
  for (const attDefType of ['attacker', 'defender'] as AttDefType[]) {
    const input = makeRecommendInput(attDefType, 'targetWinPercentage', {
      targetPercentage: 0.35,
    });
    const results = exhaustive(input);
    const feasible = results.filter((result) => result.winPct >= input.targetPercentage);
    expect(feasible.length).toBeGreaterThan(0);
    const bestTUV = Math.min(...feasible.map((result) => result.tuv));

    const recommendations = armyRecommend(input).recommendations;
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].cost).toBeCloseTo(bestTUV, 10);
    expect(getArmyCost(recommendations[0].army)).toBeCloseTo(recommendations[0].cost, 10);

    const match = results.find((result) => sameArmy(result.army, recommendations[0].army));
    expect(match).toBeDefined();
    expect(match!.winPct).toBeGreaterThanOrEqual(input.targetPercentage);
  }
});

test('branchAndBound auto score floor keeps the land optimum', () => {
  // Land target searches at >= 0.7 use the automatic 0.8 x opponent-score floor.
  // It must still find the exact minimum-cost army.
  const input = makeRecommendInput(
    'attacker',
    'targetWinPercentage',
    { targetPercentage: 0.9 },
    makeInput({ inf: 8, art: 3, arm: 2, fig: 2, bom: 1 }, { inf: 8, art: 2, arm: 1, aa: 1 }),
  );
  const results = exhaustive(input);
  const feasible = results.filter((result) => result.winPct >= 0.9);
  expect(feasible.length).toBeGreaterThan(0);
  const bestTUV = Math.min(...feasible.map((result) => result.tuv));

  const rec = armyRecommend(input).recommendations[0];
  expect(rec.cost).toBeCloseTo(bestTUV, 10);
  const match = results.find((result) => sameArmy(result.army, rec.army));
  expect(match).toBeDefined();
  expect(match!.winPct).toBeGreaterThanOrEqual(0.9);
});

test('branchAndBound never prunes the whole tree for an unreachable target', () => {
  // 2 fighters vs 20 infantry: the max army's score is far below the automatic
  // floor, so the floor is capped at the max army's score instead of pruning
  // every leaf.  The fallback should still be a real army.
  const input = makeRecommendInput(
    'attacker',
    'targetWinPercentage',
    { targetPercentage: 0.9 },
    makeInput({ fig: 2 }, { inf: 20 }),
  );
  const rec = armyRecommend(input).recommendations[0];
  expect(Object.keys(rec.army).length).toBeGreaterThan(0);
});

test('branchAndBound ignores EV retreat thresholds for the win objective', () => {
  // A cheap army can "survive" by retreating, so fuzzyBinarySearch strips the
  // EV/pwin retreat thresholds when evaluating candidates.  branchAndBound
  // should do the same, otherwise the minimum-cost army is a retreating one.
  const retreating = makeInput();
  retreating.wave_info[0] = {
    ...retreating.wave_info[0],
    retreat_expected_ipc_profit_threshold: 0,
    retreat_pwin_threshold: 0.9,
  };
  const input = makeRecommendInput(
    'attacker',
    'targetWinPercentage',
    { targetPercentage: 0.35 },
    retreating,
  );
  const stripped: ArmyRecommendInput = {
    ...input,
    wave_info: [
      {
        ...input.wave_info[0],
        retreat_expected_ipc_profit_threshold: undefined,
        retreat_pwin_threshold: undefined,
      },
    ],
  };
  const results = exhaustive(stripped);
  const feasible = results.filter((result) => result.winPct >= input.targetPercentage);
  expect(feasible.length).toBeGreaterThan(0);
  const bestTUV = Math.min(...feasible.map((result) => result.tuv));

  const rec = armyRecommend(input).recommendations[0];
  expect(rec.cost).toBeCloseTo(bestTUV, 10);
  const match = results.find((result) => sameArmy(result.army, rec.army));
  expect(match).toBeDefined();
  expect(match!.winPct).toBeGreaterThanOrEqual(input.targetPercentage);
});

test('branchAndBound max profit matches exhaustive top-N', () => {
  for (const attDefType of ['attacker', 'defender'] as AttDefType[]) {
    const input = makeRecommendInput(attDefType, 'maxProfit', {
      targetPercentage: 0.9,
      numRecommendations: 3,
    });
    const results = exhaustive(input);
    const expectedProfits = results
      .map((result) => result.profit)
      .sort((a, b) => b - a)
      .slice(0, 3);

    const recommendations = armyRecommend(input).recommendations;
    expect(recommendations.length).toBe(3);
    const actualProfits = recommendations.map((rec) => rec.cost).sort((a, b) => b - a);
    for (let i = 0; i < expectedProfits.length; i++) {
      expect(actualProfits[i]).toBeCloseTo(expectedProfits[i], 10);
    }
    for (const rec of recommendations) {
      const match = results.find((result) => sameArmy(result.army, rec.army));
      expect(match).toBeDefined();
      expect(match!.profit).toBeCloseTo(rec.cost, 10);
    }
  }
});

test('branchAndBound respects minArmy', () => {
  const minArmy: Army = { inf: 2, fig: 1 };
  const input = makeRecommendInput('attacker', 'targetWinPercentage', {
    targetPercentage: 0.2,
    minArmy,
  });
  const results = exhaustive(input);
  const feasible = results.filter((result) => result.winPct >= input.targetPercentage);
  expect(feasible.length).toBeGreaterThan(0);
  const bestTUV = Math.min(...feasible.map((result) => result.tuv));

  const recommendations = armyRecommend(input).recommendations;
  expect(recommendations[0].cost).toBeCloseTo(bestTUV, 10);
  for (const [key, minCount] of Object.entries(minArmy)) {
    const uid = <keyof Army>key;
    expect(recommendations[0].army[uid] ?? 0).toBeGreaterThanOrEqual(minCount);
  }
});

test('branchAndBound respects maxGroundHP', () => {
  const input = makeRecommendInput(
    'attacker',
    'targetWinPercentage',
    { targetPercentage: 0.3, maxGroundHP: 2 },
    makeInput({ fig: 3, arm: 3 }, { inf: 4, art: 1 }),
  );
  const results = exhaustive(input).filter((result) => groundHP(result.army) <= 2);
  expect(results.length).toBeGreaterThan(0);
  const feasible = results.filter((result) => result.winPct >= input.targetPercentage);
  expect(feasible.length).toBeGreaterThan(0);
  const bestTUV = Math.min(...feasible.map((result) => result.tuv));

  const rec = armyRecommend(input).recommendations[0];
  expect(rec.cost).toBeCloseTo(bestTUV, 10);
  expect(groundHP(rec.army)).toBeLessThanOrEqual(2);
});

test('scoreFloorFactor scales from 0.8 at 50% to 1.1 at 90%', () => {
  expect(scoreFloorFactor(0)).toBe(0);
  expect(scoreFloorFactor(0.5)).toBeCloseTo(0.8, 10);
  expect(scoreFloorFactor(0.7)).toBeCloseTo(0.95, 10);
  expect(scoreFloorFactor(0.8)).toBeCloseTo(1.025, 10);
  expect(scoreFloorFactor(0.9)).toBeCloseTo(1.1, 10);
  expect(scoreFloorFactor(0.95)).toBeCloseTo(1.1, 10);
  expect(scoreFloorFactor(2)).toBeCloseTo(1.1, 10);
  expect(scoreFloorFactor(-1)).toBe(0);
});

test('lanchesterScore uses effective pips x total HP', () => {
  const units: BnbUnitSpec[] = [
    { id: 'inf', count: 2, ipc: 3, pips: 1, hp: 1, isGround: true, isInf: true },
    { id: 'art', count: 1, ipc: 4, pips: 2, hp: 1, isGround: true, isArt: true },
    { id: 'fig', count: 1, ipc: 10, pips: 3, hp: 1 },
  ];
  // Attacker: 2 inf + 1 art + pairing + 1 fig = 8 effective pips over 4 HP.
  expect(lanchesterScore(units, true)).toBeCloseTo(32, 10);
  // Specs carry the side's pips, so a defender spec uses defense values.
  const defenderUnits: BnbUnitSpec[] = [
    { id: 'inf', count: 2, ipc: 3, pips: 2, hp: 1, isGround: true, isInf: true },
    { id: 'art', count: 1, ipc: 4, pips: 2, hp: 1, isGround: true, isArt: true },
    { id: 'fig', count: 1, ipc: 10, pips: 4, hp: 1 },
  ];
  // 2 inf (2) + art (2) + fig (4) = 10 pips over 4 HP.
  expect(lanchesterScore(defenderUnits, false)).toBeCloseTo(40, 10);

  const sub: BnbUnitSpec[] = [{ id: 'sub', count: 1, ipc: 6, pips: 2, hp: 1, isSub: true }];
  expect(lanchesterScore(sub, true)).toBeCloseTo(2.5, 10);
  const defenderSub: BnbUnitSpec[] = [{ id: 'sub', count: 1, ipc: 6, pips: 1, hp: 1, isSub: true }];
  expect(lanchesterScore(defenderSub, false)).toBeCloseTo(1.5, 10);
});

// ---------------------------------------------------------------------------
// Unit tests for the generic branch-and-bound search, with a mock evaluator.
// ---------------------------------------------------------------------------

const mockUnits: BnbUnitSpec[] = [
  { id: 'inf', count: 3, ipc: 3, pips: 1, hp: 1, isGround: true, isInf: true },
  { id: 'art', count: 2, ipc: 4, pips: 2, hp: 1, isGround: true, isArt: true },
  { id: 'arm', count: 2, ipc: 6, pips: 3, hp: 1, isGround: true },
  { id: 'fig', count: 2, ipc: 10, pips: 3, hp: 1 },
];

function mockEvaluate(counts: number[]): { winPct: number; profit: number } {
  const pips = counts[0] * 1 + counts[1] * 2 + counts[2] * 3 + counts[3] * 3;
  const tuv = counts[0] * 3 + counts[1] * 4 + counts[2] * 6 + counts[3] * 10;
  const hp = counts.reduce((sum, count) => sum + count, 0);
  return { winPct: hp === 0 ? 0 : Math.min(1, pips / 6), profit: pips - tuv / 10 };
}

function mockEnumerate(
  config: { min?: number[]; maxGroundHP?: number } = {},
): { counts: number[]; winPct: number; profit: number; tuv: number }[] {
  const results: { counts: number[]; winPct: number; profit: number; tuv: number }[] = [];
  const counts = new Array<number>(mockUnits.length).fill(0);
  function visit(idx: number): void {
    if (idx === mockUnits.length) {
      const hp = counts.reduce((sum, count) => sum + count, 0);
      if (hp === 0) {
        return;
      }
      let ground = 0;
      for (let i = 0; i < counts.length; i++) {
        if (mockUnits[i].isGround) {
          ground += counts[i];
        }
      }
      if (config.maxGroundHP !== undefined && ground > config.maxGroundHP) {
        return;
      }
      const { winPct, profit } = mockEvaluate(counts);
      const tuv = counts.reduce((sum, count, i) => sum + count * mockUnits[i].ipc, 0);
      results.push({ counts: [...counts], winPct, profit, tuv });
      return;
    }
    const min = config.min?.[idx] ?? 0;
    for (let k = min; k <= mockUnits[idx].count; k++) {
      counts[idx] = k;
      visit(idx + 1);
    }
  }
  visit(0);
  return results;
}

test('branchAndBound unit search finds the minimum TUV', () => {
  const target = 0.75;
  const expected = mockEnumerate()
    .filter((result) => result.winPct >= target)
    .reduce((best, result) => Math.min(best, result.tuv), Infinity);
  const result = optimizeSubArmy(
    mockUnits,
    { objective: 'MIN_WIN_PCT', targetWinPct: target, isAttacker: true },
    mockEvaluate,
  );
  expect(result.feasible).toBe(true);
  expect(result.solutions).toHaveLength(1);
  expect(result.solutions[0].tuv).toBe(expected);
  expect(result.solutions[0].winPct).toBeGreaterThanOrEqual(target);
});

test('branchAndBound unit search ranks max profit', () => {
  const expected = mockEnumerate()
    .map((result) => result.profit)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const result = optimizeSubArmy(
    mockUnits,
    { objective: 'MAX_PROFIT', isAttacker: true, numRecommendations: 3 },
    mockEvaluate,
  );
  expect(result.solutions).toHaveLength(3);
  for (let i = 0; i < expected.length; i++) {
    expect(result.solutions[i].profit).toBeCloseTo(expected[i], 10);
  }
});

test('branchAndBound unit search respects minimum counts and ground HP', () => {
  const min = [1, 1, 0, 0];
  const expected = mockEnumerate({ min, maxGroundHP: 2 })
    .filter((result) => result.winPct >= 0.75)
    .reduce((best, result) => Math.min(best, result.tuv), Infinity);
  const units = mockUnits.map((unit, i) => ({ ...unit, min: min[i] }));
  const result = optimizeSubArmy(
    units,
    { objective: 'MIN_WIN_PCT', targetWinPct: 0.75, isAttacker: true, maxGroundHP: 2 },
    mockEvaluate,
  );
  expect(result.solutions[0].tuv).toBe(expected);
  expect(result.solutions[0].counts[0]).toBeGreaterThanOrEqual(1);
  expect(result.solutions[0].counts[1]).toBeGreaterThanOrEqual(1);
});

test('branchAndBound unit search falls back when the target is unreachable', () => {
  const result = optimizeSubArmy(
    mockUnits,
    { objective: 'MIN_WIN_PCT', targetWinPct: 2, isAttacker: true },
    mockEvaluate,
  );
  expect(result.feasible).toBe(false);
  expect(result.solutions).toHaveLength(1);
  expect(result.solutions[0].winPct).toBe(1);
});

test('branchAndBound score floor only evaluates armies above the floor', () => {
  const units: BnbUnitSpec[] = [
    { id: 'arm', count: 3, ipc: 6, pips: 3, hp: 1, isGround: true },
    { id: 'fig', count: 3, ipc: 10, pips: 3, hp: 1 },
  ];
  function evaluate(counts: number[]): { winPct: number; profit: number } {
    const pips = counts[0] * 3 + counts[1] * 3;
    const tuv = counts[0] * 6 + counts[1] * 10;
    const hp = counts[0] + counts[1];
    return { winPct: hp === 0 ? 0 : Math.min(1, pips / 9), profit: pips - tuv / 10 };
  }
  const floor = 5;
  const evaluated: number[][] = [];
  const result = optimizeSubArmy(
    units,
    { objective: 'MIN_WIN_PCT', targetWinPct: 0.5, isAttacker: true, minScoreThreshold: floor },
    (counts) => {
      evaluated.push([...counts]);
      return evaluate(counts);
    },
  );
  expect(result.evalsRun).toBe(evaluated.length);
  expect(result.evalsRun).toBeLessThan(16); // 4 * 4 leaves including the empty army
  for (const counts of evaluated) {
    const pips = counts[0] * 3 + counts[1] * 3;
    const hp = counts[0] + counts[1];
    expect(pips * hp).toBeGreaterThanOrEqual(floor);
  }
});
