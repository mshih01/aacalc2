import {
  type MultiwaveInput,
  multiwaveExternal,
  multiwaveComplexityFastV2,
  armyRecommend,
  type SolveType,
  type ArmyRecommendInput,
  type Army,
  type OptimizeMode,
  type UnitIdentifier,
} from './index.js';
import { test, expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'number' && !Number.isInteger(val),
  serialize: (val) => val.toFixed(14), // Adjust '5' to your desired precision
});

const verbose = 0;

type Setting = [
  string, // description
  number | undefined, // retreat threshold
  number, // rounds
  number | undefined, // strafe threshold
  boolean, // is deadzone
  number, // territory value
  boolean, // do roundless eval
  boolean, // complexity only
];

const settings: Setting[] = [
  ['EV retreat roundless', 0, 0, 0, true /* is_deadzone*/, 2, true, false], // is_deadzone
];

console.log(process.memoryUsage());

let solveTypeArr: SolveType[] = [];
solveTypeArr.push('gridSearch');
solveTypeArr.push('fuzzyBinarySearch');
solveTypeArr.push('linearSearch');
solveTypeArr.push('exhaust');
solveTypeArr = [];
//solveTypeArr.push('fuzzyBinarySearch');
//solveTypeArr.push('linearSearch');
//solveTypeArr.push('exhaust');
solveTypeArr.push('linearSearch');
solveTypeArr.push('gridSearch');

let mySettings: [SolveType, OptimizeMode, number | undefined][] = [];

mySettings.push(['gridSearch', 'maxProfit', 0]);
mySettings.push(['linearSearch', 'maxProfit', 0]);
mySettings.push(['gridSearch', 'maxProfit', undefined]);
mySettings.push(['linearSearch', 'maxProfit', undefined]);
mySettings.push(['gridSearch', 'targetWinPercentage', undefined]);
mySettings.push(['linearSearch', 'targetWinPercentage', undefined]);
mySettings.push(['fuzzyBinarySearch', 'targetWinPercentage', undefined]);

if (true) {
  let testIndex = 0;
  const out: [string, string, number][] = [];
  for (let [solveType, optimizeMode, retreat] of mySettings) {
    let label = JSON.stringify([solveType, optimizeMode, retreat]);
    let input2: MultiwaveInput = {
      wave_info: [
        {
          attack: {
            units: {
              inf: 20,
              art: 5,
              arm: 5,
              fig: 3,
              bom: 3,
            },
            ool: ['inf', 'art', 'arm', 'fig', 'bom'],
            takes: 0,
            aaLast: false,
          },
          defense: {
            units: {
              inf: 8,
              art: 2,
              arm: 1,
              fig: 0,
              bom: 0,
              aa: 1,
            },
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
          retreat_pwin_threshold: undefined, // optional
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
    let input: ArmyRecommendInput = {
      ...input2,
      targetPercentage: 0.9,
      numRecommendations: 3,
      attDefType: 'attacker',
      pwinMode: 'destroys',
      solveType: solveType,
      optimizeMode: optimizeMode,
      granularity: 3,
      beamWidth: 3,
    };
    let testName = 'test_optimize' + testIndex;
    let t0 = performance.now();
    console.log(label, 'begin');
    let output = armyRecommend(input);
    console.log(JSON.stringify(input, null, 4));
    console.log(input.wave_info[0].attack.units);
    console.log(input.wave_info[0].defense.units);
    console.log(label, 'end');
    test('Regression test for ${testName}', async () => {
      expect(output).toMatchSnapshot();
    });
    testIndex++;
    let t1 = performance.now() - t0;
    out.push([
      JSON.stringify(output.recommendations[0].cost) +
        JSON.stringify([solveType, optimizeMode, retreat]),
      JSON.stringify(output.recommendations, null, 0),
      t1,
    ]);
  }
  for (let i = 0; i < out.length; i++) {
    let o = out[i];
    console.log(o[0], o[1], 'runtime', o[2].toFixed(1));
  }
}

// --- minArmy tests ---

if (true) {
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
            units: { inf: 20, art: 5, arm: 5, fig: 3, bom: 3 },
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
    let label = JSON.stringify([solveType, optimizeMode, retreat]);
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
          expect((rec.army[uid as UnitIdentifier] ?? 0)).toBeGreaterThanOrEqual(minCount);
        }
      }
    });
    testIndex++;
  }
}
console.log(process.memoryUsage());
