# aacalc2

## 2.3.1

### Patch Changes

- 603bf89: fix bug in target ipc profit optimization

## 2.3.0

### Minor Changes

- 45193aa: Add a `branchAndBound` army-recommendation solve type. It searches integer
  unit counts depth-first without materializing `getSubArmies()`, and calls the
  exact evaluator only on leaves that survive its bounds.

  - `optimizeMode: 'targetWinPercentage'` minimizes total IPC cost. Partial cost
    is a lower bound on any extension, so partial armies at least as expensive as
    the best feasible army are pruned. Land searches also use a target-dependent
    Lanchester floor of `factor(target) x opponent score`, where factor is 1.6*t
    up to 0.5 (0.8 at 50%), 0.8 + (t-0.5)/0.4*0.3 from 0.5 to 0.9 (1.1 at 90%),
    and 1.1 above. Sea battles use no automatic floor. On the large benchmark
    (60 inf / 60 art / 60 arm / 20 fig vs 15 inf / 4 art / 1 arm / 2 aa, dead
    zone, target 0.9) the floor cuts about 5.5k evaluations to about 223 while
    finding the same 86 IPC army; pass `minScoreThreshold: 0` for the exact
    search.
  - `optimizeMode: 'maxProfit'` returns the top `numRecommendations` armies by
    profit using an exact ceiling of defender TUV + max(0, territory value). That
    ceiling is weak, so unless a score floor is supplied this mode is effectively
    exhaustive.
  - New optional inputs: `minScoreThreshold` (explicit Lanchester score floor;
    set 0 to disable the automatic land floor and search exactly) and
    `maxGroundHP` (cap on committed ground HP). Existing solve types and their
    defaults are unchanged.

  This is an opt-in alternative, not a faster default. `fuzzyBinarySearch`
  usually needs fewer exact evaluations and is slightly faster on small pools;
  with the automatic land floor, `branchAndBound` is comparable on small pools and
  often faster on medium/large pools because it avoids `getSubArmies()`. For
  max-profit, `gridSearch`/`linearSearch` remain the faster choice. The new mode
  is for pools too large for `getSubArmies()`, exactness (with
  `minScoreThreshold: 0`), feasibility guarantees, and land target searches.

- 31ef096: Add a `targetProfit` army-recommendation objective: find the minimum-TUV army
  whose expected attacker IPC profit meets a target. For a defender the
  constraint is `profit <= targetProfit`; for an attacker it is
  `profit >= targetProfit`.

  - Profit is the engine's `defense.ipcLoss - attack.ipcLoss`, so it includes
    captured territory value and the dead-zone counterattack charge. EV retreat
    thresholds remain active; unlike `targetWinPercentage`, this mode does not
    strip them.
  - Supported by `gridSearch`, `linearSearch`, and `exhaust`. `fuzzyBinarySearch`
    and `branchAndBound` are rejected for this mode because target-profit
    feasibility is not monotonic in army cost (especially with EV retreat), so
    the cost-ordered search does not apply.
  - `Recommendation` gains optional `profit` and `winPct` fields for this mode,
    and `ArmyRecommendOutput` gains optional `feasible` (false when no evaluated
    army met the target and the closest fallback was returned).
  - `targetPercentage` and `numRecommendations` are now optional inputs; existing
    modes and their results are unchanged.

### Patch Changes

- c5fa09c: Faster and more accurate naval battles: solve a no-naval subs + aircraft battle
  as two independent battles (subs vs. subs and aircraft vs. aircraft), and combine
  them with exact expected-round bookkeeping. A battle that starts with surface
  ships also decomposes once the last ship is gone. This avoids the joint solver's
  compounding pruning error (at 30v30, default prune 1e-12: ~1e-6 IPC error vs
  ~1e-2 for the old path). A checked factorized-boundary shortcut keeps 100 subs +
  100 fighters + 1 cruiser at ~80 s instead of ~6.5 min. The new path is on by
  default and can be disabled with `decomposeNaval: false`.

  EV and pwin retreat computations, and `multieval`'s pwin path, are unchanged:
  they carry a retreat threshold, so the decomposition stays off for them.

- 37468fc: add experimental branch and bound army optimization

## 2.2.4

### Patch Changes

- acdd1af: runtime -- EV and pwin compute can use the same improvement.
- 84f2087: bound the hit-count distributions in every state transition sweep -- probability, expected-value retreat and pwin retreat -- to the interval carrying all but the early prune threshold of their mass, instead of enumerating the full support. The sweeps after the first now cost roughly half as much: a large land battle with retreat EV drops from 754ms to 580ms, one with pwin retreat from 471ms to 318ms, and plain 200 inf/art vs 200 inf/art from 4.3s to 1.2s. The discarded tail stays below the accuracy prune_threshold already implies: reported output and retreat decisions were bit-identical across the battles tested.
- 1be3002: increase threshold for monte carlo fallback from 120K to 250K

## 2.2.3

### Patch Changes

- 96200d3: improved pruning

## 2.2.2

### Patch Changes

- 11fbf47: improve runtime improved pruning.
- bound the hit-count distributions in the probability sweep to the interval carrying all but the early prune threshold of their mass, instead of enumerating the full support. 2-4x faster on large land battles (200 inf/art vs 200 inf/art: 4.3s -> 1.2s). The retreat EV and pwin sweeps are deliberately left unpruned because their transition weights feed a threshold comparison, where a negligible mass change can flip a decision; those results are unchanged. Probability results move by at most the discarded tail mass, which is below the accuracy already implied by prune_threshold.

## 2.2.1

### Patch Changes

- 1c1f779: improve complexity computation -- when no subs on both sides -- simple complexity should be used

## 2.2.0

### Minor Changes

- f20bd80: Support negative counts in `WaveInput.defense.units` on wave 2+. A negative count names units that leave the battle before the wave: they are removed from the same-type survivors carried over from the previous wave (its defenders, or its attackers when `use_attackers_from_previous_wave` is set) and recorded as that wave's retreaters, so they neither fight nor count as survivors. Positive counts still form the wave's own defense reinforcements. Counts larger than the survivors present leave zero of that unit, and negative counts are inert on wave 1.

### Patch Changes

- a5a226f: support negative reinforcements

## 2.1.0

### Minor Changes

- 67cc336: Add optional `multiwave_enforce_naval_fighters_carriers` input option (default false). When enabled on naval multiwave battles, air units on the wave-2+ defending side that exceed aircraft-carrier landing capacity (2 fighters per carrier) are treated as retreaters instead of continuing to fight.

### Patch Changes

- 5d89b2b: add interface to control multiwave fighter/carrier

## 2.0.26

### Patch Changes

- 638595f: rollback fighter/carrier multiwave defender

## 2.0.25

### Patch Changes

- c5ebe02: future wave ev consider aa guns

## 2.0.24

### Patch Changes

- a023e4f: multiwave ev retreat consider future waves

## 2.0.23

### Patch Changes

- 7ddaaad: multiwave naval battles retreat defending air without landing carrier spot.

## 2.0.22

### Patch Changes

- ed9d0e2: ev retreat consider crash_fighters impact

## 2.0.21

### Patch Changes

- 427b719: add wave by wave override for is_deadzone/territory_value for ev retreat calculation only

## 2.0.20

### Patch Changes

- df5789e: is_crash_fighters disabled for non-naval

## 2.0.19

### Patch Changes

- 5315950: multiwave cumulative casualties correctly handle multiple swaps.

## 2.0.18

### Patch Changes

- fa3a2e3: EV retreat consider amphibious retreat

## 2.0.17

### Patch Changes

- cb2be88: bug in amphibious retreat

## 2.0.16

### Patch Changes

- 3b830c4: army recommendation -- use gridSearch for maxProfit optimization (instead of exhaust).

## 2.0.15

### Patch Changes

- a076afe: runtime improvement + multiwave wave by wave profit distribution show incremental profit (experimental advanced option)

## 2.0.14

### Patch Changes

- 087d0d1: use attackers from previous wave

## 2.0.13

### Patch Changes

- 290edfc: multiwaveTooComplex reenable multiwave analysis

## 2.0.12

### Patch Changes

- dd68d5e: fix attacker detailed casualties for multiwave

## 2.0.11

### Patch Changes

- 39899e9: per wave casualties

## 2.0.10

### Patch Changes

- 9363183: multiwaveTooComplex return true for multiwave

## 2.0.9

### Patch Changes

- 0bdb0e1: wave by wave casualties

## 2.0.8

### Patch Changes

- d53a3af: per wave detailed casualties (initial)

## 2.0.7

### Patch Changes

- ea94cf8: multiwave detailed casualties developement

## 2.0.6

### Patch Changes

- 7899e53: add multiwaveTooComplex

## 2.0.5

### Patch Changes

- 9a49bf5: add multiwaveTooComplex

## 2.0.4

### Patch Changes

- 3f54d49: army recommendation cleanup console logging.

## 2.0.3

### Patch Changes

- 264d352: debug

## 2.0.2

### Patch Changes

- 125dcc6: debug

## 2.0.1

### Patch Changes

- a4e2c01: bug fix

## 2.0.0

### Major Changes

- 48b95bb: add frontend

## 1.0.34

### Patch Changes

- fba5d10: add armyRecommend -- recommend sub-army to achieve target percentage win.

## 1.0.33

### Patch Changes

- 3946d1c: add profitDistribution to the output

## 1.0.32

### Patch Changes

- feaf540: bugfix zero round

## 1.0.31

### Patch Changes

- 95ab305: fix bug with zero round retreat. need to compute and check retreat conditions prior to aaguns

## 1.0.30

### Patch Changes

- 8663f42: retreat_lose_air_probability + retreat_zero_round

## 1.0.29

### Patch Changes

- 335743a: add retreat_lose_air_probability

## 1.0.28

### Patch Changes

- eda2baf: branch cleanup -- remove regresion files from dist

## 1.0.27

### Patch Changes

- b3638fe: implemented retreat based on probability of winning.

## 1.0.26

### Patch Changes

- 40701cc: fix multiwave detailed casualties bug (previous waves details not reported)

## 1.0.25

### Patch Changes

- db725b4: multiwaveComplexityFastV2 tuning

## 1.0.24

### Patch Changes

- 5d1b911: bugs in complexity

## 1.0.23

### Patch Changes

- 672cfa2: improve multiwaveComplexityFastV2 for naval battles

## 1.0.22

### Patch Changes

- ceca73a: but in multiwaveComplexity -- changes input

## 1.0.21

### Patch Changes

- a620d2c: add multiwaveComplexityFastV2

## 1.0.20

### Patch Changes

- 2cc71c4: multiwaveComplexityFast

## 1.0.19

### Patch Changes

- d94b0d7: multiwaveComplexity

## 1.0.18

### Patch Changes

- 18e0d48: runtime

## 1.0.17

### Patch Changes

- ac9ada9: cleanup

## 1.0.16

### Patch Changes

- b366f08: roundless eval runtime

## 1.0.15

### Patch Changes

- d0bb727: cleanup

## 1.0.14

### Patch Changes

- cc837a1: roundless eval compute average rounds.

## 1.0.13

### Patch Changes

- f8b94a2: bugfix -- rounds terminates incorrectly in round 2 due to probEnds[i] == probEnds[i-1] in the early iteration (no terminal states)

## 1.0.12

### Patch Changes

- 4299c41: add debug for is_retreat_state

## 1.0.11

### Patch Changes

- 544c339: add territory_value

## 1.0.10

### Patch Changes

- 6faaeae: support is_deadzone constraint -- handled in both IPC cost, verbose cost sorting, and EV computation

## 1.0.9

### Patch Changes

- 436e8ae: sortMode

## 1.0.8

### Patch Changes

- 4df9759: sortMode

## 1.0.7

### Patch Changes

- cdb9164: add sortMode... by default -- sort by unit_count first -- then IPC as tiebreak. Optionally -- sort by IPC

## 1.0.6

### Patch Changes

- e579173: add retreat_strafe_threshold?

## 1.0.5

### Patch Changes

- 4128c5d: cleanup

## 1.0.4

### Patch Changes

- d881f73: consider the effect of retreat in EV computation

## 1.0.3

### Patch Changes

- f84699d: add retreat_expected_ipc_profit_threshold

## 1.0.2

### Patch Changes

- f43fe69: remove readline dependency

## 1.0.1

### Patch Changes

- ac3a801: initial release
