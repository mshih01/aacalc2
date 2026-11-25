---
'aacalc2': patch
---

Fix `targetProfit` occasionally recommending a larger army than necessary.
Target-profit searches now enumerate the count space exactly for small pools
(up to 20,000 sub-armies) and, for larger grid/linear searches, walk unit counts
downward from the best feasible candidate to find a cheaper feasible army. A
50-inf defender against 5 inf / 5 art / 4 fighters / 1 bomber with a -20 IPC
target now returns the smallest feasible defender instead of a larger army that
the coarse grid found first.
