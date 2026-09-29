---
'aacalc2': minor
---

Support negative counts in `WaveInput.defense.units` on wave 2+. A negative count names units that leave the battle before the wave: they are removed from the same-type survivors carried over from the previous wave (its defenders, or its attackers when `use_attackers_from_previous_wave` is set) and recorded as that wave's retreaters, so they neither fight nor count as survivors. Positive counts still form the wave's own defense reinforcements. Counts larger than the survivors present leave zero of that unit, and negative counts are inert on wave 1.
