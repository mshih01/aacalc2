import {
  type MultiwaveInput,
  multiwaveExternal,
  multiwaveComplexity,
  multiwaveComplexityFastV2,
  armyRecommend,
  type SolveType,
  type ArmyRecommendInput,
  type Army,
} from '../index.js';

const verbose = 1;

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
  [
    'EV retreat roundless',
    0,
    0,
    undefined,
    true /* is_deadzone*/,
    0,
    true,
    false,
  ], // is_deadzone
];

console.log(process.memoryUsage());

const battleInput: MultiwaveInput = {
  wave_info: [
    {
      attack: {
        units: {
          inf: 20,
          art: 10,
          arm: 10,
          fig: 0,
        },
        ool: ['inf', 'art', 'arm', 'fig', 'bom'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: {
          inf: 20,
          art: 10,
          fig: 0,
          aa: 3,
        },
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
    },
  ],
  debug: false,
  prune_threshold: 1e-12,
  report_prune_threshold: 1e-12,
  is_naval: false,
  in_progress: false,
  num_runs: 1,
  verbose_level: verbose,
  diceMode: 'standard',
  sortMode: 'ipc_cost',
};

const results: string[][] = [];
const precision = 3;

// repeat N times
const N = 1;
for (let index = 0; index < N; index++) {
  for (let solveType of [
    'gridSearch',
    'fuzzyBinarySearch',
    'linearSearch',
  ] as SolveType[]) {
    // settings
    for (const setting of settings) {
      const [
        description,
        retreat,
        round,
        strafe,
        is_deadzone,
        territory_value,
        do_roundless_eval,
        report_complexity_only,
      ] = setting;

      const input: MultiwaveInput = {
        ...battleInput,
        wave_info: [
          {
            ...battleInput.wave_info[0],
            rounds: round,
            retreat_expected_ipc_profit_threshold: retreat,
            retreat_strafe_threshold: strafe,
          },
        ],
        is_deadzone,
        territory_value,
        do_roundless_eval,
        report_complexity_only,
      };

      if (report_complexity_only) {
        console.time(description);
        const c1 = multiwaveComplexity(input);
        console.timeEnd(description);

        console.time(description);
        const c2 = multiwaveComplexityFastV2(input);
        console.timeEnd(description);

        console.log(`complexity: ${c1}  fast: ${c2}`);
      } else {
        const t0 = performance.now();
        const output = multiwaveExternal(input);
        const t1 = performance.now() - t0;

        const profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];

        console.log(JSON.stringify(input, null, 4));
        console.log(
          `${description}: profit=${profit.toFixed(precision)}  def_loss=${output.defense.ipcLoss[0].toFixed(precision)}  att_loss=${output.attack.ipcLoss[0].toFixed(precision)}  takes=${output.takesTerritory[0].toFixed(precision)}  runtime=${t1.toFixed(precision)}ms`,
        );

        results.push([
          profit.toFixed(precision),
          output.defense.ipcLoss[0].toFixed(precision),
          output.attack.ipcLoss[0].toFixed(precision),
          output.takesTerritory[0].toFixed(precision),
          t1.toFixed(precision),
          description,
        ]);
      }
    }
  }
}

const pad = 12;
const header =
  'profit'.padEnd(pad) +
  'def_loss'.padEnd(pad) +
  'att_loss'.padEnd(pad) +
  'takes'.padEnd(pad) +
  'runtime'.padEnd(pad) +
  'description';
console.log('\n');
console.log(header);
console.log('-'.repeat(header.length));
for (const r of results) {
  console.log(r.map((s) => s.padEnd(pad)).join(''));
}

console.log(process.memoryUsage());

let solveTypeArr: SolveType[] = [];
solveTypeArr.push('gridSearch');
solveTypeArr.push('fuzzyBinarySearch');
solveTypeArr.push('linearSearch');
solveTypeArr.push('exhaust');
solveTypeArr = [];
//solveTypeArr.push('fuzzyBinarySearch');
//solveTypeArr.push('linearSearch');
solveTypeArr.push('gridSearch');

if (true) {
  const out: [string, Army, number, number][] = [];
  for (let solveType of solveTypeArr) {
    let input2: MultiwaveInput = {
      wave_info: [
        {
          attack: {
            units: {
              inf: 20,
              art: 10,
              arm: 10,
              fig: 10,
              bom: 0,
            },
            ool: ['inf', 'art', 'arm', 'fig', 'bom'],
            takes: 0,
            aaLast: false,
          },
          defense: {
            units: {
              inf: 20,
              art: 10,
              arm: 0,
              fig: 0,
              bom: 0,
              aa: 3,
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
          retreat_expected_ipc_profit_threshold: 0,
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
      verbose_level: verbose,
      diceMode: 'standard',
      sortMode: 'ipc_cost',
      is_deadzone: true,
      territory_value: undefined,
      do_roundless_eval: true,
      retreat_round_zero: false,
    };
    let input: ArmyRecommendInput = {
      ...input2,
      targetPercentage: 0.9,
      optimizeMode: 'maxProfit',
      numRecommendations: 1,
      attDefType: 'attacker',
      pwinMode: 'destroys',
      //solveType: 'gridSearch',
      solveType: solveType,
    };
    let t0 = performance.now();
    console.log(solveType, 'begin');
    let output = armyRecommend(input);
    console.log(JSON.stringify(input, null, 4));
    console.log(input.wave_info[0].attack.units);
    console.log(input.wave_info[0].defense.units);
    console.log(solveType, 'end');
    let t1 = performance.now() - t0;
    out.push([
      solveType,
      output.recommendations[0].army,
      output.recommendations[0].cost,
      t1,
    ]);
  }
  for (let i = 0; i < out.length; i++) {
    let o = out[i];
    console.log(
      o[0],
      JSON.stringify(o[1]),
      'cost',
      o[2],
      'runtime',
      o[3].toFixed(1),
    );
  }
}
