---
'aacalc2': patch
---

bound the hit-count distributions in every state transition sweep -- probability, expected-value retreat and pwin retreat -- to the interval carrying all but the early prune threshold of their mass, instead of enumerating the full support. The sweeps after the first now cost roughly half as much: a large land battle with retreat EV drops from 754ms to 580ms, one with pwin retreat from 471ms to 318ms, and plain 200 inf/art vs 200 inf/art from 4.3s to 1.2s. The discarded tail stays below the accuracy prune_threshold already implies: reported output and retreat decisions were bit-identical across the battles tested.
