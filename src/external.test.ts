import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
} from './index.js';
import { test, expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'number' && !Number.isInteger(val),
  serialize: (val) => val.toFixed(14),
});

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
  expect(output).toMatchSnapshot();
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
  expect(output).toMatchSnapshot();
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
  expect(output).toMatchSnapshot();
});

test('multiwaveExternal 3-wave swap 0/0/1', () => {
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
  expect(output).toMatchSnapshot();
});

test('multiwaveExternal 3-wave swap 0/1/0', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 4,
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
            inf: 1,
            art: 1,
            fig: 1,
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
      {
        attack: {
          units: {
            inf: 1,
            art: 1,
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
        use_attackers_from_previous_wave: false,
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
  expect(output).toMatchSnapshot();
});

test('multiwaveExternal 3-wave swap 0/1/1', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            inf: 4,
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
            inf: 4,
            art: 1,
            fig: 1,
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
      {
        attack: {
          units: {
            inf: 4,
            art: 1,
            fig: 1,
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
        use_attackers_from_previous_wave: false,
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
  expect(output).toMatchSnapshot();
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
  expect(output).toMatchSnapshot();
});
