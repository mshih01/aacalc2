---
'aacalc2': patch
---

Faster and more accurate naval battles: solve a no-naval subs + aircraft battle
as two independent battles (subs vs. subs and aircraft vs. aircraft), and combine
them with exact expected-round bookkeeping. A battle that starts with surface
ships also decomposes once the last ship is gone. This avoids the joint solver's
compounding pruning error (at 30v30, default prune 1e-12: ~1e-6 IPC error vs
~1e-2 for the old path). A checked factorized-boundary shortcut keeps 100 subs +
100 fighters + 1 cruiser at ~80 s instead of ~6.5 min. The new path is on by
default and can be disabled with `decomposeNaval: false`.

EV and pwin retreat computations, and `multieval`'s pwin path, are unchanged:
they carry a retreat threshold, so the decomposition stays off for them.
