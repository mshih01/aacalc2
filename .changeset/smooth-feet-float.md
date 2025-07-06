---
'aacalc2': patch
---

bugfix -- rounds terminates incorrectly in round 2 due to probEnds[i] == probEnds[i-1] in the early iteration (no terminal states)
