import { describe, expect, it } from 'vitest';
import type { BattleInput } from '../types.ts';
import {
  applyPatch,
  buildSweepPlan,
  describePatch,
  diffInput,
  factorAxes,
  findConflicts,
  groupToSource,
  type SweepAxis,
  type SweepLevel,
  type SweepSource,
} from './sweep.ts';

function makeInput(overrides: Partial<BattleInput> = {}): BattleInput {
  return {
    attack: { 0: { inf: 3 } },
    defense: { 0: { inf: 2 } },
    attackOol: { 0: ['inf', 'art'] },
    defenseOol: { 0: ['inf'] },
    rounds: { 0: 100 },
    retreatModes: { 0: 'unitCount' },
    diceMode: 'standard',
    mode: 'land',
    numWaves: 1,
    ...overrides,
  };
}

function makeLevel(label: string, patch: SweepLevel['patch']): SweepLevel {
  return { label, patch, changed: describePatch(patch) };
}

function makeAxis(label: string, levels: SweepLevel[]): SweepAxis {
  return { label, levels };
}

function makeSource(label: string, inputs: Array<[string, BattleInput]>): SweepSource {
  return {
    label,
    levels: inputs.map(([name, input]) => ({ name, input })),
  };
}

describe('diffInput', () => {
  it('ignores armies, mode, wave count and app-wide settings', () => {
    const base = makeInput();
    const next = makeInput({
      attack: { 0: { arm: 10 } },
      defense: { 0: { art: 4 } },
      mode: 'sea',
      numWaves: 3,
      verboseLevel: 5,
      pruneThreshold: 1e-6,
      reportPruneThreshold: 1e-6,
      sortMode: 'unit_count',
      experimentalConvolution: true,
      evFutureWave: true,
      retreatZeroRound: true,
    });

    expect(diffInput(base, next)).toEqual({});
  });

  it('diffs scalar fields', () => {
    const patch = diffInput(makeInput(), makeInput({ diceMode: 'lowluck' }));
    expect(patch).toEqual({ diceMode: { kind: 'scalar', value: 'lowluck' } });
  });

  it('only carries the changed wave indices of a record field', () => {
    const base = makeInput({ rounds: { 0: 100, 1: 2 }, numWaves: 2 });
    const next = makeInput({ rounds: { 0: 100, 1: 4 }, numWaves: 2 });

    const patch = diffInput(base, next);
    expect(patch.rounds).toEqual({ kind: 'record', values: { 1: 4 } });
  });

  it('diffs array values such as an OOL ordering', () => {
    const patch = diffInput(makeInput(), makeInput({ attackOol: { 0: ['art', 'inf'] } }));
    expect(patch.attackOol).toEqual({
      kind: 'record',
      values: { 0: ['art', 'inf'] },
    });
  });

  it('records a removed record value as undefined', () => {
    const patch = diffInput(makeInput(), makeInput({ retreatModes: undefined }));
    expect(patch.retreatModes).toEqual({ kind: 'record', values: { 0: undefined } });
  });

  it('does not emit a patch for deeply equal records', () => {
    const base = makeInput({ rounds: { 0: 3, 1: 4 }, numWaves: 2 });
    const next = makeInput({ rounds: { 0: 3, 1: 4 }, numWaves: 2 });
    expect(diffInput(base, next)).toEqual({});
  });
});

describe('applyPatch', () => {
  it('merges scalars and record values without mutating the base', () => {
    const base = makeInput({ rounds: { 0: 3, 1: 4 }, numWaves: 2 });
    const snapshot = structuredClone(base);
    const patch = diffInput(
      base,
      makeInput({
        rounds: { 0: 3, 1: 5 },
        numWaves: 2,
        diceMode: 'biased',
      }),
    );

    const merged = applyPatch(base, patch);
    expect(merged.rounds).toEqual({ 0: 3, 1: 5 });
    expect(merged.diceMode).toBe('biased');
    expect(base).toEqual(snapshot);
  });

  it('leaves unrelated waves alone', () => {
    const base = makeInput({ rounds: { 0: 3, 1: 4 }, numWaves: 2 });
    const merged = applyPatch(
      base,
      diffInput(base, makeInput({ rounds: { 0: 1, 1: 4 }, numWaves: 2 })),
    );
    expect(merged.rounds).toEqual({ 0: 1, 1: 4 });
  });
});

describe('describePatch', () => {
  it('uses one-based wave labels and sorts fields', () => {
    const patch = diffInput(
      makeInput({ rounds: { 0: 100, 1: 2 }, numWaves: 2 }),
      makeInput({
        rounds: { 0: 1, 1: 3 },
        attackOol: { 0: ['art', 'inf'] },
        diceMode: 'lowluck',
        numWaves: 2,
      }),
    );

    expect(describePatch(patch)).toEqual(['attackOol[1]', 'diceMode', 'rounds[1,2]']);
  });
});

describe('findConflicts', () => {
  it('flags a scalar both axes set to different values', () => {
    const axes = [
      makeAxis('A', [makeLevel('a', { diceMode: { kind: 'scalar', value: 'lowluck' } })]),
      makeAxis('B', [makeLevel('b', { diceMode: { kind: 'scalar', value: 'biased' } })]),
    ];

    expect(findConflicts(axes)).toEqual([
      {
        axisA: 'A',
        axisB: 'B',
        field: 'diceMode',
        waves: [],
        valueA: 'lowluck',
        valueB: 'biased',
      },
    ]);
  });

  it('does not flag equal scalar values', () => {
    const axes = [
      makeAxis('A', [makeLevel('a', { diceMode: { kind: 'scalar', value: 'lowluck' } })]),
      makeAxis('B', [makeLevel('b', { diceMode: { kind: 'scalar', value: 'lowluck' } })]),
    ];

    expect(findConflicts(axes)).toEqual([]);
  });

  it('does not flag different wave indices of the same record field', () => {
    const axes = [
      makeAxis('A', [makeLevel('a', { rounds: { kind: 'record', values: { 0: 1 } } })]),
      makeAxis('B', [makeLevel('b', { rounds: { kind: 'record', values: { 1: 2 } } })]),
    ];

    expect(findConflicts(axes)).toEqual([]);
  });

  it('flags a shared wave with different values', () => {
    const axes = [
      makeAxis('A', [makeLevel('a', { rounds: { kind: 'record', values: { 0: 1, 1: 2 } } })]),
      makeAxis('B', [makeLevel('b', { rounds: { kind: 'record', values: { 0: 3 } } })]),
    ];

    expect(findConflicts(axes)).toEqual([
      {
        axisA: 'A',
        axisB: 'B',
        field: 'rounds',
        waves: [0],
        valueA: '1',
        valueB: '3',
      },
    ]);
  });
});

describe('buildSweepPlan', () => {
  const base = makeInput();

  const oolSource = makeSource('OOL', [
    ['inf first', makeInput()],
    ['art first', makeInput({ attackOol: { 0: ['art', 'inf'] } })],
  ]);
  const retreatSource = makeSource('Retreat', [
    ['no retreat', makeInput()],
    [
      'EV retreat',
      makeInput({
        retreatModes: { 0: 'expectedIpcProfit' },
        retreatExpectedIpcProfitThresholds: { 0: 5 },
      }),
    ],
  ]);

  it('expands the cartesian product and merges each patch onto the base', () => {
    const plan = buildSweepPlan(base, [oolSource, retreatSource]);

    expect(plan.errors).toEqual([]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.combinations).toBe(4);
    expect(plan.cases.map((sweepCase) => sweepCase.label)).toEqual([
      'inf first × no retreat',
      'inf first × EV retreat',
      'art first × no retreat',
      'art first × EV retreat',
    ]);
    expect(plan.cases[3].factors).toEqual({
      OOL: 'art first',
      Retreat: 'EV retreat',
    });
    expect(plan.cases[3].input.attackOol).toEqual({ 0: ['art', 'inf'] });
    expect(plan.cases[3].input.retreatModes).toEqual({ 0: 'expectedIpcProfit' });
    expect(plan.cases[3].input.rounds).toEqual({ 0: 100 });
    expect(plan.runnable).toBe(true);
  });

  it('keeps the base armies even when a saved level has different armies', () => {
    const source = makeSource('Big', [['big army', makeInput({ attack: { 0: { arm: 99 } } })]]);
    const plan = buildSweepPlan(base, [source, retreatSource]);
    expect(plan.cases[0].input.attack).toEqual(base.attack);
  });

  it('skips levels saved for another mode or wave count', () => {
    const source = makeSource('Mixed', [
      ['wrong mode', makeInput({ mode: 'sea' })],
      ['wrong waves', makeInput({ numWaves: 2 })],
    ]);
    const plan = buildSweepPlan(base, [source, retreatSource]);

    expect(plan.errors).toEqual([
      {
        axis: 'Mixed',
        level: 'wrong mode',
        message: 'saved mode "sea" ≠ current mode "land"',
      },
      {
        axis: 'Mixed',
        level: 'wrong waves',
        message: 'saved wave count 2 ≠ current 1',
      },
      {
        axis: 'Mixed',
        level: '',
        message: 'No usable saved entries in this group',
      },
    ]);
    expect(plan.runnable).toBe(false);
  });

  it('rejects duplicate level names and duplicate axis labels', () => {
    const duplicateLevels = makeSource('Dup', [
      ['same', makeInput({ diceMode: 'lowluck' })],
      ['same', makeInput({ diceMode: 'biased' })],
    ]);
    const plan = buildSweepPlan(base, [duplicateLevels, retreatSource]);
    expect(plan.errors).toContainEqual({
      axis: 'Dup',
      level: 'same',
      message: 'Duplicate level name in this group',
    });

    const duplicateAxes = buildSweepPlan(base, [oolSource, oolSource]);
    expect(duplicateAxes.errors).toContainEqual({
      axis: 'OOL',
      level: '',
      message: 'Pick two different groups for the sweep axes',
    });
  });

  it('refuses to expand above the combination cap', () => {
    const levels = Array.from({ length: 30 }, (_, idx): [string, BattleInput] => [
      `level ${idx}`,
      makeInput({ diceMode: idx % 2 === 0 ? 'standard' : 'lowluck' }),
    ]);
    const plan = buildSweepPlan(base, [makeSource('A', levels), makeSource('B', levels)]);

    expect(plan.combinations).toBe(900);
    expect(plan.tooMany).toBe(true);
    expect(plan.cases).toEqual([]);
    expect(plan.runnable).toBe(false);
  });

  it('does not run a sweep with colliding fields', () => {
    const first = makeSource('First', [['one round', makeInput({ rounds: { 0: 1 } })]]);
    const second = makeSource('Second', [['three rounds', makeInput({ rounds: { 0: 3 } })]]);
    const plan = buildSweepPlan(base, [first, second]);

    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].field).toBe('rounds');
    expect(plan.runnable).toBe(false);
  });
});

describe('factorAxes', () => {
  it('derives axis labels and level order from evaluated rows', () => {
    const axes = factorAxes([
      { group: 'g', name: 'a × 1', status: 'ok', factors: { OOL: 'a', Retreat: '1' } },
      { group: 'g', name: 'a × 2', status: 'ok', factors: { OOL: 'a', Retreat: '2' } },
      { group: 'g', name: 'b × 1', status: 'ok', factors: { OOL: 'b', Retreat: '1' } },
      { group: 'g', name: 'b × 2', status: 'ok', factors: { OOL: 'b', Retreat: '2' } },
    ]);

    expect(axes).toEqual([
      { label: 'OOL', levels: ['a', 'b'] },
      { label: 'Retreat', levels: ['1', '2'] },
    ]);
  });
});

describe('groupToSource', () => {
  it('uses the group name as the axis label and entry names as levels', () => {
    const source = groupToSource('Source', [
      { group: 'Source', name: 'a', timestamp: 0, input: makeInput() },
    ]);
    expect(source).toEqual({
      label: 'Source',
      levels: [{ name: 'a', input: makeInput() }],
    });
  });
});
