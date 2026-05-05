import {
  type MultiwaveInput,
  multiwaveExternal,
  multiwaveComplexity,
  multiwaveComplexityFastV2,
} from '../index.js';

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
  ['no retreat', undefined, 100, undefined, false, 0, false, false],
  ['1 round', undefined, 1, undefined, false, 0, false, false],
  ['EV retreat', 0, 100, undefined, false, 0, false, false],
  ['EV retreat + strafe', 0, 100, 0.05, false, 0, false, false],
  ['no retreat roundless', undefined, 0, undefined, false, 0, true, false],
  ['EV retreat roundless', 0, 0, undefined, false, 0, true, false],
  ['complexity only', undefined, 0, undefined, false, 0, true, true],
];

console.log(process.memoryUsage());

const battleInput: MultiwaveInput = {
  wave_info: [
    {
      attack: {
        units: {
          inf: 100,
          art: 40,
          fig: 10,
        },
        ool: ['inf', 'art', 'arm', 'fig', 'bom'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: {
          inf: 100,
          art: 40,
          fig: 6,
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

for (let index = 0; index < 5; index++) {
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
