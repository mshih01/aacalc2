import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
} from './index.js';

let out = [];
//              no retreat, 1 round, EV based, EV based with strafe, strafe without EV
let retreats = [undefined, undefined, 0, 0, undefined];
let rounds = [100, 1, 100, 100, 100];
let strafes = [undefined, undefined, undefined, 0.05, 0.05];

type Setting = [
  string, // description
  number | undefined, // retreat threshold
  number, // rounds, required
  number | undefined, // strafe threshold
  boolean, // is deadzone
  number, // territory value
  boolean, // do roundless eval, optional
];

let do_roundless_global = false;

let inputSettings2: Setting[] = [
  ['no retreat', undefined, 100, undefined, false, 0, do_roundless_global], // no retreat  (A)
  ['1 round', undefined, 1, undefined, false, 0, do_roundless_global], // 1 round (B)
  ['EV based retreat', 0, 100, undefined, false, 0, do_roundless_global], // EV based retreat (C)
  ['EV retreat + strafe', 0, 100, 0.05, false, 0, do_roundless_global], // EV based retreat + strafe (D)
  ['strafe only', undefined, 100, 0.05, false, 0, do_roundless_global], // strafe (E)
  ['DZ + no retreat', undefined, 100, undefined, true, 0, do_roundless_global], // no retreat  (A)
  ['DZ + 1 round', undefined, 1, undefined, true, 0, do_roundless_global], // 1 round (B)
  ['DZ + EV based retreat', 0, 100, undefined, true, 0, do_roundless_global], // EV based retreat (C)
  ['DZ + EV retreat + strafe', 0, 100, 0.05, true, 0, do_roundless_global], // EV based retreat + strafe (D)
  ['DZ + strafe only', undefined, 100, 0.05, true, 0, do_roundless_global], // strafe (E)
  [
    'DZ + terrValue + no retreat',
    undefined,
    100,
    undefined,
    true,
    -5,
    do_roundless_global,
  ], // no retreat  (A)
  [
    'DZ + terrValue + 1 round',
    undefined,
    1,
    undefined,
    true,
    -5,
    do_roundless_global,
  ], // 1 round (B)
  [
    'DZ + terrValue + EV based retreat',
    0,
    100,
    undefined,
    true,
    -5,
    do_roundless_global,
  ], // EV based retreat (C)
  [
    'DZ + terrValue + EV retreat + strafe',
    0,
    100,
    0.05,
    true,
    -5,
    do_roundless_global,
  ], // EV based retreat + strafe (D)
  [
    'DZ + terrValue + strafe only',
    undefined,
    100,
    0.05,
    true,
    -5,
    do_roundless_global,
  ], // strafe (E)
];

let inputSettings: Setting[] = [
  ['no retreat 0 roundless', undefined, 0, undefined, false, 0, true], // no retreat  (A)
  ['no retreat 100 roundless', undefined, 100, undefined, false, 0, true], // no retreat  (A)
  ['no retreat 0', undefined, 0, undefined, false, 0, false], // no retreat  (A)
  ['no retreat 100', undefined, 100, undefined, false, 0, false], // no retreat  (A)
];

console.profile('multiwaveExternal');
for (let i = 0; i < inputSettings.length; i++) {
  let setting = inputSettings[i];
  let [
    description,
    retreat,
    round,
    strafe,
    is_deadzone,
    territory_value,
    do_roundless_eval,
  ] = setting;

  const input2: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 11,
            art: 2,
            arm: 1,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 7,
            art: 1,
            arm: 5,
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
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 3,
    diceMode: 'standard',
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
  };
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
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
  };
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
      },
    ],
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval: false,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'ipc_cost', // 'unit_count' or 'ipc_loss'
    is_deadzone: is_deadzone, // optional, default is false
    territory_value: territory_value, // optional, default is 0
    do_roundless_eval: do_roundless_eval, // optional, default is false
  };

  console.time(description);
  let output = multiwaveExternal(input3);
  console.log(output, description);
  console.timeEnd(description);
  console.log(input3);

  let o = [
    description,
    output.defense.ipcLoss[0] - output.attack.ipcLoss[0],
    output.defense.ipcLoss[0],
    output.attack.ipcLoss[0],
    output.takesTerritory[0],
  ];
  out.push(o);
}

console.profileEnd('multiwaveExternal');
console.log(out);
