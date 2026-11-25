---
'aacalc2': minor
---

Add a `targetProfit` army-recommendation objective: find the minimum-TUV army
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
