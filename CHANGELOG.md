# aacalc2

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
