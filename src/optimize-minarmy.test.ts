import {
  type MultiwaveInput,
  armyRecommend,
  type ArmyRecommendInput,
  type Army,
  type SolveType,
  type OptimizeMode,
  type UnitIdentifier,
} from './index.js';
import { test, expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'number' && !Number.isInteger(val),
  serialize: (val) => val.toFixed(14),
});

const minArmy: Army = { inf: 5, art: 1, arm: 1 };

const minArmyCases: [SolveType, OptimizeMode, number | undefined][] = [
  ['gridSearch', 'maxProfit', 0],
  ['linearSearch', 'maxProfit', undefined],
  ['gridSearch', 'targetWinPercentage', undefined],
  ['linearSearch', 'targetWinPercentage', undefined],
  ['fuzzyBinarySearch', 'targetWinPercentage', undefined],
  ['exhaust', 'maxProfit', 0],
  ['exhaust', 'targetWinPercentage', undefined],
];

let testIndex = 100;
for (const [solveType, optimizeMode, retreat] of minArmyCases) {
  const input2: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: { inf: 12, art: 5, arm: 5, fig: 3, bom: 3 },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { inf: 8, art: 2, arm: 1, fig: 0, bom: 0, aa: 1 },
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
        retreat_expected_ipc_profit_threshold: retreat,
        retreat_strafe_threshold: undefined,
        retreat_lose_air_probability: undefined,
        retreat_pwin_threshold: undefined,
        pwinMode: 'destroys',
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 1,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    is_deadzone: true,
    territory_value: 2,
    do_roundless_eval: true,
    retreat_round_zero: false,
  };
  const input: ArmyRecommendInput = {
    ...input2,
    targetPercentage: 0.9,
    numRecommendations: 3,
    attDefType: 'attacker',
    pwinMode: 'destroys',
    solveType,
    optimizeMode,
    granularity: 3,
    beamWidth: 3,
    minArmy,
  };
  const label = JSON.stringify([solveType, optimizeMode, retreat]);
  console.log(label, 'minArmy begin');
  const output = armyRecommend(input);
  console.log(label, 'minArmy end');
  const testName = 'test_minArmy' + testIndex;
  test('Regression test for ' + testName, () => {
    expect(output).toMatchSnapshot();
  });
  test('minArmy constraint ' + testName, () => {
    for (const rec of output.recommendations) {
      for (const [uid, minCount] of Object.entries(minArmy)) {
        expect(rec.army[uid as UnitIdentifier] ?? 0).toBeGreaterThanOrEqual(minCount);
      }
    }
  });
  testIndex++;
}
