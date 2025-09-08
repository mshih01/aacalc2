import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  multiwaveComplexity,
  multiwaveComplexityFastV2,
  sbrExternal,
  type SbrInput,
  type UnitIdentifier,
  type Army,
} from '../index.js';
import {
  getSubArmies,
  type MultiEvalInput,
  type MultiEvalOutput,
  multiEvalExternal,
  getArmyCost,
  getCombinations,
  getIntegersInRange,
} from '../external.js';

import type { PwinMode } from '../solve.js';
import { types } from 'util';
import { is_round_zero_retreat_state } from '../zeroround.js';

let out = [];
let verbose = 4; // 0, 1, 2, 3

type Setting = [
  string, // description
  number | undefined, // EV retreat threshold
  number | undefined, // pwin retreat threshold
  PwinMode, // pwin mode
  number, // rounds, required
  number | undefined, // strafe threshold
  boolean, // is deadzone
  number, // territory value
  boolean, // do roundless eval, optional
  boolean, //complexity only
  number, // retreat_lose_air_probability, optional
];

let do_roundless_global = false;
let complexity_global = false;
let retreat_lose_air_probability_global = 1.0;
let retreat_round_zero = false;

let inputSettings2: Setting[] = [
  [
    'no retreat',
    undefined,
    undefined,
    'takes',
    100,
    undefined,
    false,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // no retreat  (A)
  [
    '1 round',
    undefined,
    undefined,
    'takes',
    1,
    undefined,
    false,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // 1 round (B)
  [
    'EV based retreat',
    0,
    undefined,
    'takes',
    100,
    undefined,
    false,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat (C)
  [
    'EV retreat + strafe',
    0,
    undefined,
    'takes',
    100,
    0.05,
    false,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat + strafe (D)
  [
    'strafe only',
    undefined,
    undefined,
    'takes',
    100,
    0.05,
    false,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // strafe (E)
  [
    'DZ + no retreat',
    undefined,
    undefined,
    'takes',
    100,
    undefined,
    true,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // no retreat  (A)
  [
    'DZ + 1 round',
    undefined,
    undefined,
    'takes',
    1,
    undefined,
    true,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // 1 round (B)
  [
    'DZ + EV based retreat',
    0,
    undefined,
    'takes',
    100,
    undefined,
    true,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat (C)
  [
    'DZ + EV retreat + strafe',
    0,
    undefined,
    'takes',
    100,
    0.05,
    true,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat + strafe (D)
  [
    'DZ + strafe only',
    undefined,
    undefined,
    'takes',
    100,
    0.05,
    true,
    0,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // strafe (E)
  [
    'DZ + terrValue + no retreat',
    undefined,
    undefined,
    'takes',
    100,
    undefined,
    true,
    -5,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // no retreat  (A)
  [
    'DZ + terrValue + 1 round',
    undefined,
    undefined,
    'takes',
    1,
    undefined,
    true,
    -5,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // 1 round (B)
  [
    'DZ + terrValue + EV based retreat',
    0,
    undefined,
    'takes',
    100,
    undefined,
    true,
    -5,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat (C)
  [
    'DZ + terrValue + EV retreat + strafe',
    0,
    undefined,
    'takes',
    100,
    0.05,
    true,
    -5,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // EV based retreat + strafe (D)
  [
    'DZ + terrValue + strafe only',
    undefined,
    undefined,
    'takes',
    100,
    0.05,
    true,
    -5,
    do_roundless_global,
    complexity_global,
    retreat_lose_air_probability_global,
  ], // strafe (E)
];

let inputSettings4: Setting[] = [
  // ['no retreat 0 roundless', undefined, 0, 0.05, false, 0, false], // no retreat  (A)
  // ['no retreat 0 roundless', undefined, 0, 0.05, false, 0, true], // no retreat  (A)
  // ['no retreat 0 roundless', 0, 0, undefined, false, 0, true], // no retreat  (A)
  // ['no retreat 0 roundless', 0, 100, undefined, false, 0, false], // no retreat  (A)
  // ['no retreat 0 roundless', 0, 0, undefined, false, 0, true], // no retreat  (A)
  [
    'no retreat 0 roundless',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'no retreat 0 roundlessorig',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    false,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'no retreat 100 rounds',
    undefined,
    undefined,
    'takes',
    100,
    undefined,
    false,
    0,
    false,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'strafe 0 roundless',
    undefined,
    undefined,
    'takes',
    0,
    0.05,
    false,
    0,
    true,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'strafe 100 rounds',
    undefined,
    undefined,
    'takes',
    100,
    0.05,
    false,
    0,
    false,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'no retreat roundless',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'EV retreat roundless',
    0,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    1.0,
  ], // no retreat  (A)
  [
    'retreat lose air prob 0',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    0.0,
  ], // no retreat  (A)
  [
    'retreat lose air prob 0.12',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    0.12,
  ], // no retreat  (A)
  [
    'retreat lose air prob 0.11',
    undefined,
    undefined,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    0.11,
  ], // no retreat  (A)
  // ['no retreat 0 roundless', undefined, 0, 0.05, false, 0, true], // no retreat  (A)
];

let inputSettings: [Setting, number][] = [];

for (let i = 0; i < 1; i += 0.1) {
  let desc = 'pwin retreat: ' + i.toFixed(1);
  let mysetting: Setting = [
    desc,
    undefined,
    i,
    'takes',
    0,
    undefined,
    false,
    0,
    true,
    false,
    1.0,
  ];
  // ['no retreat 0 roundless', undefined, 0, 0.05, false, 0, true], // no retreat  (A)
  if (i == 0) {
    let desc = 'no retreat: ';
    let mysetting: Setting = [
      desc,
      undefined,
      undefined,
      'takes',
      0,
      undefined,
      false,
      0,
      true,
      false,
      1.0,
    ];
    inputSettings.push([mysetting, 2]);
  }
  inputSettings.push([mysetting, 2]);
  if (i >= 0.99) {
    let desc = '1 round: ';
    let mysetting: Setting = [
      desc,
      undefined,
      undefined,
      'takes',
      1,
      undefined,
      false,
      0,
      true,
      false,
      1.0,
    ];
    inputSettings.push([mysetting, 2]);
    inputSettings.push([inputSettings4[6], 2]);
  }
}

for (let i = 0; i < inputSettings2.length; i++) {
  let setting = inputSettings2[i];
  inputSettings.push([setting, 2]);

  // strafe doesn't work with subs
  if (setting[5] != undefined) {
    continue;
  }
  inputSettings.push([setting, 8]);
}

// multiwave without retreat
inputSettings.push([inputSettings2[0], 4]);
inputSettings = [];
inputSettings.push([inputSettings4[0], 10]); // no retreat
inputSettings.push([inputSettings4[6], 10]); // EV retreat
inputSettings.push([inputSettings4[7], 10]); // retreat don't lose air 0
inputSettings.push([inputSettings4[8], 10]); // retreat don't lose air 0.12
inputSettings.push([inputSettings4[9], 10]); // retreat don't lose air 0.11
inputSettings = [];

console.log(inputSettings);
console.log(inputSettings.length);

console.log(process.memoryUsage());

let attackerString: string = '';
let defenderString: string = '';
let precision = 5;

let testIndex = 0;

// console.profile('multiwaveExternal');
for (let i = 0; i < inputSettings.length; i++) {
  let [setting, fileindex] = inputSettings[i];
  let [
    description,
    retreat,
    pwin_retreat,
    pwin_mode,
    round,
    strafe,
    is_deadzone,
    territory_value,
    do_roundless_eval,
    report_complexity_only,
    retreat_lose_air_probability,
  ] = setting;

  // 1 vs. 1
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 0,
            art: 1,
            arm: 0,
            fig: 0,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 1,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // small single wave
  const input2: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 4,
            art: 2,
            arm: 2,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 4,
            art: 0,
            arm: 2,
            fig: 2,
            aa: 1,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // large single wave
  const input3: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 100,
            art: 30,
            arm: 10,
            fig: 10,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 100,
            art: 0,
            arm: 10,
            fig: 10,
            aa: 3,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // smaller multiwave
  const input4: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 30,
            art: 5,
            arm: 5,
            fig: 5,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 30,
            art: 0,
            arm: 5,
            fig: 5,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 6,
            art: 2,
            arm: 0,
            fig: 2,
            bom: 1,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 4,
            art: 2,
            arm: 0,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 1,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // imbalanced multiwave
  const input5: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 4,
            art: 1,
            arm: 1,
            fig: 1,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 4,
            art: 0,
            arm: 1,
            fig: 1,
            aa: 1,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 6,
            art: 2,
            arm: 0,
            fig: 2,
            bom: 1,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 4,
            art: 2,
            arm: 0,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 1,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // large multiwave
  const input7: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 200,
            art: 20,
            arm: 10,
            fig: 10,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 400,
            art: 0,
            arm: 10,
            fig: 10,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 200,
            art: 20,
            arm: 10,
            fig: 10,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
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
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
      {
        attack: {
          units: {
            inf: 200,
            art: 20,
            arm: 10,
            fig: 10,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 1,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  // large naval singlewave
  const input6: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            sub: 60,
            des: 10,
            cru: 1,
            acc: 5,
            fig: 50,
            bom: 1,
            bat: 2,
          },
          ool: ['acc', 'sub', 'des', 'fig', 'cru', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            sub: 40,
            des: 5,
            cru: 1,
            acc: 15,
            fig: 30,
            bat: 1,
            tra: 5,
          },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: true,
    in_progress: false,
    num_runs: 1,
    verbose_level: verbose,
    diceMode: 'standard',
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };

  // small naval
  const input8: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            sub: 5,
            des: 5,
            cru: 1,
            acc: 1,
            fig: 2,
            bom: 1,
            bat: 2,
          },
          ool: ['acc', 'sub', 'des', 'fig', 'cru', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            sub: 5,
            des: 5,
            cru: 1,
            acc: 1,
            fig: 2,
            bat: 1,
            tra: 2,
          },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: true,
    in_progress: false,
    num_runs: 1,
    verbose_level: verbose,
    diceMode: 'standard',
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };
  const input9: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            sub: 10,
            bat: 10,
          },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            sub: 10,
            bat: 10,
          },
          ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bat'],
          takes: 0,
          aaLast: false,
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
    is_naval: true,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'unit_count',
  };

  // small single wave -- retreat_lose_air_probability
  const input10: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 2,
            art: 0,
            arm: 0,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 2,
            art: 0,
            arm: 0,
            fig: 0,
            aa: 0,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: round,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: retreat, // optional
        retreat_strafe_threshold: strafe, // optional
        retreat_pwin_threshold: pwin_retreat, // optional
        pwinMode: pwin_mode, // optional
        retreat_lose_air_probability: retreat_lose_air_probability, // optional
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
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
    retreat_round_zero: retreat_round_zero, // optional, default is true
  };

  let inputs: MultiwaveInput[] = [
    input,
    input,
    input2,
    input3,
    input4,
    input5,
    input6,
    input7,
    input8,
    input9,
    input10,
  ];

  let myinput = inputs[fileindex];

  if (myinput.report_complexity_only) {
    console.log(fileindex);
    console.log(myinput);
    console.time(description);
    let complexity = multiwaveComplexity(myinput);
    console.log(complexity, 'multiwaveComplexity');
    console.timeEnd(description);

    console.time(description);
    complexity = multiwaveComplexityFastV2(myinput);
    console.log(complexity, 'multiwaveComplexityFastV2');
    console.timeEnd(description);
  } else {
    let t0 = performance.now();
    console.time(description);

    let testName = 'test' + testIndex;
    let output = multiwaveExternal(myinput);
    let t1 = performance.now() - t0;
    console.timeEnd(description);
    console.log(myinput);
    console.log(testName);

    testIndex++;

    attackerString = JSON.stringify(myinput.wave_info[0].attack.units);
    defenderString = JSON.stringify(myinput.wave_info[0].defense.units);

    console.log(output, description);

    let profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];

    let o = [
      profit.toFixed(precision),
      output.defense.ipcLoss[0].toFixed(precision),
      output.attack.ipcLoss[0].toFixed(precision),
      output.takesTerritory[0].toFixed(precision),
      t1.toFixed(precision),
      description,
    ];
    out.push(o);
  }
}

let padding = 10;

let heading =
  'profit'.padEnd(padding) +
  ' ' +
  'def ipc'.padEnd(padding) +
  ' ' +
  'att ipc'.padEnd(padding) +
  ' ' +
  'takes'.padEnd(padding) +
  ' ' +
  'runtime'.padEnd(padding) +
  ' ' +
  'description'.padEnd(padding) +
  ' ';
console.log(attackerString, 'vs. ', defenderString);
console.log(heading);
for (let i = 0; i < out.length; i++) {
  let o = out[i];
  let result = '';
  for (let j = 0; j < o.length; j++) {
    result += o[j].padEnd(padding) + ' ';
  }
  console.log(result);
}

/*
if (true) {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 3,
            arm: 2,
            fig: 3,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 5,
            art: 2,
            arm: 1,
            aa: 1,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: 100,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: 0.0,
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 4,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    retreat_round_zero: true,
  };

  let output = multiwaveExternal(input);
  console.log(output.attack.survives[0], 'attack survives');
  console.log(output.attack.ipcLoss[0], 'attack ipc loss');
  console.log(output.defense.survives[0], 'defense survives');
  console.log(output.defense.ipcLoss[0], 'defense ipc loss');
  console.log(input);
}
if (true) {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 3,
            arm: 2,
            fig: 3,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 5,
            art: 2,
            arm: 1,
            aa: 1,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: 100,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: 0.0,
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 4,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    retreat_round_zero: false,
  };

  let output = multiwaveExternal(input);
  console.log(output.attack.survives[0], 'attack survives');
  console.log(output.attack.ipcLoss[0], 'attack ipc loss');
  console.log(output.defense.survives[0], 'defense survives');
  console.log(output.defense.ipcLoss[0], 'defense ipc loss');
  console.log(input);
}

{
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 1,
            arm: 0,
            fig: 1,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 1,
            art: 0,
            arm: 0,
            aa: 1,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: 100,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: 0.0,
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 4,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    retreat_round_zero: true,
  };

  let output = multiwaveExternal(input);
  console.log(output.attack.survives[0], 'attack survives');
  console.log(output.attack.ipcLoss[0], 'attack ipc loss');
  console.log(output.defense.survives[0], 'defense survives');
  console.log(output.defense.ipcLoss[0], 'defense ipc loss');
  console.log(input);
}
{
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 1,
            arm: 0,
            fig: 1,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 1,
            art: 0,
            arm: 0,
            aa: 1,
          },
          ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
          takes: 0,
          aaLast: false,
        },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: 100,
        retreat_threshold: 0,
        retreat_expected_ipc_profit_threshold: 0.0,
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 4,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
    retreat_round_zero: false,
  };

  let output = multiwaveExternal(input);
  console.log(output.attack.survives[0], 'attack survives');
  console.log(output.attack.ipcLoss[0], 'attack ipc loss');
  console.log(output.defense.survives[0], 'defense survives');
  console.log(output.defense.ipcLoss[0], 'defense ipc loss');
  console.log(input);
}
*/

if (false) {
  type Setting = [
    string,
    number | undefined,
    number,
    number | undefined,
    boolean,
    number,
    boolean,
    number,
  ];

  let out = [];

  let verbose_global = 4;
  let fullrounds = 0;
  let roundless_global = true;

  let inputSettings2: Setting[] = [
    [
      'no retreat',
      undefined,
      fullrounds,
      undefined,
      false,
      0,
      roundless_global,
      1.0,
    ],
    ['1 round', undefined, 1, undefined, false, 0, roundless_global, 1.0],
    ['2 round', undefined, 2, undefined, false, 0, roundless_global, 1.0],
    ['3 round', undefined, 3, undefined, false, 0, roundless_global, 1.0],
    ['4 round', undefined, 4, undefined, false, 0, roundless_global, 1.0],
    ['EV retreat', 0, fullrounds, undefined, false, 0, roundless_global, 1.0],
    [
      'EV retreat + strafe',
      0,
      fullrounds,
      0.05,
      false,
      0,
      roundless_global,
      1.0,
    ],
    [
      'strafe only',
      undefined,
      fullrounds,
      0.05,
      false,
      0,
      roundless_global,
      1.0,
    ],
    [
      'DZ + no retreat',
      undefined,
      fullrounds,
      undefined,
      true,
      0,
      roundless_global,
      1.0,
    ],
    ['DZ + 1 round', undefined, 1, undefined, true, 0, roundless_global, 1.0],
    [
      'DZ + EV retreat',
      0,
      fullrounds,
      undefined,
      true,
      0,
      roundless_global,
      1.0,
    ],
    [
      'TV + DZ + no retreat',
      undefined,
      fullrounds,
      undefined,
      true,
      -10,
      roundless_global,
      1.0,
    ],
    [
      'TV + DZ + 1 round',
      undefined,
      1,
      undefined,
      true,
      -10,
      roundless_global,
      1.0,
    ],
    [
      'TV + DZ + EV retreat',
      0,
      fullrounds,
      undefined,
      true,
      -10,
      roundless_global,
      1.0,
    ],
    [
      'air retreat 0.0',
      undefined,
      fullrounds,
      undefined,
      false,
      0,
      roundless_global,
      0.0,
    ],
    [
      'air retreat 0.1',
      undefined,
      fullrounds,
      undefined,
      false,
      0,
      roundless_global,
      0.1,
    ],
    [
      'air retreat 0.2',
      undefined,
      fullrounds,
      undefined,
      false,
      0,
      roundless_global,
      0.2,
    ],
  ];
  inputSettings2 = [
    [
      'no retreat',
      undefined,
      fullrounds,
      undefined,
      false,
      0,
      roundless_global,
      1.0,
    ],
    ['EV retreat', 0, fullrounds, undefined, false, 0, roundless_global, 1.0],
  ];
  inputSettings2.push(inputSettings2[0]);
  inputSettings2.push(inputSettings2[1]);
  inputSettings2.push(inputSettings2[0]);
  inputSettings2.push(inputSettings2[1]);
  inputSettings2.push(inputSettings2[0]);
  inputSettings2.push(inputSettings2[1]);
  let inputSettings3: Setting[] = [
    //["no retreat 0 rounds", undefined, 0, undefined, false, 0, false],
    //["no retreat 0 rounds", undefined, 0, undefined, false, 0, true],
    ['no retreat 0 rounds', undefined, 100, undefined, false, 0, false, 1.0],
    //["no retreat 100 rounds", undefined, 100, 0.05, false, 0, false],
  ];
  let inputSettings: Setting[] = inputSettings2;
  /*
let inputSettings : Setting[] = []

for (let i = 0; i < 20; i++) {
   inputSettings.push(inputSettings4[0]);
}
*/

  inputSettings = inputSettings2;

  let attackerString: string = '';
  let defenderString: string = '';
  let precision = 3;

  for (let i = 0; i < inputSettings.length; i++) {
    let [
      description,
      retreat,
      round,
      strafe,
      is_deadzone,
      territory_value,
      roundless,
      retreat_air,
    ] = inputSettings[i];

    const input: MultiwaveInput = {
      wave_info: [
        {
          attack: {
            units: {
              sub: 6,
              des: 1,
              cru: 1,
              acc: 5,
              fig: 10,
              bom: 0,
              bat: 2,
            },
            ool: ['sub', 'des', 'acc', 'fig', 'bom', 'bat'],
            takes: 0,
            aaLast: false,
          },
          defense: {
            units: {
              sub: 7,
              des: 5,
              cru: 1,
              acc: 3,
              fig: 6,
              bat: 1,
              tra: 2,
            },
            ool: ['sub', 'des', 'acc', 'fig', 'bat', 'tra'],
            takes: 0,
            aaLast: false,
          },
          att_submerge: false,
          def_submerge: false,
          att_dest_last: false,
          def_dest_last: false,
          is_crash_fighters: false,
          rounds: round,
          retreat_threshold: 0,
          retreat_expected_ipc_profit_threshold: retreat,
          retreat_strafe_threshold: strafe,
        },
      ],
      debug: false,
      prune_threshold: 1e-12,
      report_prune_threshold: 1e-12,
      is_naval: true,
      in_progress: false,
      num_runs: 1,
      verbose_level: verbose_global,
      diceMode: 'standard',
      sortMode: 'ipc_cost',
    };
    const input2: MultiwaveInput = {
      wave_info: [
        {
          attack: {
            units: {
              inf: 100,
              art: 20,
              arm: 10,
              fig: 10,
              bom: 0,
              bat: 0,
              cru: 0,
            },
            ool: ['inf', 'art', 'arm', 'fig', 'bom'],
            takes: 0,
            aaLast: false,
          },
          defense: {
            units: {
              inf: 100,
              art: 0,
              arm: 10,
              fig: 10,
              bom: 0,
              aa: 3,
            },
            ool: ['aa', 'bom', 'inf', 'art', 'arm', 'fig'],
            takes: 0,
            aaLast: false,
          },
          att_submerge: false,
          def_submerge: false,
          att_dest_last: false,
          def_dest_last: false,
          is_crash_fighters: false,
          rounds: round,
          retreat_threshold: 0,
          retreat_expected_ipc_profit_threshold: retreat,
          retreat_strafe_threshold: strafe,
          retreat_lose_air_probability: retreat_air,
        },
      ],
      debug: false,
      prune_threshold: 1e-12,
      report_prune_threshold: 1e-12,
      is_naval: false,
      in_progress: false,
      num_runs: 1,
      verbose_level: verbose_global,
      diceMode: 'standard',
      sortMode: 'ipc_cost',
      is_deadzone: is_deadzone,
      territory_value: territory_value,
      do_roundless_eval: roundless,
      retreat_round_zero: false,
    };
    /*
	  const input2: MultiwaveInput = {
		wave_info: [
		  {
			attack: {
			  units: {
				inf: 9,
				art: 2,
				arm: 3,
				fig: 2,
				bom: 0,
				bat: 0,
				cru: 0,
			  },
			  ool: ['inf', 'art', 'arm', 'fig', 'bom'],
			  takes: 0,
			  aaLast: false,
			},
			defense: {
			  units: {
				inf: 8,
				art: 0,
				arm: 4,
				fig: 0,
				bom: 0,
				aa: 1,
			  },
			  ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
			  takes: 0,
			  aaLast: false,
			},
			att_submerge: false,
			def_submerge: false,
			att_dest_last: false,
			def_dest_last: false,
			is_crash_fighters: false,
			rounds: round,
			retreat_threshold: 0,
			retreat_expected_ipc_profit_threshold: retreat,
			retreat_strafe_threshold: strafe,
		  },
		],
		debug: false,
		prune_threshold: 1e-12,
		report_prune_threshold: 1e-12,
		is_naval: false,
		in_progress: false,
		num_runs: 1,
		verbose_level: verbose_global,
		diceMode: 'standard',
		sortMode: 'ipc_cost',
		is_deadzone : true,
	  };
*/

    let t0 = performance.now();
    console.time(description);
    let output = multiwaveExternal(input2);
    let t1 = performance.now() - t0;
    console.timeEnd(description);
    console.log(input2);

    attackerString = JSON.stringify(input2.wave_info[0].attack.units);
    defenderString = JSON.stringify(input2.wave_info[0].defense.units);

    console.log(output, description);

    let profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];

    let o = [
      profit.toFixed(precision),
      output.defense.ipcLoss[0].toFixed(precision),
      output.attack.ipcLoss[0].toFixed(precision),
      output.defense.survives[0].toFixed(precision),
      output.attack.survives[0].toFixed(precision),
      output.takesTerritory[0].toFixed(precision),
      output.rounds[0].toFixed(precision),
      t1.toFixed(precision),
      description,
    ];
    out.push(o);
  }

  let padding = 9;

  let heading =
    'profit'.padEnd(padding) +
    ' ' +
    'def loss'.padEnd(padding) +
    ' ' +
    'att loss'.padEnd(padding) +
    ' ' +
    'def surv'.padEnd(padding) +
    ' ' +
    'att surv'.padEnd(padding) +
    ' ' +
    'takes'.padEnd(padding) +
    ' ' +
    'rounds'.padEnd(padding) +
    ' ' +
    'runtime'.padEnd(padding) +
    ' ' +
    'description'.padEnd(padding) +
    ' ';

  console.log(attackerString, 'vs. ', defenderString);
  console.log(heading);
  for (let i = 0; i < out.length; i++) {
    let o = out[i];
    let result = '';
    for (let j = 0; j < o.length; j++) {
      result += o[j].padEnd(padding) + ' ';
    }
    console.log(result);
  }
  //  console.log(out)

  console.log(process.memoryUsage());
}
//
type SolveType =
  | 'multiEval'
  | 'exhaust'
  | 'linearSearch'
  | 'gridSearch'
  | 'fuzzyBinarySearch';
type AttDefType = 'attacker' | 'defender';

if (true) {
  type Setting = [
    string,
    number | undefined,
    number,
    number | undefined,
    boolean,
    number,
    boolean,
    number,
  ];

  let out: any[] = [];

  let verbose_global = 0;
  let fullrounds = 0;
  let roundless_global = true;

  let inputSettings2: Setting[] = [];
  let inputSettings: Setting[] = inputSettings2;

  inputSettings = [];
  inputSettings.push([
    'no retreat',
    undefined,
    fullrounds,
    undefined,
    false,
    0,
    roundless_global,
    1.0,
  ]);

  let attackerString: string = '';
  let defenderString: string = '';
  let precision = 5;

  for (let i = 0; i < inputSettings.length; i++) {
    let [
      description,
      retreat,
      round,
      strafe,
      is_deadzone,
      territory_value,
      roundless,
      retreat_air,
    ] = inputSettings[i];

    const input2: MultiwaveInput = {
      wave_info: [
        {
          attack: {
            units: {
              inf: 120,
              art: 50,
              arm: 0,
              fig: 10,
              bom: 10,
            },
            ool: ['inf', 'art', 'arm', 'fig', 'bom'],
            takes: 0,
            aaLast: false,
          },
          defense: {
            units: {
              inf: 60,
              art: 0,
              arm: 10,
              fig: 10,
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
          rounds: round,
          retreat_threshold: 0,
          retreat_expected_ipc_profit_threshold: retreat,
          retreat_strafe_threshold: strafe,
          retreat_lose_air_probability: retreat_air,
          retreat_pwin_threshold: 0, // optional
          pwinMode: 'destroys',
        },
      ],
      debug: false,
      prune_threshold: 1e-12,
      report_prune_threshold: 1e-12,
      is_naval: false,
      in_progress: false,
      num_runs: 1,
      verbose_level: verbose_global,
      diceMode: 'standard',
      sortMode: 'ipc_cost',
      is_deadzone: is_deadzone,
      territory_value: territory_value,
      do_roundless_eval: roundless,
      retreat_round_zero: false,
    };

    /*
    const maxArmy: Army = {
      inf: 100,
      art: 40,
      arm: 0,
      fig: 5,
      bom: 5,
    };
    const stepArmy: Army = {
      inf: 1,
      art: 1,
      arm: 0,
      fig: 1,
      bom: 1,
    };
    const minArmy: Army = {
      inf: 0,
      art: 0,
      arm: 0,
      fig: 0,
      bom: 0,
    };
    */
    const maxArmy: Army = {
      inf: 120,
      art: 50,
      arm: 10,
      fig: 10,
      bom: 0,
    };
    const stepArmy: Army = {
      inf: 1,
      art: 1,
      arm: 1,
      fig: 1,
      bom: 1,
    };
    const minArmy: Army = {
      inf: 0,
      art: 0,
      arm: 0,
      fig: 0,
      bom: 0,
      aa: 0,
    };
    const armies = getSubArmies(maxArmy, minArmy, stepArmy);
    console.log(armies.length, 'armies length');
    console.log(maxArmy, minArmy, stepArmy);
    //console.log(armies);

    const surviveThreshold = 0.9;
    const doMultiEval = false;
    const solveType: SolveType = 'fuzzyBinarySearch' as SolveType;
    //const solveType: SolveType = 'gridSearch' as SolveType;
    //const solveType: SolveType = 'linearSearch' as SolveType;
    //const solveType: SolveType = 'multiEval' as SolveType;
    //const solveType: SolveType = 'exhaust' as SolveType;
    const attDefType: AttDefType = 'attacker' as AttDefType;
    //const attDefType: AttDefType = 'defender' as AttDefType;
    switch (solveType) {
      case 'multiEval': {
        let armylist = armies.map((tuple) => tuple[0]);
        let multiEvalInput: MultiEvalInput = {
          ...input2,
          defenderList: armylist,
          attackerList: [],
        };
        multiEvalInput.wave_info[0].defense.units = maxArmy;
        let t0 = performance.now();
        console.time(description);
        let output = multiEvalExternal(multiEvalInput);
        let t1 = performance.now() - t0;
        console.timeEnd(description);
        console.log(input2);
        console.log(output);

        let multiEvalResult = output.resultList.map((tuple) => [
          tuple[0],
          tuple[1],
          1 - tuple[2],
          tuple[3],
        ]);
        multiEvalResult.sort((a: any[], b: any[]) => {
          const av: number = Number(a[2] < surviveThreshold) ? 1.0 : 0.0;
          const bv: number = Number(b[2] < surviveThreshold) ? 1.0 : 0.0;
          if (av != bv) {
            return bv - av;
          } else {
            return Number(b[3]) - Number(a[3]);
          }
        });
        console.log(multiEvalResult);
        for (let k = 0; k < multiEvalResult.length; k++) {
          console.log(JSON.stringify(multiEvalResult[k]));
        }
        break;
      }
      case 'exhaust': {
        // brute force
        let out: [Army, number, number][] = [];
        for (let i = 0; i < armies.length; i++) {
          const [army, cost, AS, DS] = armies[i];
          const myinput: MultiwaveInput = {
            ...input2,
          };
          if (attDefType == 'defender') {
            myinput.wave_info[0].defense.units = army;
          } else {
            myinput.wave_info[0].attack.units = army;
          }
          myinput.wave_info[0].retreat_expected_ipc_profit_threshold =
            undefined;
          myinput.wave_info[0].retreat_pwin_threshold = undefined;
          const output = multiwaveExternal(myinput);
          const survive =
            attDefType == 'defender'
              ? output.defense.survives[0]
              : output.attack.survives[0];
          console.log(myinput);
          console.log(output.complexity);
          out.push([army, survive, cost]);
        }
        out.sort((a: any[], b: any[]) => {
          const av: number = Number(a[1] < surviveThreshold) ? 1.0 : 0.0;
          const bv: number = Number(b[1] < surviveThreshold) ? 1.0 : 0.0;
          if (av != bv) {
            return bv - av;
          } else {
            return Number(b[2]) - Number(a[2]);
          }
        });
        for (let k = 0; k < out.length; k++) {
          console.log(JSON.stringify(out[k]));
        }
        break;
      }
      case 'fuzzyBinarySearch':
        armies.sort((a: any[], b: any[]) => {
          const av: number =
            attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
          const bv: number =
            attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
          if (av != bv) {
            return av - bv;
          } else {
            return Number(a[1]) - Number(b[1]);
          }
        });
        console.log('sorted 1');
        for (let i = 0; i < armies.length; i++) {
          console.log(JSON.stringify(armies[i]));
        }
        let low = 0;
        let high = armies.length - 1;
        let iter = 0;
        let lowPower =
          attDefType == 'defender' ? armies[low][3] : armies[low][2];
        let highPower =
          attDefType == 'defender' ? armies[high][3] : armies[high][2];
        while (low < high && high - low > 1 && lowPower < highPower) {
          let mid = Math.floor((low + high) / 2);
          const [army, cost, AS, DS] = armies[mid];
          let midPower = attDefType == 'defender' ? DS : AS;
          /*
          if (midPower == lowPower || midPower == highPower) {
            break;
          }
            */
          if (midPower == highPower) {
            break;
          }
          let midIndexArray: number[] = [];
          for (let i = mid; i > low; i--) {
            const [army, cost, AS, DS] = armies[i];
            let thePower = attDefType == 'defender' ? DS : AS;
            if (thePower == midPower) {
              midIndexArray.push(i);
              continue;
            }
            break;
          }
          for (let i = mid + 1; i < high; i++) {
            const [army, cost, AS, DS] = armies[i];
            let thePower = attDefType == 'defender' ? DS : AS;
            if (thePower == midPower) {
              midIndexArray.push(i);
              continue;
            }
            break;
          }
          midIndexArray.sort();
          let midIndexArr2: number[] = [];
          if (midIndexArray.length <= 3) {
            midIndexArr2 = midIndexArray;
          } else {
            midIndexArr2.push(midIndexArray[0]);
            midIndexArr2.push(
              midIndexArray[Math.floor(midIndexArray.length / 2)],
            );
            midIndexArr2.push(midIndexArray[midIndexArray.length - 1]);
          }
          //midIndexArray  = [];
          //midIndexArray.push(mid);
          let anySurvive: boolean = false;
          let allSurvive: boolean = true;
          for (let i = 0; i < midIndexArr2.length; i++) {
            let ii = midIndexArr2[i];
            const [army, cost, AS, DS] = armies[ii];
            const myinput: MultiwaveInput = {
              ...input2,
            };
            if (attDefType == 'defender') {
              myinput.wave_info[0].defense.units = army;
            } else {
              myinput.wave_info[0].attack.units = army;
            }
            myinput.wave_info[0].retreat_expected_ipc_profit_threshold =
              undefined;
            myinput.wave_info[0].retreat_pwin_threshold = undefined;
            const output = multiwaveExternal(myinput);
            iter++;
            const survive =
              attDefType == 'defender'
                ? output.defense.survives[0]
                : output.attack.survives[0];
            if (survive >= surviveThreshold) {
              anySurvive = true;
            } else {
              allSurvive = false;
            }
          }
          if (allSurvive) {
            high = midIndexArray[0] - 1;
            highPower =
              attDefType == 'defender' ? armies[high][3] : armies[high][2];
          }
          if (!anySurvive) {
            low = midIndexArray[midIndexArray.length - 1];
            lowPower =
              attDefType == 'defender' ? armies[low][3] : armies[low][2];
          } else {
            high = midIndexArray[0];
            highPower =
              attDefType == 'defender' ? armies[high][3] : armies[high][2];
          }
        }
        let bestArmy = armies[high];
        let bestPower = attDefType == 'attacker' ? bestArmy[2] : bestArmy[3];
        bestPower = bestPower * 1.0 - 2;
        console.log('bestArmy', bestArmy);
        console.log('iterations', iter);
        armies.sort((a: any[], b: any[]) => {
          const av: number =
            attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
          const bv: number =
            attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
          const acost: number = av >= bestPower ? 0 : 1;
          const bcost: number = bv >= bestPower ? 0 : 1;
          if (acost != bcost) {
            return acost - bcost;
          } else {
            return Number(a[1]) - Number(b[1]);
          }
        });
        console.log('sorted 2');
        for (let i = 0; i < armies.length; i++) {
          console.log(JSON.stringify(armies[i]));
        }
        for (let i = 0; i < armies.length; i++) {
          const [army, cost, AS, DS] = armies[i];
          const myinput: MultiwaveInput = {
            ...input2,
          };
          if (attDefType == 'defender') {
            myinput.wave_info[0].defense.units = army;
          } else {
            myinput.wave_info[0].attack.units = army;
          }
          myinput.wave_info[0].retreat_expected_ipc_profit_threshold =
            undefined;
          myinput.wave_info[0].retreat_pwin_threshold = undefined;
          const output = multiwaveExternal(myinput);
          iter++;
          const survive =
            attDefType == 'defender'
              ? output.defense.survives[0]
              : output.attack.survives[0];
          if (survive >= surviveThreshold) {
            bestArmy = armies[i];
            break;
          }
        }

        console.log('Optimized Integer Parameters:', bestArmy);
        console.log('Minimum value found:', bestArmy[1]);
        console.log('iterations', iter);

        break;
      case 'linearSearch':
      case 'gridSearch':
        {
          const maxUnits = maxArmy;

          const mymap: Map<string, number> = new Map();
          let callCount = 0;
          function armyCostObjective(vars: number[]): number {
            let key = JSON.stringify(vars);
            let retval = mymap.get(key);
            if (retval != undefined) {
              return retval;
            }
            callCount++;
            let t0 = performance.now();
            retval = armyCostObjectiveHelper(vars);
            let t1 = performance.now() - t0;
            //console.log(callCount, t1, vars, retval, 'call objective');
            mymap.set(key, retval);
            return retval;
          }
          function armyCostObjectiveHelper(vars: number[]): number {
            // vars: [inf, art, arm, fig, bom, aa]
            const army: Army =
              attDefType == 'defender'
                ? {
                    inf: Math.round(vars[0]),
                    art: Math.round(vars[1]),
                    arm: Math.round(vars[2]),
                    fig: Math.round(vars[3]),
                    bom: Math.round(vars[4]),
                    aa: Math.round(vars[5]),
                  }
                : {
                    inf: Math.round(vars[0]),
                    art: Math.round(vars[1]),
                    arm: Math.round(vars[2]),
                    fig: Math.round(vars[3]),
                    bom: Math.round(vars[4]),
                    bat: Math.round(vars[5]),
                    cru: Math.round(vars[6]),
                  };
            if (attDefType == 'defender') {
              input2.wave_info[0].defense.units = army;
            } else {
              input2.wave_info[0].attack.units = army;
            }

            const output = multiwaveExternal(input2);
            const survive =
              attDefType == 'defender'
                ? output.defense.survives[0]
                : output.attack.survives[0];
            const cost = getArmyCost(army);

            let overflow = 0;
            for (const [uid, count] of Object.entries(army)) {
              if (count < 0) {
                overflow += -count;
              }
              let max = maxUnits[<UnitIdentifier>uid] ?? 0;
              if (count > max) {
                overflow += count;
              }
            }
            if (overflow > 0) {
              return cost + 500 * overflow;
            }

            // Penalty if constraint not met
            if (survive < surviveThreshold) {
              return cost + 1000000 * (surviveThreshold - survive); // Large penalty
            }
            return cost;
          }

          // Initial guess (e.g., max units)
          const numInf: number = maxArmy['inf'] ?? 0;
          const numArt: number = maxArmy['art'] ?? 0;
          const numArm: number = maxArmy['arm'] ?? 0;
          const numFig: number = maxArmy['fig'] ?? 0;
          const numBom: number = maxArmy['bom'] ?? 0;
          const numCru: number = maxArmy['cru'] ?? 0;
          const numBat: number = maxArmy['bat'] ?? 0;
          const numAA: number = maxArmy['aa'] ?? 0;

          const initial: number[] =
            attDefType == 'defender'
              ? [numInf, numArt, numArm, numFig, numBom, numAA]
              : [numInf, numArt, numArm, numFig, numBom, numBat, numCru];
          const bounds: [number, number][] =
            attDefType == 'defender'
              ? [
                  [0, numInf],
                  [0, numArt],
                  [0, numArm],
                  [0, numFig],
                  [0, numBom],
                  [0, numAA],
                ]
              : [
                  [0, numInf],
                  [0, numArt],
                  [0, numArm],
                  [0, numFig],
                  [0, numBom],
                  [0, numBat],
                  [0, numCru],
                ];

          // Example Usage
          const initialGuess = initial;
          console.log(initialGuess, 'initialGuess');
          console.log(bounds, 'bounds');
          const finalParams: Vector =
            solveType == 'gridSearch'
              ? gridSearch(armyCostObjective, bounds)
              : lineSearch(armyCostObjective, initialGuess, bounds, 5);

          console.log('Optimized Integer Parameters:', finalParams);
          console.log('Minimum value found:', armyCostObjective(finalParams));
          console.log(mymap.size, 'map size');

          break;
        }

        continue;
    }
    console.log(process.memoryUsage());
  }
}

function approximateGradient(
  initialParams: number[],
  bounds: [number, number][],
  delta: number, // Small change for approximating gradient
  objectiveFunction: (x: number[]) => number,
): number[] {
  let params = [...initialParams];

  let gradients: number[] = [];

  // Calculate approximate gradient for each parameter
  for (let j = 0; j < params.length; j++) {
    const originalVal = params[j];
    const lowBound = bounds[j][0];
    const highBound = bounds[j][1];

    // Perturb parameter slightly in positive direction
    params[j] = Math.min(originalVal + delta, highBound);
    let xplus = params[j];
    const fPlusDelta = objectiveFunction(params);

    // Perturb parameter slightly in negative direction
    params[j] = Math.max(originalVal - delta, lowBound);
    let xminus = params[j];
    const fMinusDelta = objectiveFunction(params);

    // Calculate approximate gradient using finite difference
    gradients[j] =
      xplus > xminus ? (fPlusDelta - fMinusDelta) / (xplus - xminus) : 0;

    // Restore original parameter value
    params[j] = originalVal;
  }

  return gradients;
}

function doNeighborSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector,
  bound: [number, number][],
  delta: number,
): Vector {
  let range: Number[][] = [];
  for (let i = 0; i < x.length; i++) {
    let minval = bound[i][0];
    let maxval = bound[i][1];
    let min = x[i] > 0 ? Math.max(x[i] - delta, minval) : 0;
    let max = x[i] > 0 ? Math.min(x[i] + delta, maxval) : 0;
    let v = getIntegersInRange(min, max, 1);
    range.push(v);
  }
  //console.log(range, "range");
  let combinations = getCombinations(range);
  //console.log(combinations, "combinations");
  //console.log(combinations.length, "combinations");
  let miny = objectiveFn(x);
  let minx = x;
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    //console.log(x1, y1, "x1, y1")
    if (y1 < miny) {
      miny = y1;
      minx = x1;
    }
  }

  //console.log(minx, miny, "minx, miny")
  return minx;
}

function doGridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number, number][],
): Vector {
  let range: Number[][] = [];
  for (let i = 0; i < bound.length; i++) {
    let minval = bound[i][0];
    let maxval = bound[i][1];
    let step = bound[i][2];
    //console.log(i, minval, maxval, step);
    let v = getIntegersInRange(minval, maxval, step);
    //console.log(i, minval, maxval, step, v);
    range.push(v);
  }
  //console.log(range, "range");
  let combinations = getCombinations(range);
  //console.log(combinations, "combinations");
  console.log(combinations.length, 'combinations');
  let miny = undefined;
  let minx: Vector = [];
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    //console.log(x1, y1, "x1, y1")
    if (miny == undefined || y1 < miny) {
      miny = y1;
      minx = x1;
    }
  }

  //console.log(minx, miny, "minx, miny")
  return minx;
}

function gridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number][],
): Vector {
  let currBound: [number, number, number][] = [];
  for (let i = 0; i < bound.length; i++) {
    let low = bound[i][0];
    let high = bound[i][1];
    let step = Math.max(Math.ceil((high - low) / 3), 1);
    currBound.push([low, high, step]);
  }
  console.log(currBound, 'currBound');
  let best = doGridSearch(objectiveFn, currBound);

  for (let i = 0; i < 10; i++) {
    let prevBound = currBound.slice();

    currBound = [];
    let stop = true;
    for (let i = 0; i < best.length; i++) {
      let oldstep = prevBound[i][2];
      let low = Math.max(best[i] - oldstep, bound[i][0]);
      let high = Math.min(best[i] + oldstep, bound[i][1]);
      let step = Math.max(Math.floor((high - low) / 3), 1);
      if (step > 1) {
        stop = false;
      }
      currBound.push([low, high, step]);
    }
    console.log(currBound, 'currBound');
    best = doGridSearch(objectiveFn, currBound);
    if (stop) {
      break;
    }
  }

  return best;
}

function lineSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector,
  bound: [number, number][],
  numIterations: number,
): Vector {
  let x0 = x.slice();
  for (let i = 0; i < numIterations; i++) {
    let gradientAtX = approximateGradient(x0, bound, 1.0, objectiveFn);

    // negative gradient
    let direction: Vector = gradientAtX.map((val, i) =>
      val > 0 ? -val : -val,
    );
    for (let i = 0; i < direction.length; i++) {
      let val = x0[i];
      let minBound = bound[i][0];
      let maxBound = bound[i][1];
      let dir = direction[i];
      if (val <= minBound && dir < 0) {
        direction[i] = 0;
      }
      if (val >= maxBound && dir > 0) {
        direction[i] = 0;
      }
    }
    let stepSize = backtrackingLineSearch(
      objectiveFn,
      x0,
      bound,
      direction,
      0.5,
      0.5,
      2.0,
    );
    const newX: Vector = x0.map((val, i) => {
      let v = Math.round(val + stepSize * direction[i]);
      if (v < bound[i][0]) {
        v = bound[i][0];
      }
      if (v > bound[i][1]) {
        v = bound[i][1];
      }
      return v;
    });
    //console.log(i, x0, gradientAtX, direction, stepSize, newX, "before check");
    let same = true;
    for (let i = 0; i < newX.length; i++) {
      if (newX[i] != x0[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      // do neighbor search
      let xNew = doNeighborSearch(objectiveFn, x0, bound, 8);
      let same = true;
      for (let i = 0; i < xNew.length; i++) {
        if (xNew[i] != x0[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        break;
      }
      x0 = xNew;
      console.log(i, x0, 'neighbor search');
      continue;
    }
    x0 = newX;
    console.log(i, x0, direction, stepSize, newX);
  }
  return x0;
}

type Vector = number[]; // Represents a vector (e.g., a point in n-dimensional space)

interface ObjectiveFunction {
  (x: Vector): number; // Evaluates the objective function at point x
}

function backtrackingLineSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector, // Current point
  bound: [number, number][], // Current point
  direction: Vector, // Search direction (e.g., negative gradient)
  alpha: number = 0.5, // Armijo condition parameter (0 < alpha < 1)
  beta: number = 0.8, // Backtracking reduction factor (0 < beta < 1)
  initialStepSize: number = 1.0, // Initial step size
): number {
  let stepSize = initialStepSize;

  // Calculate the dot product of gradient and direction for the Armijo condition
  const gradientAtX = approximateGradient(x, bound, 1.0, objectiveFn);
  let dotProduct = 0;
  for (let i = 0; i < x.length; i++) {
    dotProduct += gradientAtX[i] * direction[i];
  }

  // Backtracking loop
  while (true) {
    // Calculate the new point with the current step size
    let xNew: Vector = x.map((val, i) =>
      Math.round(val + stepSize * direction[i]),
    );
    for (let i = 0; i < xNew.length; i++) {
      let max = bound[i][1];
      let min = bound[i][0];
      if (xNew[i] > max) {
        xNew[i] = max;
      }
      if (xNew[i] < min) {
        xNew[i] = min;
      }
    }

    let same = true;
    for (let i = 0; i < xNew.length; i++) {
      if (xNew[i] != x[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      break;
    }
    let y1 = objectiveFn(xNew);
    let y0 = objectiveFn(x);
    //console.log(y1, y0, xNew, x, stepSize, 'y1, y0, xNew, x, step');
    // Check the Armijo condition
    if (y1 < y0 + alpha * stepSize * dotProduct) {
      break; // Condition met, exit loop
    }

    // Reduce the step size if the condition is not met
    stepSize *= beta;

    // Optional: Add a check for minimum step size to prevent infinite loops
    // if (stepSize < epsilon) { /* Handle small step size or convergence */ }
  }

  return stepSize;
}
