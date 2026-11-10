import { test, expect } from 'vitest';
import {
  type Army,
  type MultiwaveInput,
  type UnitIdentifier,
  type WaveInput,
  multiwaveExternal,
  setNavalDecompositionEnabled,
} from './index.js';
import { multiEvalExternal } from './external.js';
import { general_problem, setBoundaryFactorizationTolerance, solve_general } from './solve.js';
import { unit_manager } from './unitgroup.js';

// Exact reference values for the decomposed path.  These were checked against
// the full joint solver with pruning disabled (agreement ~1e-12).
const OOL: UnitIdentifier[] = ['sub', 'des', 'cru', 'acc', 'fig', 'bom'];

function makeInput(
  att: Army,
  def: Army,
  extra: Partial<WaveInput> = {},
  top: Partial<MultiwaveInput> = {},
): MultiwaveInput {
  return {
    wave_info: [
      {
        attack: { units: att, ool: OOL, takes: 0, aaLast: false },
        defense: { units: def, ool: OOL, takes: 0, aaLast: false },
        att_submerge: false,
        def_submerge: false,
        att_dest_last: false,
        def_dest_last: false,
        is_crash_fighters: false,
        rounds: 100, // "all rounds"
        retreat_threshold: 0,
        ...extra,
      },
    ],
    debug: false,
    prune_threshold: 0, // exact: isolate the decomposition math from pruning
    report_prune_threshold: 0,
    is_naval: true,
    in_progress: false,
    num_runs: 1,
    verbose_level: 0,
    diceMode: 'standard',
    sortMode: 'unit_count',
    retreat_round_zero: true,
    ...top,
  };
}

function flatten(
  value: unknown,
  prefix = '',
  out: Map<string, number> = new Map(),
): Map<string, number> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix + k + '.', out);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, prefix + i + '.', out));
  } else if (typeof value === 'number') {
    out.set(prefix, value);
  }
  return out;
}

function expectClose(actual: unknown, expected: unknown, tol: number, label: string): void {
  const a = flatten(actual);
  const b = flatten(expected);
  for (const [key, av] of a) {
    expect(b.has(key), `${label}: missing ${key}`).toBe(true);
    const bv = b.get(key)!;
    expect(Math.abs(av - bv), `${label}: ${key} ${av} vs ${bv}`).toBeLessThan(tol);
  }
  for (const key of b.keys()) {
    expect(a.has(key), `${label}: extra ${key}`).toBe(true);
  }
}

test('decomposed naval result matches the joint solver', () => {
  const pairs: [Army, Army][] = [
    [
      { sub: 5, fig: 5 },
      { sub: 5, fig: 5 },
    ],
    [
      { sub: 5, fig: 5 },
      { sub: 3, fig: 2 },
    ],
    [
      { sub: 2, fig: 3 },
      { sub: 4, fig: 1 },
    ],
    [
      { sub: 8, fig: 3 },
      { sub: 3, fig: 8 },
    ],
    [
      { sub: 2, fig: 2 },
      { sub: 2, fig: 2 },
    ],
    [
      { sub: 6, fig: 2 },
      { sub: 1, fig: 6 },
    ],
  ];
  for (const [att, def] of pairs) {
    const input = makeInput(att, def);
    const on = multiwaveExternal({ ...input, decomposeNaval: true });
    const off = multiwaveExternal({ ...input, decomposeNaval: false });
    const label = `${JSON.stringify(att)} vs ${JSON.stringify(def)}`;
    expectClose(on, off, 1e-9, label);
    // the decomposition must preserve the expected rounds, not zero them out
    expect(on.rounds[0]).toBeGreaterThan(0);
    expect(on.rounds[0]).toBeCloseTo(off.rounds[0], 8);
  }
});

test('decomposed naval also works for explicit rounds = -1', () => {
  const att = { sub: 5, fig: 5 };
  const def = { sub: 3, fig: 2 };
  // rounds=-1 used to take the split path but throw the round bookkeeping away
  // (average_rounds = 0).  Compare against the joint solver on the normal
  // roundless path instead.
  const minus1 = makeInput(att, def, { rounds: -1 });
  const on = multiwaveExternal({ ...minus1, decomposeNaval: true });
  const reference = multiwaveExternal({
    ...makeInput(att, def, { rounds: 0 }),
    decomposeNaval: false,
  });
  expectClose(on, reference, 1e-9, 'rounds=-1');
  expect(on.rounds[0]).toBeGreaterThan(0);
  expect(on.rounds[0]).toBeCloseTo(reference.rounds[0], 8);
});

test('rounds = -1 keeps rounds even with a destroyer', () => {
  // rounds < 0 already used the old nonaval split, which lost the rounds.  The
  // mid-battle bookkeeping now preserves them.
  const att = { sub: 5, fig: 5, des: 1 };
  const def = { sub: 5, fig: 5, des: 1 };
  const on = multiwaveExternal({
    ...makeInput(att, def, { rounds: -1 }),
    decomposeNaval: true,
  });
  const reference = multiwaveExternal({
    ...makeInput(att, def, { rounds: 0 }),
    decomposeNaval: false,
  });
  expectClose(on, reference, 1e-9, 'rounds=-1 destroyer');
  expect(on.rounds[0]).toBeGreaterThan(0);
  expect(on.rounds[0]).toBeCloseTo(reference.rounds[0], 8);
});

test('ineligible battles take the existing path unchanged', () => {
  const cases: [string, Army, Army, Partial<WaveInput>, Partial<MultiwaveInput>][] = [
    [
      'destroyer present (air can hit subs)',
      { sub: 5, fig: 5 },
      { sub: 5, fig: 5, des: 2 },
      {},
      {},
    ],
    ['retreat threshold', { sub: 5, fig: 5 }, { sub: 5, fig: 5 }, { retreat_threshold: 2 }, {}],
    ['round cap', { sub: 5, fig: 5 }, { sub: 5, fig: 5 }, { rounds: 1 }, {}],
    ['submerge', { sub: 5, fig: 5 }, { sub: 5, fig: 5 }, { att_submerge: true }, {}],
    [
      'rounds requested without roundless eval',
      { sub: 5, fig: 5 },
      { sub: 5, fig: 5 },
      { rounds: 100 },
      { do_roundless_eval: false },
    ],
    ['no air on attacker', { sub: 5 }, { sub: 5, fig: 5 }, {}, {}],
    ['no subs on defender', { sub: 5, fig: 5 }, { fig: 5 }, {}, {}],
    ['subs vs planes standoff', { sub: 5 }, { fig: 5 }, {}, {}],
  ];
  for (const [label, att, def, waveExtra, topExtra] of cases) {
    const input = makeInput(att, def, waveExtra, topExtra);
    const on = multiwaveExternal({ ...input, decomposeNaval: true });
    const off = multiwaveExternal({ ...input, decomposeNaval: false });
    expectClose(on, off, 1e-12, label);
  }
});

test('multiwave with a defender distribution falls back', () => {
  // wave 1 carries survivors into wave 2, so wave 2 has a def_cas distribution
  // and must use the joint solver.
  const wave = (att: Army, def: Army, extra: Partial<WaveInput> = {}): WaveInput => ({
    attack: { units: att, ool: OOL, takes: 0, aaLast: false },
    defense: { units: def, ool: OOL, takes: 0, aaLast: false },
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: false,
    rounds: 100,
    retreat_threshold: 0,
    ...extra,
  });
  const input: MultiwaveInput = {
    ...makeInput({ sub: 3, fig: 3 }, { sub: 2, fig: 2, des: 1 }),
    wave_info: [
      wave({ sub: 3, fig: 3 }, { sub: 2, fig: 2, des: 1 }),
      wave({ sub: 1, fig: 1 }, { sub: 1, fig: 1 }),
    ],
  };
  const on = multiwaveExternal({ ...input, decomposeNaval: true });
  const off = multiwaveExternal({ ...input, decomposeNaval: false });
  expect(on.waves).toBe(2);
  expectClose(on, off, 1e-9, 'multiwave def_cas');
});

test('no-destroyer surface battles decompose the sub/air tail', () => {
  // A cruiser/carrier does not let aircraft hit subs, so once the last ship
  // dies the remaining sub vs. sub + air vs. air battle is the expensive tail.
  const pairs: [Army, Army][] = [
    [
      { sub: 5, fig: 5, cru: 1 },
      { sub: 5, fig: 5, cru: 1 },
    ],
    [
      { sub: 10, fig: 10, cru: 1 },
      { sub: 10, fig: 10, cru: 1 },
    ],
    [
      { sub: 6, fig: 6, acc: 1 },
      { sub: 6, fig: 6, acc: 1 },
    ],
  ];
  for (const [att, def] of pairs) {
    const input = makeInput(att, def);
    const on = multiwaveExternal({ ...input, decomposeNaval: true });
    const off = multiwaveExternal({ ...input, decomposeNaval: false });
    const label = `midbattle ${JSON.stringify(att)} vs ${JSON.stringify(def)}`;
    expectClose(on, off, 1e-9, label);
    expect(on.rounds[0]).toBeGreaterThan(0);
  }
});

test('destroyer battles stay on the joint solver', () => {
  // Destroyers let aircraft hit subs, which shortens the tail; the mid-battle
  // path is deliberately not used, so on/off must be identical.
  const pairs: [Army, Army][] = [
    [
      { sub: 10, fig: 10, des: 2 },
      { sub: 10, fig: 10, des: 2 },
    ],
    [
      { sub: 8, fig: 8, des: 1, cru: 1 },
      { sub: 8, fig: 8, des: 1, cru: 1 },
    ],
  ];
  for (const [att, def] of pairs) {
    const input = makeInput(att, def);
    const on = multiwaveExternal({ ...input, decomposeNaval: true });
    const off = multiwaveExternal({ ...input, decomposeNaval: false });
    expectClose(on, off, 1e-12, `destroyer ${JSON.stringify(att)}`);
  }
});

test('mid-battle decomposition handles multiwave defender distributions', () => {
  // Wave 1 leaves a distribution of no-naval defenders for wave 2; the
  // mid-battle boundary path must handle that mixture exactly.
  const wave = (att: Army, def: Army): WaveInput => ({
    attack: { units: att, ool: OOL, takes: 0, aaLast: false },
    defense: { units: def, ool: OOL, takes: 0, aaLast: false },
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: false,
    rounds: 100,
    retreat_threshold: 0,
  });
  const input: MultiwaveInput = {
    ...makeInput({ sub: 3, fig: 3, cru: 1 }, { sub: 2, fig: 2, cru: 1 }),
    wave_info: [
      wave({ sub: 3, fig: 3, cru: 1 }, { sub: 2, fig: 2, cru: 1 }),
      wave({ sub: 1, fig: 1 }, { sub: 1, fig: 1 }),
    ],
  };
  const on = multiwaveExternal({ ...input, decomposeNaval: true });
  const off = multiwaveExternal({ ...input, decomposeNaval: false });
  expect(on.waves).toBe(2);
  expectClose(on, off, 1e-9, 'multiwave midbattle def_cas');
  expect(on.rounds[1]).toBeGreaterThan(0);
});

test('factorized boundary fast path matches the joint distribution', () => {
  // A low-sub case does not factorize tightly enough for the default cutoff, so
  // force the fast path with a loose tolerance and compare against the joint
  // nonaval solve.  This is chiefly coverage: it exercises the component-marginal
  // path, which is otherwise only reachable at very large unit counts.
  const att = { sub: 20, fig: 20, cru: 1 };
  // must have pruning enabled: the fast path is disabled for exact runs
  const input = makeInput(
    att,
    att,
    {},
    {
      prune_threshold: 1e-12,
      report_prune_threshold: 1e-12,
    },
  );
  try {
    setBoundaryFactorizationTolerance(3e-2);
    const fast = multiwaveExternal({ ...input, decomposeNaval: true });
    setBoundaryFactorizationTolerance(0);
    const joint = multiwaveExternal({ ...input, decomposeNaval: true });
    // rounds are independent of the distribution path
    expect(fast.rounds[0]).toBeCloseTo(joint.rounds[0], 8);
    // the 1.9e-2 boundary error times the IPC scale (~250) bounds the difference
    expect(Math.abs(fast.attack.ipcLoss[0] - joint.attack.ipcLoss[0])).toBeLessThan(10);
    expect(Math.abs(fast.defense.ipcLoss[0] - joint.defense.ipcLoss[0])).toBeLessThan(10);
  } finally {
    setBoundaryFactorizationTolerance(1e-6);
  }
}, 60000);

test('mid-battle decomposition actually triggers and keeps rounds', () => {
  const um = new unit_manager(0);
  const makeProblem = (decompose: boolean) =>
    new general_problem({
      verbose_level: 0,
      um,
      att_str: 'SSSSSfffffC',
      def_str: 'SSSSSfffffC',
      prob: 1.0,
      att_dest_last: false,
      att_submerge: false,
      def_dest_last: false,
      def_submerge: false,
      rounds: 0,
      retreat_threshold: 0,
      is_crash_fighters: false,
      is_naval: true,
      do_roundless_eval: true,
      retreat_lose_air_probability: 1.0,
      decompose_naval: decompose,
    });
  const on = makeProblem(true);
  solve_general(on);
  expect(on.midbattle).toBeDefined();
  expect(on.boundary_rounds).toBeGreaterThan(0);
  expect(on.average_rounds).toBeGreaterThan(0);

  const off = makeProblem(false);
  solve_general(off);
  expect(off.midbattle).toBeUndefined();
  expect(on.average_rounds).toBeCloseTo(off.average_rounds, 8);
});

test('EV and pwin retreat paths are not decomposed', () => {
  const att = { sub: 5, fig: 5 };
  const def = { sub: 5, fig: 5 };
  const cases: [string, Partial<WaveInput>][] = [
    ['EV retreat', { retreat_expected_ipc_profit_threshold: 0 }],
    ['pwin retreat', { retreat_pwin_threshold: 0.5 }],
  ];
  for (const [label, extra] of cases) {
    const input = makeInput(att, def, extra);
    const on = multiwaveExternal({ ...input, decomposeNaval: true });
    const off = multiwaveExternal({ ...input, decomposeNaval: false });
    expectClose(on, off, 1e-12, label);
  }

  // Structural: any retreat threshold makes the problem ineligible.
  const um = new unit_manager(0);
  const makeProblem = (extra: object) =>
    new general_problem({
      verbose_level: 0,
      um,
      att_str: 'SSSSSfffff',
      def_str: 'SSSSSfffff',
      prob: 1.0,
      att_dest_last: false,
      att_submerge: false,
      def_dest_last: false,
      def_submerge: false,
      rounds: 0,
      retreat_threshold: 0,
      is_crash_fighters: false,
      is_naval: true,
      do_roundless_eval: true,
      retreat_lose_air_probability: 1.0,
      ...extra,
    });
  expect(makeProblem({}).use_decomposition).toBe(true);
  expect(makeProblem({ retreat_expected_ipc_profit_threshold: 0 }).use_decomposition).toBe(false);
  expect(makeProblem({ retreat_pwin_threshold: 0.5 }).use_decomposition).toBe(false);
});

test('multieval pwin is unchanged by the decomposition flag', () => {
  const input = makeInput(
    { sub: 5, fig: 5 },
    { sub: 5, fig: 5 },
    { retreat_pwin_threshold: 0.5, pwinMode: 'destroys' },
  );
  const multiEvalInput = {
    ...input,
    attackerList: [],
    defenderList: [
      { sub: 3, fig: 3 },
      { sub: 2, fig: 4 },
    ],
  };
  const on = multiEvalExternal({ ...multiEvalInput, decomposeNaval: true });
  const off = multiEvalExternal({ ...multiEvalInput, decomposeNaval: false });
  expect(on).toEqual(off);
});

test('global switch disables the decomposition', () => {
  const input = makeInput({ sub: 4, fig: 4 }, { sub: 4, fig: 4 });
  try {
    setNavalDecompositionEnabled(false);
    const globalOff = multiwaveExternal({ ...input, decomposeNaval: true });
    const explicitOff = multiwaveExternal({ ...input, decomposeNaval: false });
    expectClose(globalOff, explicitOff, 1e-12, 'global switch');
  } finally {
    setNavalDecompositionEnabled(true);
  }
});

test('30 subs + 30 fighters scales and keeps rounds', () => {
  const input = makeInput(
    { sub: 30, fig: 30 },
    { sub: 30, fig: 30 },
    {},
    { prune_threshold: 1e-12, report_prune_threshold: 1e-12 },
  );
  const out = multiwaveExternal({ ...input, decomposeNaval: true });
  // exact roundless value: 4.301259532...
  expect(out.rounds[0]).toBeCloseTo(4.301259532, 5);
  expect(out.attack.ipcLoss[0]).toBeGreaterThan(0);
  expect(out.defense.ipcLoss[0]).toBeGreaterThan(0);
});
