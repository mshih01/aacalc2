import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
} from './index.js';
import { test, expect } from 'vitest';

test('multiwaveExternal', () => {
  const input: MultiwaveInput = {
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
    retreat_round_zero: true,
  };

  let output = multiwaveExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.785045644306524, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(145.51832967936105, 1e-4);
  expect(output.defense.survives[0]).to.closeTo(0.2015387892399474, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(242.3648995989333, 1e-4);
});

test('multiwaveExternal expected profit', () => {
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
    verbose_level: 3,
    diceMode: 'standard',
    sortMode: 'unit_count',
    retreat_round_zero: false,
  };

  let output = multiwaveExternal(input);
  console.log(output.attack.survives[0], 'attack survives');
  console.log(output.attack.ipcLoss[0], 'attack ipc loss');
  console.log(output.defense.survives[0], 'defense survives');
  console.log(output.defense.ipcLoss[0], 'defense ipc loss');
  console.log(input);
  expect(output.attack.survives[0]).to.closeTo(0.9962273852328778, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(17.241589222000417, 1e-6);
  expect(output.defense.survives[0]).to.closeTo(0.8694320798527282, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(13.20762090952632, 1e-6);
});

test('multiwaveExternal 2-wave swap', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 3,
            arm: 2,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 2,
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
        rounds: 100,
        retreat_threshold: 0,
      },
      {
        attack: {
          units: {
            inf: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
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
        rounds: 100,
        retreat_threshold: 0,
        use_attackers_from_previous_wave: true,
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
    sortMode: 'ipc_cost',
  };

  let output = multiwaveExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.9996583996875138, 1e-6);
  expect(output.attack.survives[1]).to.closeTo(0.008370940323321308, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(6.10378596801344, 1e-4);
  expect(output.attack.ipcLoss[1]).to.closeTo(16.96428150807741, 1e-4);
  expect(output.defense.survives[0]).to.closeTo(0.00023465789753225713, 1e-6);
  expect(output.defense.survives[1]).to.closeTo(0.9887701246193211, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(10.998827370671307, 1e-4);
  expect(output.defense.ipcLoss[1]).to.closeTo(4.244940116162402, 1e-4);
  expect(output.takesTerritory[0]).to.closeTo(0.9992233108500047, 1e-6);
  expect(output.takesTerritory[1]).to.closeTo(0.008370940323321308, 1e-6);

  let attTotal = 0;
  let defTotal = 0;
  for (const v of Object.values(output.casualtiesInfo.attack))
    attTotal += v.amount;
  for (const v of Object.values(output.casualtiesInfo.defense))
    defTotal += v.amount;
  expect(attTotal).to.closeTo(1.0, 0.001);
  expect(defTotal).to.closeTo(1.0, 0.001);
});

test('multiwaveExternal 3-wave swap', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 1,
            arm: 1,
            fig: 0,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 4,
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
        rounds: 100,
        retreat_threshold: 0,
      },
      {
        attack: {
          units: {
            inf: 2,
            arm: 1,
            fig: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
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
        rounds: 100,
        retreat_threshold: 0,
      },
      {
        attack: {
          units: {
            inf: 2,
          },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            inf: 0,
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
        rounds: 100,
        retreat_threshold: 0,
        use_attackers_from_previous_wave: true,
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
    sortMode: 'ipc_cost',
  };

  let output = multiwaveExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.023171426334031, 1e-6);
  expect(output.attack.survives[1]).to.closeTo(0.871053707243936, 1e-6);
  expect(output.attack.survives[2]).to.closeTo(0.451943932142794, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(8.845739230940863, 1e-4);
  expect(output.attack.ipcLoss[1]).to.closeTo(19.631630917377095, 1e-4);
  expect(output.attack.ipcLoss[2]).to.closeTo(19.50558008230619, 1e-4);
  expect(output.defense.survives[0]).to.closeTo(0.969050913262694, 1e-6);
  expect(output.defense.survives[1]).to.closeTo(0.111891474987238, 1e-6);
  expect(output.defense.survives[2]).to.closeTo(0.49316872426591, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(3.829921932700006, 1e-4);
  expect(output.defense.ipcLoss[1]).to.closeTo(16.063194933313998, 1e-4);
  expect(output.defense.ipcLoss[2]).to.closeTo(4.102892602233529, 1e-4);
  expect(output.takesTerritory[0]).to.closeTo(0.023171426334031, 1e-6);
  expect(output.takesTerritory[1]).to.closeTo(0.7117250171687, 1e-6);
  expect(output.takesTerritory[2]).to.closeTo(0.451943932142794, 1e-6);

  let attTotal = 0;
  let defTotal = 0;
  for (const v of Object.values(output.casualtiesInfo.attack))
    attTotal += v.amount;
  for (const v of Object.values(output.casualtiesInfo.defense))
    defTotal += v.amount;
  expect(attTotal).to.closeTo(1.0, 0.001);
  expect(defTotal).to.closeTo(1.0, 0.001);
});

test('sbrExternal', () => {
  const input: SbrInput = {
    verbose_level: 0,
    diceMode: 'standard',
    attack: {
      units: {
        bom: 5,
      },
      ool: ['bom'],
      takes: 0,
      aaLast: false,
    },
    defense: {
      units: {
        ic: 20,
      },
      ool: ['ic'],
      takes: 0,
      aaLast: false,
    },
    in_progress: false,
    reportPruneThreshold: 1e-12,
    pruneThreshold: 1e-12,
  };
  let output = sbrExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.999871399176955, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(10, 1e-6);
  expect(output.defense.survives[0]).to.closeTo(0.8556527702363717, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(14.329007261845037, 1e-6);
});
