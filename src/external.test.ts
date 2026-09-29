import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
  type UnitIdentifier,
  type WaveInput,
} from './index.js';
import { getInternalInput } from './external.js';
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

test('multiwaveExternal per-wave ev_deadzone', () => {
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
        ev_deadzone: true,
        ev_territory_value: 2,
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

test('multiwave_external_fighters_carriers: default off', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: { des: 2 },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { acc: 1, fig: 2, cru: 1 },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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
      {
        attack: {
          units: { des: 5 },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { fig: 2 },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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

  // wave 2 defender = wave1 survivors (1 ACC, 2 Fig, 1 Cru) + 2 reinforcement
  // Fig = 4 air vs 2/carrier capacity.  With the option unset (default off) the
  // extra air keeps fighting on wave 2 (rolled-back behavior).
  const output = multiwaveExternal(input);

  // Flag false and flag undefined must behave identically (default off).
  expect(output).toEqual(
    multiwaveExternal({ ...input, multiwave_enforce_naval_fighters_carriers: false }),
  );

  expect(output).toMatchSnapshot();
});

test('multiwave_external_fighters_carriers: on retreats excess wave-2 air', () => {
  const base: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: { des: 2 },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { acc: 1, fig: 2, cru: 1 },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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
      {
        attack: {
          units: { des: 5 },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { fig: 2 },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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

  const off = multiwaveExternal(base);
  const on = multiwaveExternal({
    ...base,
    multiwave_enforce_naval_fighters_carriers: true,
  });

  // With the option on, the 2 extra reinforcement fighters (4 air vs 2/carrier
  // capacity) cannot fight on wave 2, so the defender survives wave 2 less often.
  expect(on.defense.survives[1]).toBeLessThan(off.defense.survives[1]);

  expect(on).toMatchSnapshot();
});

test('multiwave_external_fighters_carriers: no effect off naval or single-wave', () => {
  // single-wave naval battle: the transition loop that applies the option never runs.
  const singleWave: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: { des: 5 },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { acc: 1, fig: 2, cru: 1 },
          ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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
  expect(multiwaveExternal(singleWave)).toEqual(
    multiwaveExternal({ ...singleWave, multiwave_enforce_naval_fighters_carriers: true }),
  );

  // land multiwave battle: the option is gated on is_naval.
  const landInput: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: { inf: 6, arm: 2, fig: 2 },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { inf: 5, art: 2, arm: 1, aa: 1 },
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
          units: { inf: 6, arm: 2 },
          ool: ['inf', 'art', 'arm', 'fig', 'bom'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: { inf: 3 },
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
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'unit_count',
    retreat_round_zero: true,
  };
  expect(multiwaveExternal(landInput)).toEqual(
    multiwaveExternal({ ...landInput, multiwave_enforce_naval_fighters_carriers: true }),
  );
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

// --- negative defense counts (units that leave the battle before wave 2+) ---

const NEG_ATT_OOL: UnitIdentifier[] = ['inf', 'art', 'arm', 'fig', 'bom'];
const NEG_DEF_OOL: UnitIdentifier[] = ['aa', 'inf', 'art', 'arm', 'bom', 'fig'];

function negWave(
  attackUnits: Record<string, number>,
  defenseUnits: Record<string, number>,
  extra: Partial<WaveInput> = {},
): WaveInput {
  return {
    attack: {
      units: attackUnits,
      ool: NEG_ATT_OOL,
      takes: 0,
      aaLast: false,
    },
    defense: {
      units: defenseUnits,
      ool: NEG_DEF_OOL,
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
    ...extra,
  };
}

function negInput(wave_info: WaveInput[], is_naval = false): MultiwaveInput {
  return {
    wave_info,
    debug: false,
    prune_threshold: 1e-12,
    report_prune_threshold: 1e-12,
    is_naval,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'ipc_cost',
  };
}

test('negative defense counts: carried-over attackers leave before wave 2', () => {
  const wave1 = negWave({ inf: 6 }, { inf: 1 });
  const wave2 = (defenseUnits: Record<string, number>) =>
    negWave({ inf: 1 }, defenseUnits, { use_attackers_from_previous_wave: true });

  const without = multiwaveExternal(negInput([wave1, wave2({})]));
  const withNeg = multiwaveExternal(negInput([wave1, wave2({ inf: -6 })]));

  // Wave 1 leaves ~5-6 attacking infantry which wave 2 turns into defenders.
  // Without the subtraction the lone wave-2 infantry almost never survives.
  expect(without.attack.survives[1]).toBeLessThan(0.5);
  // All carried infantry leave, so the wave-2 territory is left undefended.
  expect(withNeg.attack.survives[1]).toBeCloseTo(1, 12);
});

test('negative defense counts: carried-over defenders leave before wave 2', () => {
  const wave1 = negWave({ inf: 1 }, { inf: 6 });

  const without = multiwaveExternal(negInput([wave1, negWave({ inf: 1 }, {})]));
  const withNeg = multiwaveExternal(negInput([wave1, negWave({ inf: 1 }, { inf: -6 })]));

  expect(without.attack.survives[1]).toBeLessThan(0.5);
  expect(withNeg.attack.survives[1]).toBeCloseTo(1, 12);
});

test('negative defense counts: partial counts weaken, oversized counts clamp', () => {
  const wave1 = negWave({ inf: 1 }, { inf: 3 });
  const wave2 = (defenseUnits: Record<string, number>) => negWave({ inf: 4 }, defenseUnits);

  const none = multiwaveExternal(negInput([wave1, wave2({})]));
  const one = multiwaveExternal(negInput([wave1, wave2({ inf: -1 })]));
  const two = multiwaveExternal(negInput([wave1, wave2({ inf: -2 })]));
  const huge = multiwaveExternal(negInput([wave1, wave2({ inf: -99 })]));

  // Every carried-over infantry removed makes the wave-2 defense weaker.
  expect(one.takesTerritory[1]).toBeGreaterThan(none.takesTerritory[1]);
  expect(two.takesTerritory[1]).toBeGreaterThan(one.takesTerritory[1]);
  // Two infantry are not enough to clear the carry-over...
  expect(two.takesTerritory[1]).toBeLessThan(1);
  // ...but a negative larger than the survivors leaves zero (no throw).
  expect(huge.takesTerritory[1]).toBeCloseTo(1, 12);
});

test('negative defense counts are ignored on wave 1', () => {
  const plain = negInput([negWave({ inf: 3 }, { inf: 2 }), negWave({ inf: 1 }, {})]);
  // Wave 1 has no carry-over, so the negative artillery count has no effect.
  const negated = negInput([negWave({ inf: 3 }, { inf: 2, art: -1 }), negWave({ inf: 1 }, {})]);

  expect(multiwaveExternal(negated)).toEqual(multiwaveExternal(plain));
});

test('getInternalInput splits negative defense counts into negative_defender', () => {
  const input = negInput([
    negWave({ inf: 3 }, { inf: 2 }),
    negWave({ inf: 1 }, { inf: -2, art: -1 }),
    negWave({ inf: 1 }, { inf: 0 }),
    negWave({ inf: 1 }, { dbat: -1 }),
  ]);

  const internal = getInternalInput(input);
  // Positive counts still build the wave's defender; negatives are split out.
  expect(internal.wave_info[0].defender).toBe('ii');
  expect(internal.wave_info[0].negative_defender).toBe('');
  expect(internal.wave_info[1].defender).toBe('');
  expect(internal.wave_info[1].negative_defender).toBe('iia');
  expect(internal.wave_info[2].negative_defender).toBe('');
  expect(internal.wave_info[3].negative_defender).toBe('F');
});

test('negative defense counts work for naval multiwave', () => {
  const seaOol: UnitIdentifier[] = ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat', 'tra'];
  const seaWave = (
    attackUnits: Record<string, number>,
    defenseUnits: Record<string, number>,
    extra: Partial<WaveInput> = {},
  ): WaveInput => ({
    attack: { units: attackUnits, ool: seaOol, takes: 0, aaLast: false },
    defense: { units: defenseUnits, ool: seaOol, takes: 0, aaLast: false },
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: false,
    rounds: 100,
    retreat_threshold: 0,
    ...extra,
  });

  // Previous-wave defenders carry over: a surviving cruiser leaves.
  const wave1 = seaWave({ des: 1 }, { cru: 2 });
  const without = multiwaveExternal({
    ...negInput([wave1, seaWave({ des: 5 }, {})], true),
    multiwave_enforce_naval_fighters_carriers: true,
  });
  const cruiserLeaves = multiwaveExternal({
    ...negInput([wave1, seaWave({ des: 5 }, { cru: -1 })], true),
    multiwave_enforce_naval_fighters_carriers: true,
  });
  expect(cruiserLeaves.defense.survives[1]).toBeLessThan(without.defense.survives[1]);

  // Previous-wave attackers carry over (swap): surviving destroyers leave.
  const swapWave1 = seaWave({ des: 2 }, { cru: 1 });
  const swapWave2 = (defenseUnits: Record<string, number>) =>
    seaWave({ des: 1 }, defenseUnits, { use_attackers_from_previous_wave: true });
  const swapWithout = multiwaveExternal({
    ...negInput([swapWave1, swapWave2({})], true),
    multiwave_enforce_naval_fighters_carriers: true,
  });
  const destroyersLeave = multiwaveExternal({
    ...negInput([swapWave1, swapWave2({ des: -2 })], true),
    multiwave_enforce_naval_fighters_carriers: true,
  });
  expect(destroyersLeave.defense.survives[1]).toBeLessThan(swapWithout.defense.survives[1]);
});

test('negative defense counts work with ev_future_wave retreat maps', () => {
  const retreat = { retreat_expected_ipc_profit_threshold: -100 };
  const wave1 = negWave({ inf: 4 }, { inf: 3 }, retreat);

  // Building the future-EV maps seeds the next wave's defender graph from the
  // carried-over survivors, so a mismatch here would throw.
  const withNeg = multiwaveExternal({
    ...negInput([
      wave1,
      negWave({ inf: 2 }, { inf: -1 }, retreat),
      negWave({ inf: 2 }, { inf: -2 }),
    ]),
    ev_future_wave: true,
  });
  const without = multiwaveExternal({
    ...negInput([wave1, negWave({ inf: 2 }, {}, retreat), negWave({ inf: 2 }, {})]),
    ev_future_wave: true,
  });

  expect(withNeg.waves).toBe(3);
  expect(withNeg.takesTerritory[2]).toBeGreaterThan(without.takesTerritory[2]);
});

test('negative defense counts record subtracted units as retreaters', () => {
  const wave1 = negWave({ inf: 1 }, { inf: 6 });
  const wave2 = negWave({ inf: 1 }, { inf: -6 });
  const output = multiwaveExternal(negInput([wave1, wave2]));

  const defenseStates = Object.values(output.casualtiesInfoArr[1].defense);

  // Wave 1 always leaves 5-6 infantry, all of which leave before wave 2, so
  // every wave-2 defender state carries them in its retreater list: the mass
  // matches the wave-1 defenders that survived.
  const retreaterProb = defenseStates
    .filter((v) => v.retreaters.includes('Inf'))
    .reduce((sum, v) => sum + v.amount, 0);
  expect(retreaterProb).toBeGreaterThan(0.99);
  expect(retreaterProb).toBeCloseTo(output.defense.survives[0], 9);

  // The units that left neither fight nor count as wave-2 survivors.
  for (const v of defenseStates) {
    expect(v.survivors).toBe('');
  }
  expect(output.defense.survives[1]).toBe(0);
});
