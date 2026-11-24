---
'aacalc2': minor
---

Add a `branchAndBound` army-recommendation solve type. It searches integer
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
