# Decomposing subs-vs-subs from air-vs-air, and keeping expected rounds

## TL;DR

When a naval battle has subs and aircraft but **no destroyers and no surface
ships**, the subs and the aircraft cannot hit each other. The battle is therefore
the product of two independent battles:

- `A` = attacker subs vs. defender subs
- `B` = attacker aircraft vs. defender aircraft

Both fire every round, so the battle's duration is `R = max(R_A, R_B)`. That gives
an exact, cheap way to bookkeep rounds:

```
S_A(t) = P(component A is still unresolved after t rounds)
S_B(t) = P(component B is still unresolved after t rounds)

E[rounds] = sum_{t>=0} P(R > t)
          = sum_{t>=0} [ 1 - (1 - S_A(t)) * (1 - S_B(t)) ]
```

and the terminal distribution is the product of the two components' terminal
distributions.

The existing `nonavalproblem` code already computes the product terminal
distribution efficiently, but it destroys `ERound_1d` / `average_rounds`, and it
is gated on `rounds < 0` so the normal `rounds = 0` path never uses it. The
survival-profile formula above recovers rounds exactly and lets the optimization
be enabled on the normal path.

Validated against the full solver: terminal probabilities match to ~1e-16 and
`average_rounds` matches to ~1e-15 (no pruning) / ~1e-11 (with the engine's
pruning). 30 subs + 30 fighters vs. the same drops from 57.5 s to ~0.2 s (~290x
end-to-end through `multiwaveExternal`).

**Status:** Phase 1 (whole-battle decomposition) and the mid-battle entry
extension (§4.7) are implemented. Both are controlled by
`MultiwaveInput.decomposeNaval` (default `true`) and the module-level
`setNavalDecompositionEnabled()` escape hatch; see §4.5. The equivalence, guard
and scale tests live in `src/decompose_naval.test.ts`.

## 1. What exists today

`src/solve.ts` builds a second `general_problem` called `nonavalproblem`
(`src/solve.ts:347-412`) when **both** sides have subs and aircraft and neither
side submerges. It contains only the subs and aircraft of each side.

In `src/solveone.ts:330-384` there is an `enable_airsub_optimization` branch:

- when there are no naval units (`N3 == 0 && M3 == 0`), the state is not expanded;
  its probability is pushed into `nonavalproblem` at the key
  `(att_subs, att_air) x (def_subs, def_air)` via `setNoNavalP()`;
- after the main sweep, `solve_general()` (`src/solve.ts:1313-1361`) solves the
  `nonavalproblem` once per state and maps the terminal probabilities back to the
  parent through `attmap` / `defmap` keyed on `(num_subs, num_air)`.

Inside the `nonavalproblem`, there is no further `nonavalproblem`, so the same
branch falls through to the `else` at line 341, which applies **sub hits only**
while both sides still have subs, and then **air hits only** once one side's subs
are gone. Because the two components cannot hit each other, that sequential
application still yields the exact product terminal distribution — but it gives
up any round information. At the end, `src/solve.ts:1358-1360` explicitly does:

```ts
problem.E_1d = new Float64Array(0);
problem.ERound_1d = new Float64Array(0);
problem.R_1d = [];
```

## 2. Why it is disabled

Two independent reasons:

1. The branch requires `problem.rounds < 0` (`src/solveone.ts:332`).
   `multiwaveExternal()` converts the usual `rounds: 100` ("all rounds") to `0`
   when `do_roundless_eval` is on (`src/external.ts:431-434`). The normal
   roundless path is therefore `rounds = 0`, and the optimization never runs.
   When it does run (`rounds = -1`), `average_rounds` comes out as `0` because
   `ERound_1d` is thrown away. I reproduced both behaviours:

   ```
   10S10f vs 10S10f (multiwaveExternal)
   rounds = 100 :  565 ms, rounds = [4.4058...]
   rounds = 0   :  558 ms, rounds = [4.4058...]
   rounds = -1  :   40 ms, rounds = [0]        <-- fast but rounds lost
   ```

2. That is not fixable by simply keeping `ERound_1d` from the mixed solve: the
   sequential sub-then-air kernel is not a per-round kernel, so its
   `num_rounds` values do not correspond to combat rounds.

The rest of this document is the fix for (2), which then lets us remove the
`rounds < 0` gate for (1).

## 3. The math

### 3.1 Independence

With no destroyers and no surface ships:

- a sub hit can only remove a sub,
- a plane hit can only remove a plane.

This is visible in the graph: a sub hit on a fighters-only node is absorbed (the
node's `nsubArr` chain stays on the same node), and an air hit on a subs-only node
is absorbed. So the battle factors exactly into `A` (subs) and `B` (aircraft).

### 3.2 Terminal distribution

If the initial position is a point mass (a single starting composition), then

```
P_final(att_subs, def_subs, att_air, def_air)
    = D_A(att_subs, def_subs) * D_B(att_air, def_air)
```

where `D_A`, `D_B` are the terminal distributions of the two component battles.

### 3.3 Expected rounds

Each component is a Markov chain whose state is "units remaining on each side",
and one round is one simultaneous volley. Let

```
S_A(t) = P(component A unresolved after t rounds)   (1 for a non-terminal start)
S_B(t) = same for B
```

Both components advance every round, so the whole battle is unresolved after
`t` rounds iff at least one component is unresolved:

```
P(R > t) = 1 - P(R_A <= t) * P(R_B <= t)
         = 1 - (1 - S_A(t)) * (1 - S_B(t))
```

and, since `E[R] = sum_{t>=0} P(R > t)` for a non-negative integer variable,

```
E[R] = sum_{t>=0} [ 1 - (1 - S_A(t)) * (1 - S_B(t)) ]
```

`S_A(t)` is just the total probability mass sitting in non-terminal states after
`t` physical rounds. It tends to zero geometrically; in practice the sum needs
~50-70 terms for 30-vs-30.

This is exactly the quantity the current `do_roundless_eval()` reports via
`ERound_1d` — only now it is assembled from two small chains instead of one huge
product chain.

### 3.4 Validation

Drop-in prototype using the engine's own `general_problem` / `do_round_eval`:

| battle                   | full `average_rounds` | decomposed | diff  |
| ------------------------ | --------------------- | ---------- | ----- |
| 1S1f vs 1S1f             | 2.347959183673        | same       | 8e-16 |
| 5S5f vs 5S5f             | 4.153423836073        | same       | 4e-15 |
| 5S5f vs 3S2f             | 2.401966121227        | same       | 3e-15 |
| 8S5f vs 5S8f             | 2.492292322854        | same       | 5e-15 |
| 10S10f vs 10S10f         | 4.405830450332        | same       | 9e-16 |
| 10S10f vs 6S3f           | 2.375320770277        | same       | 7e-15 |
| 5S5f vs 5S (no def air)  | 4.093510872599        | same       | 4e-15 |
| 5S vs 5S (no air at all) | 4.093510872599        | same       | 4e-15 |
| 2S vs 2f (standoff)      | 0                     | 0          | exact |

The full `collect_results()` output (IPC loss, survivors, casualties, profit
distribution, rounds) also matches the full solver to ~1e-12 when both sides use
the same prune thresholds, with the residual coming from pruning.

## 4. Proposed implementation

### 4.1 Eligibility

Add a cheap predicate on `general_problem`:

```ts
can_decompose(): boolean {
  return this.is_naval && !this.is_nonaval
    && !this.is_retreat                 // excludes rounds 1..99 + all retreat modes
    && !this.is_crash_fighters
    && this.def_cas == undefined        // point-mass initial position (see §5)
    && !this.att_data.submerge_sub && !this.def_data.submerge_sub
    && this.att_data.nodeArr[0].num_naval == 0
    && this.def_data.nodeArr[0].num_naval == 0
    && this.rounds <= 0;                // unlimited / roundless path
}
```

`num_naval == 0` covers destroyers, carriers, transports, cruisers, battleships,
AA and bombard: anything that could couple subs and aircraft.

### 4.2 Component solves and round profiles

Build two ordinary problems (lazily, on first solve):

```ts
const sub = new general_problem({
  att_str: att_data.sub_group.unit_str,   // e.g. 'SSS'
  def_str: def_data.sub_group.unit_str,
  is_naval: true, is_nonaval: false, rounds: 0,
  // same um/diceMode/prune thresholds; no retreat; prob = 1
});
const air = new general_problem({
  att_str: att_data.air_group.unit_str,   // e.g. 'fff'
  def_str: def_data.air_group.unit_str,
  is_naval: true, is_nonaval: false, rounds: 0, ...
});
```

Use `rounds: 0` deliberately: the `rounds < 0` air/subs special branch throws
when a component is empty (`src/solveone.ts:380`), while the general branch
handles empty sides through the usual terminal early-return.

Then run a forward sweep, one physical round at a time:

```ts
function profile(p: general_problem, eps: number) {
  const N = p.att_data.nodeArr.length;
  const M = p.def_data.nodeArr.length;
  p.P_1d = new Float64Array(N * M);
  p.setP(0, 0, 1.0);
  const S = [isNonTerminal(p, 0, 0) ? 1 : 0];
  let t = 0;
  while (S[t] > eps && t < MAX_ROUNDS) {
    // allow_same_state = true --> this sweep is exactly one combat round
    do_round_eval(p, true, 0, false, false);
    t++;
    S.push(nonTerminalMass(p));
  }
  return { S, D: terminalDistribution(p) };
}
```

Key point: use `allow_same_state = true` (one real round per sweep), **not** the
`allow_same_state = false` self-loop resummation used by `do_roundless_eval`.
The resummation is what makes the current path round-unaware.

`eps` can be tied to the existing prune knobs, e.g.
`max(early_prune_threshold, 1e-14)`; `MAX_ROUNDS` can be a few thousand as a
guard for pathological dice modes.

### 4.3 Combining

The constructor already builds `attmap` / `defmap`; reuse that idea (or the
existing maps) to turn a component state into a parent node index:

```ts
P_parent[(ii, jj)] += problem.prob * D_A[a] * D_B[b];
```

Only component _terminal_ states need to be combined: `(2 * att_subs + 1) *
(2 * att_air + 1)` pairs for a symmetric 30-vs-30, i.e. a few thousand products,
not the 923k parent states. The parent `Float64Array` is still allocated because
the reporting pipeline indexes into it.

Then:

```ts
let E = 0;
for (let t = 0; t <= T; t++) {
  const sa = t < S_A.length ? S_A[t] : 0;
  const sb = t < S_B.length ? S_B[t] : 0;
  E += 1 - (1 - sa) * (1 - sb);
}
problem.average_rounds = E;
```

`average_rounds` is only meaningful when `do_roundless_eval` is on; if it is off,
still set `P_1d` but leave `average_rounds` alone (or set it to `-1` as today).

### 4.4 Integration

In `solve_general()` (`src/solve.ts:1060`), short-circuit before the retreat-state
computation, EV / Pwin passes, and the main sweep:

```ts
if (problem.can_decompose()) {
  solve_decomposed(problem); // sets P_1d, average_rounds
  return;
}
```

This is a strict improvement: the parent never expands the 923k-state chain.
(It still allocates `P_1d` because the reporting pipeline indexes it.) No changes
are required in `solveone*.ts`.

The old `nonavalproblem` block can then be retired or kept only for the
`def_cas` / rounds-not-requested fallback; it is not reachable for `rounds = 0`
today, so removing it is low risk.

### 4.5 Feature flag and rollout

The new path sits behind one boolean, with the old path left completely intact.
Three levels, in order of preference:

1. **Public per-call flag (recommended).** Add `decomposeNaval?: boolean` to
   `MultiwaveInput` (`src/external.ts:154`) and `decompose_naval: boolean` to
   `multiwave_input` (`src/multiwave.ts:22`), default `true`, plumbed exactly
   like `do_roundless_eval` / `experimentalConvolution`:

   ```ts
   // external.ts, getInternalInput()
   decompose_naval: input.decomposeNaval ?? true,

   // problem-factory.ts, createGeneralProblem()
   decompose_naval: input.decompose_naval,
   ```

   `can_decompose()` then becomes `this.decompose_naval && <predicate>`. Setting
   `decomposeNaval: false` restores today's behaviour bit-for-bit; setting it
   `true` on an ineligible battle is a no-op because the predicate still guards
   it.

2. **Library escape hatch (for tests / bisecting).** Keep a module-level

   ```ts
   export let enable_naval_decomposition = true;
   export function setNavalDecompositionEnabled(v: boolean) { ... }
   ```

   so a vitest can flip it without rebuilding inputs, or a downstream user can
   turn it off globally if they ever see an unexpected result.

3. **Optional frontend checkbox.** If you want user-visible A/B, add it to
   Advanced Options next to `experimentalConvolution`
   (`frontend/src/App.tsx:1019`). Not required: since the decomposition is
   mathematically exact, the normal default should be ON and most users never
   need the knob.

**What happens when it is off:** the constructor still builds and uses
`nonavalproblem` exactly as today, so the fallback is the current code, not a
reimplementation. The flag only gates the new short-circuit in `solve_general()`
and the eager component construction, so there is no risk of a half-enabled
state.

**Verification mode:** add `verify_naval_decomposition?: boolean` that, for small
battles, runs both paths and compares `P_1d` and `average_rounds`, logging or
throwing on a mismatch. Because both paths are exact, agreement should be at the
pruning level (~1e-12); anything larger is a bug. Use this in the equivalence
test matrix and during rollout, not on 30-vs-30 (running both there defeats the
speedup).

Recommended rollout: default ON, keep the flag for one or two releases, and use
the equivalence test with the flag on/off so a regression can be bisected to the
decomposition immediately. The flag is implemented as `decomposeNaval` in
`MultiwaveInput`, `decompose_naval` in the internal input, and is copied into
every `general_problem` by `createGeneralProblem`.

### 4.6 Complexity metric

Do **not** rebase the reported complexity on the component sizes. The new path
reduces runtime, but `P_1d` and the reporting pipeline still need the parent
joint state space:

```
(as+1)(af+1) x (ds+1)(df+1)      // O(n^4) entries
```

That is 923k entries (7.4 MB) at 30-vs-30 and 104M entries (832 MB) at
100-vs-100. `multiwaveComplexityFastV2()` is effectively a memory guard, so it
should keep its current shape; 30S30f already sits under the frontend's 4M
default (3.46M).

If reporting is later changed to work directly from the two component
distributions (no parent `P_1d`), the metric can be rebased on the component
state counts. Until then, the decomposition is a runtime win at the same memory
footprint, and the practical ceiling is set by the parent allocation
(~n = 60-80 in a browser).

### 4.7 Mid-battle entry (surface battle -> sub/air tail)

A battle that starts with surface ships can reach a state with no naval units on
either side. From that state the same independence holds. The old
`nonavalproblem` machinery already detected this (`setNoNavalP`), but it only ran
for `rounds < 0` and discarded the rounds. The implemented extension keeps the
old distribution path and adds round bookkeeping:

1. In `do_roundless_eval`, if the problem is mid-battle eligible
   (`nonavalproblem != undefined`, no destroyers, no retreat, `rounds <= 0`),
   build the two component problems and precompute survival for **every** start
   state with an adjoint DP:

   ```
   S_0(s)     = 1 if s is non-terminal else 0
   S_{t+1}(s) = sum_{s'} K(s -> s') * S_t(s')
   ```

   The cost is `O(T * states * transitions)` per component, the same order as one
   profile; it returns `S(t | start)` for all starts at once.

2. When `solve_one_general_state` reaches a no-naval state `e`, it hands
   `P(e)` to `nonavalproblem` as before, and adds

   ```
   P(e) * (expected rounds already spent reaching e + R(e))
   ```

   to `problem.boundary_rounds`, where

   ```
   R(e) = sum_t [1 - (1 - S_sub(t | e)) * (1 - S_air(t | e))]
   ```

   and `S_sub(t | e)`, `S_air(t | e)` are looked up from the entry state's
   surviving sub/air counts.

3. `do_roundless_eval` adds `boundary_rounds` to the final expected-round sum.
   The terminal distribution still comes from the old joint `nonavalproblem`
   solve, which handles the correlated entry mixture exactly.

Implementation: `can_midbattle_decompose()`, `prepare_midbattle()`,
`build_component_survival()` and `get_boundary_rounds()` in `solve.ts`; the
boundary hook is in `solveone.ts`.

**Gate:** on the normal `rounds = 0` path, mid-battle decomposition is only used
when neither side starts with a destroyer. A destroyer lets the enemy's aircraft
hit subs, which shortens the expensive sub tail; those battles already solve
quickly, and the survival precomputation would be a ~10-30% overhead on
small/medium ones. Surface ships without destroyers (cruisers, battleships,
carriers, transports) leave the full sub+air tail, which is exactly where this
pays off. At `rounds < 0` the old code already used the nonaval split (and lost
the rounds), so the boundary path is enabled there too — adding the round
bookkeeping is free relative to what that path already did.

Correctness: with pruning disabled, the mid-battle path agrees with the joint
solver to ~1e-13 on rounds and all reported values. With the default
`prune_threshold: 1e-12`, it is consistently closer to the unpruned answer than
the joint path.

**Factorized-boundary fast path.** At large sub counts the joint boundary
distribution solve dominates (386 s for 100S100f+1cru). If the handoff
distribution is numerically a product of a subs-vs-subs table and an
air-vs-air table,

```
P(sa, sd, pa, pd) ≈ P_sub(sa, sd) · P_air(pa, pd)
```

then the terminal mixture collapses to `D_sub^mix ⊗ D_air^mix`, so the code can
solve the two small component battles from the marginals and convolve them
instead of expanding the joint `nonavalproblem`. It checks the actual error
`err = Σ |P − P_sub·P_air|` first and only takes the shortcut when
`err <= 1e-6`; otherwise it uses the exact joint solve (and exact runs,
`prune_threshold <= 0`, always do).

Measured `err`: n=20 `1.9e-2`, n=40 `4.0e-4`, n=60 `8.6e-6`, n=100
`4.95e-7`. So 100 takes the shortcut; 60 and below do not. At n=100 the
shortcut changes rounds by `1.8e-11` and IPC loss by `3.7e-4` versus the joint
boundary solve, while cutting the run from 386 s to 79.5 s. Rounds are not
affected by the shortcut — they still come from the component survival
functions. The tolerance is available to tests as
`setBoundaryFactorizationTolerance()` in `solve.ts` (not exported from the
package entrypoint).

## 5. Multiwave / multi-state initial distributions

The whole-battle path (Phase 1) requires a point-mass start (`def_cas`
undefined), because it needs one product distribution. Later waves can have a
genuine distribution over defender compositions that need not factor into a subs
marginal times an air marginal.

The mid-battle boundary path (§4.7) handles that case exactly: the boundary is
processed per state, so the entry distribution can be an arbitrary correlated
mixture. The expected rounds become a state-by-state sum of
"arrival rounds + `R(e)`", and the terminal distribution comes from the old joint
`nonavalproblem` solve, which already handled arbitrary initial distributions.
This applies both to a wave that starts with surface ships and to a no-naval wave
whose starting distribution is multi-state.

### 5.1 EV and pwin computations

The decomposition is **not** used for EV or Pwin. Both are only enabled when a
retreat threshold is set (`retreat_expected_ipc_profit_threshold` or
`retreat_pwin_threshold`), and any retreat threshold makes `is_retreat` true,
which makes `can_decompose()` / `can_midbattle_decompose()` false. The
per-state sweeps (`compute_expected_value`, `compute_prob_wins`) still run over
the joint state space. The mid-battle flags (`midbattle_active`,
`boundary_rounds`) are only set inside `do_roundless_eval`, never during those
sweeps.

`multieval` (used by army recommendation) calls `compute_prob_wins()` directly.
It requires `retreat_pwin_threshold`, so those problems are ineligible too;
`multiEvalExternal` is bit-identical with `decomposeNaval` on and off.

Extending the decomposition to EV/Pwin is a separate change. For a no-retreat
naval battle, Pwin is `P(def_subs = 0) * P(def_air = 0)` and EV is the sum of the
component losses, both computable from the component solves; but the retreat
decision itself couples the components (total units, total EV, air loss), so it
has to be handled as a mixture over the boundary states rather than a single
product.

## 6. Edge cases and guards

| Case                                               | Handling                                                |
| -------------------------------------------------- | ------------------------------------------------------- |
| Destroyer present                                  | both paths skip (air can hit subs; the tail is short)   |
| Surface ship / carrier / transport, no destroyer   | mid-battle boundary handles the sub/air tail (§4.7)     |
| No naval at all, single start                      | whole-battle decomposition (§3)                         |
| No naval at all, multi-state start (`def_cas`)     | mid-battle boundary (§5)                                |
| Sub merge (`att_submerge`/`def_submerge`)          | not eligible                                            |
| Retreat threshold, EV/Pwin/strafe/lose-air retreat | not eligible (`is_retreat`)                             |
| Round cap (`rounds` 1..99)                         | not eligible (`is_retreat`)                             |
| `is_crash_fighters`                                | not eligible                                            |
| One component empty (e.g. no air)                  | whole-battle path requires both; otherwise joint solver |
| Subs vs. planes only (standoff)                    | both components terminal; `E = 0`, product of masses    |
| Pruning                                            | same thresholds on both components; residual ~1e-12     |
| Very low hit probabilities / biased dice           | `MAX_ROUNDS` guard; tail sum still converges            |

## 7. Tests

Implemented in `src/decompose_naval.test.ts` (14 tests):

1. **Whole-battle equivalence**: 6 sub/air count mixes, `decomposeNaval` on vs
   off, all reported numbers and `rounds` to 1e-9 with pruning disabled.
2. **Explicit `rounds = -1`** no longer loses rounds, including a destroyer
   battle where the old split used to run.
3. **Fallbacks**: destroyer, retreat threshold, round cap, submerge,
   non-roundless mode, degenerate components, subs-vs-planes standoff — on/off
   identical.
4. **Mid-battle equivalence**: no-destroyer surface battles (cruiser/carrier)
   match the joint solver; destroyer battles are unchanged; a direct problem test
   asserts `midbattle` is active and `boundary_rounds > 0`.
5. **Multiwave `def_cas`**: a two-wave no-destroyer battle matches the joint
   solver, including wave 2's multi-state starting distribution.
6. **Factorized-boundary fast path**: forced at 20 units with a loose
   tolerance, compared against the joint boundary solve (rounds exactly, IPC
   within the error bound).
7. **EV / pwin / multieval**: on/off identical, plus a structural assertion that
   any retreat threshold disables the decomposition.
8. **Global switch** and the 30S30f scale test (`rounds ≈ 4.3012595...`).
9. Existing snapshots are land battles or have surface ships, so
   `src/__snapshots__/main.test.ts.snap` does not move.

## 8. Performance

Measured on this machine, standard dice, `prune_threshold = 1e-12`
(`n` subs + `n` fighters per side):

| n   | current solver | decomposed (incl. reporting) |
| --- | -------------- | ---------------------------- |
| 10  | 0.57 s         | 0.06 s                       |
| 20  | 8.5 s          | 0.12 s                       |
| 25  | 22.8 s         | ~0.13 s                      |
| 30  | 57.5 s         | 0.13 s                       |
| 40  | infeasible     | 0.29 s                       |

Breakdown at n=30: parent graph construction 67 ms, sub profile 38 ms, air
profile 4 ms, product/mapping 15 ms, reporting 7 ms.

Runtime keeps scaling to n=60/80/100 (0.8 s / 1.4 s / 2.7 s in the prototype),
but the parent `P_1d` still grows as n^4, so memory — not the component solve —
is the practical ceiling.

Mid-battle entry (surface ship + subs/air, no destroyers), same settings:

| battle (n subs + n fighters + 1 cruiser) | joint solver | mid-battle |
| ---------------------------------------- | ------------ | ---------- |
| 10                                       | 0.49 s       | 0.27 s     |
| 15                                       | 3.04 s       | 0.31 s     |
| 20                                       | 10.5 s       | 0.51 s     |
| 30                                       | 67.3 s       | 2.5 s      |
| 100                                      | 386 s        | 79.5 s     |

The n=100 row uses the factorized-boundary fast path. Without it the mid-battle
path is ~393 s, i.e. the joint `nonaval` distribution solve dominates at that
size; the fast path replaces it with the two component solves.

The 30 case is ~27x faster and returns the same answer to pruning accuracy. With
a destroyer present the joint solve is already fast (30S30f+1des ≈ 1.8 s) and
mid-battle is gated off, so small/medium destroyer battles do not pay the
survival-precomputation overhead.

### Accuracy vs the joint baseline

The joint solver is not structurally wrong; it is pruning-limited. Its error
scales with the prune threshold and the size of the joint state space. Reference
values below are unpruned (prune 0), which the tests pin down to ~1e-13.

30S30f vs 30S30f, default `prune_threshold = 1e-12`:

| solver          | rounds       | attacker IPC loss |
| --------------- | ------------ | ----------------- |
| exact (prune 0) | 4.301259537  | 366.222179269     |
| decomposed      | 4.301259532  | 366.222177909     |
|                 | (err 5e-9)   | (err 1.4e-6)      |
| joint baseline  | 4.301088394  | 366.209547833     |
|                 | (err 1.7e-4) | (err 1.3e-2)      |

So at the same settings the decomposed path is ~10^4 more accurate on IPC loss
and ~10^5 on rounds. The baseline does converge as the threshold is tightened
(15S15f, IPC error: 1e-12 → 2.0e-4, 1e-13 → 2.1e-5, 1e-14 → 2.1e-6,
1e-15 → 2.0e-7), confirming this is pruning accumulation rather than a bug.

Two consequences:

- The decomposed path prunes only within small component hit distributions, not
  across the N^4 joint chain, so the error does not compound with battle size.
  At 20S20f the baseline is off by 1.2e-3 IPC; the decomposed path by 2.8e-7.
- The old `rounds = -1` nonaval split already had this accuracy advantage for the
  distribution (at 20S20f it was within 3e-9 IPC of exact, vs 1.2e-3 for the
  joint baseline); it simply discarded the rounds. The mid-battle path keeps that
  distribution solve and adds the rounds, so it is 2-7x closer to exact than the
  joint baseline at 10-15 units, but still less accurate than the whole-battle
  product path because the nonaval distribution solve is pruned.

## 9. Alternatives considered

- **Keep `ERound_1d` from the mixed-graph solve.** Doesn't work: the sequential
  sub-then-air kernel is not a per-round kernel, so its `num_rounds` values are
  not combat rounds. This is the "I don't know how to maintain expected rounds"
  problem.
- **Compute `E[max]` from component means only.** `E[max] != max(E_A, E_B)` and
  is not a function of the means; the full survival profiles are required.
- **Solve the product chain for rounds.** That is the current expensive path.
- **Phase-type / generating-function extrapolation of `S(t)`.** Could avoid the
  per-round sweep, but the direct sweep converges in ~60 rounds, so it is not
  worth the complexity.
- **Monte Carlo.** The current fallback; loses exactness and cannot report
  expected rounds precisely.
