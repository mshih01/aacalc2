import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  multiwaveComplexity,
  multiwaveComplexityFast,
  multiwaveComplexityFastV2,
  sbrExternal,
  type SbrInput,
} from './index.js';
import type { PwinMode } from './solve.js';
import { test, expect } from 'vitest';

let out = [];
let verbose = 0; // 0, 1, 2, 3

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
];

let do_roundless_global = true;
let complexity_global = false;

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

console.log(process.memoryUsage());

let attackerString: string = '';
let defenderString: string = '';
let precision = 3;

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
    complexity = multiwaveComplexityFast(myinput);
    console.log(complexity, 'multiwaveComplexityFast');
    console.timeEnd(description);

    console.time(description);
    complexity = multiwaveComplexityFastV2(myinput);
    console.log(complexity, 'multiwaveComplexityFastV2');
    console.timeEnd(description);
  } else {
    let t0 = performance.now();
    console.time(description);

    let testName = 'test' + testIndex;
    let inputName = 'input/' + testName;
    let outputName = 'output/' + testName;

    const output = multiwaveExternal(myinput);
    test(`Regression test for ${testName}`, async () => {
      expect(output).toMatchSnapshot();
    });
    let t1 = performance.now() - t0;
    console.timeEnd(description);
    console.log(myinput);

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
