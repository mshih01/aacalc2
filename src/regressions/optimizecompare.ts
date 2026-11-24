// Manual comparison harness for the army recommendation solvers.
//
// Run after `npm run build`:
//   node dist/regressions/optimizecompare.js
//   node dist/regressions/optimizecompare.js maxProfit
//
// It compares fuzzyBinarySearch, branchAndBound with the automatic land score
// floor, and branchAndBound with the floor disabled (exact), plus gridSearch /
// linearSearch for maxProfit. Exact evaluator counts are parsed from the
// library's verbose output. This is a tuning tool, not part of the test suite.

import {
  armyRecommend,
  multiwaveExternal,
  type Army,
  type ArmyRecommendInput,
  type MultiwaveInput,
  type SolveType,
} from '../index.js';

interface Scenario {
  attack: Army;
  defense: Army;
  is_deadzone: boolean;
  territory_value: number;
}

const SCENARIOS: Record<string, Scenario> = {
  small: {
    attack: { inf: 8, art: 3, arm: 2, fig: 2, bom: 1 },
    defense: { inf: 8, art: 2, arm: 1, aa: 1 },
    is_deadzone: false,
    territory_value: 0,
  },
  repo: {
    attack: { inf: 12, art: 5, arm: 5, fig: 3, bom: 3 },
    defense: { inf: 8, art: 2, arm: 1, aa: 1 },
    is_deadzone: true,
    territory_value: 2,
  },
  medium: {
    attack: { inf: 20, art: 10, arm: 10, fig: 5 },
    defense: { inf: 15, art: 4, arm: 1, aa: 2 },
    is_deadzone: true,
    territory_value: 2,
  },
  large: {
    attack: { inf: 60, art: 60, arm: 60, fig: 20 },
    defense: { inf: 15, art: 4, arm: 1, aa: 2 },
    is_deadzone: true,
    territory_value: 2,
  },
  defender: {
    attack: { inf: 5, art: 2 },
    defense: { inf: 10, art: 3, arm: 2, aa: 1 },
    is_deadzone: false,
    territory_value: 0,
  },
};

function makeInput(name: string): MultiwaveInput {
  const scenario = SCENARIOS[name];
  return {
    wave_info: [
      {
        attack: {
          units: { ...scenario.attack },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { ...scenario.defense },
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
    is_deadzone: scenario.is_deadzone,
    territory_value: scenario.territory_value,
    do_roundless_eval: true,
    retreat_round_zero: false,
  };
}

function evaluate(
  input: MultiwaveInput,
  army: Army,
  side: 'attacker' | 'defender',
  mode: 'targetWinPercentage' | 'maxProfit',
): { winPct: number; profit: number } {
  const clone = JSON.parse(JSON.stringify(input)) as MultiwaveInput;
  clone.verbose_level = 0;
  const wave = clone.wave_info[0];
  if (mode === 'targetWinPercentage') {
    // Match fuzzyBinarySearch/branchAndBound: ignore EV/pwin retreat thresholds.
    wave.retreat_expected_ipc_profit_threshold = undefined;
    wave.retreat_pwin_threshold = undefined;
  }
  if (side === 'attacker') wave.attack.units = army;
  else wave.defense.units = army;
  const output = multiwaveExternal(clone);
  return {
    winPct: side === 'defender' ? output.defense.survives[0] : output.attack.survives[0],
    profit: output.defense.ipcLoss[0] - output.attack.ipcLoss[0],
  };
}

interface RunResult {
  solver: string;
  evals: number | null;
  ms: number;
  cost: number;
  army: Army;
  winPct: number;
  profit: number;
}

function run(
  scenario: string,
  side: 'attacker' | 'defender',
  mode: 'targetWinPercentage' | 'maxProfit',
  target: number,
  solveType: SolveType,
  label: string,
  minScoreThreshold?: number,
): RunResult {
  const input: ArmyRecommendInput = {
    ...makeInput(scenario),
    attDefType: side,
    optimizeMode: mode,
    numRecommendations: mode === 'maxProfit' ? 3 : 1,
    targetPercentage: target,
    pwinMode: 'destroys',
    solveType,
    ...(minScoreThreshold === undefined ? {} : { minScoreThreshold }),
  };
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  };
  const t0 = performance.now();
  let output;
  try {
    output = armyRecommend(input);
  } finally {
    console.log = originalLog;
  }
  const ms = performance.now() - t0;

  let evals: number | null = null;
  for (const line of logs) {
    let match = line.match(/^iterations (\d+)/);
    if (match) evals = Number(match[1]);
    match = line.match(/^branchAndBound evaluations (\d+)/);
    if (match) evals = Number(match[1]);
    match = line.match(/^(\d+) map size/);
    if (match) evals = Number(match[1]);
  }
  const rec = output.recommendations[0] ?? { army: {}, cost: 0 };
  const actual = evaluate(input, rec.army, side, mode);
  return { solver: label, evals, ms, cost: rec.cost, army: rec.army, ...actual };
}

function printRow(
  scenario: string,
  side: string,
  mode: string,
  target: number | undefined,
  result: RunResult,
): void {
  const targetText = target === undefined ? '' : target.toFixed(2);
  console.log(
    [
      scenario.padEnd(9),
      mode.padEnd(20),
      targetText.padEnd(5),
      result.solver.padEnd(10),
      String(result.evals ?? '-').padStart(6),
      `${Math.round(result.ms)}ms`.padStart(8),
      String(result.cost).padStart(8),
      `win=${result.winPct.toFixed(4)} profit=${result.profit.toFixed(3)}`,
    ].join('  '),
  );
}

const filter = process.argv[2];

const targetCases: Array<[string, number, 'attacker' | 'defender']> = [
  ['small', 0.9, 'attacker'],
  ['repo', 0.9, 'attacker'],
  ['medium', 0.5, 'attacker'],
  ['medium', 0.8, 'attacker'],
  ['medium', 0.9, 'attacker'],
  ['large', 0.9, 'attacker'],
  ['defender', 0.9, 'defender'],
];

const targetSolvers: Array<[string, SolveType, number | undefined]> = [
  ['fuzzy', 'fuzzyBinarySearch', undefined],
  ['bnb-auto', 'branchAndBound', undefined],
  ['bnb-exact', 'branchAndBound', 0],
];

const maxProfitCases: Array<[string, 'attacker' | 'defender']> = [
  ['small', 'attacker'],
  ['repo', 'attacker'],
  ['medium', 'attacker'],
];

const maxProfitSolvers: Array<[string, SolveType]> = [
  ['grid', 'gridSearch'],
  ['linear', 'linearSearch'],
  ['bnb-exact', 'branchAndBound'],
];

console.log('scenario  mode                  target solver     evals      time      cost  result');
console.log('-'.repeat(100));

if (!filter || filter === 'target') {
  for (const [scenario, target, side] of targetCases) {
    for (const [label, solveType, floor] of targetSolvers) {
      try {
        printRow(
          scenario,
          side,
          'targetWinPercentage',
          target,
          run(scenario, side, 'targetWinPercentage', target, solveType, label, floor),
        );
      } catch (error) {
        console.log(`${scenario} ${label} failed: ${String(error)}`);
      }
    }
  }
}

if (!filter || filter === 'maxProfit') {
  for (const [scenario, side] of maxProfitCases) {
    for (const [label, solveType] of maxProfitSolvers) {
      try {
        printRow(
          scenario,
          side,
          'maxProfit',
          undefined,
          run(scenario, side, 'maxProfit', 0.9, solveType, label),
        );
      } catch (error) {
        console.log(`${scenario} ${label} failed: ${String(error)}`);
      }
    }
  }
}
