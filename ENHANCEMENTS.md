# Axis and Allies 1942 Online probability calculator engine

**Links:**
-- [Discord Server](https://discord.com/channels/606254910438375434/1497710431714803863)

This documents the implementation details how to trigger each enhancement in the engine.

Enhancement list:

### strafe analysis

### retreat conditions

### ipc profit distribution

### army recommendation

### controlling complexity

## Input interface:

```
export interface MultiwaveInput {
  wave_info: WaveInput[];
  debug: boolean;
  prune_threshold: number;
  report_prune_threshold: number;
  is_naval: boolean;
  in_progress: boolean;
  num_runs: number;
  verbose_level: number;
  diceMode: DiceMode;
  sortMode?: SortMode;
  is_deadzone?: boolean; // target is a deadzone.  if the territory is taken -- the land units capturing
  // are considered to be destroyed in the counter attack in 1 round with 1
  // defensive roll to kill an infantry.
  // e.g. inf ==> additional IPC cost 2
  // e.g. art ==> additional IPC cost 3
  // e.g. arm ==> additional IPC cost 4.5
  report_complexity_only?: boolean; // if true, only report complexity and no other results.
  do_roundless_eval?: boolean; // enable roundless evaluation for improved runtime (on by default)
  territory_value?: number; // value of the territory being attacked, used for expected profit calculations.
  retreat_round_zero?: boolean; // if true, retreat is allowed in round 0, default is true.
}

export interface WaveInput {
  attack: UnitGroup;
  defense: UnitGroup;
  att_submerge: boolean;
  def_submerge: boolean;
  att_dest_last: boolean;
  def_dest_last: boolean;
  is_crash_fighters: boolean;
  rounds: number; // 100 means all rounds.
  retreat_threshold: number; // retreat if number of units remaining <= threshold
  retreat_expected_ipc_profit_threshold?: number; // retreat if expected ipc profit is less than this value.
  retreat_pwin_threshold?: number; // retreat if probability of winning is less than threshold
  pwinMode?: PwinMode; // mode for calculating pwin, default is 'takes'   takes | destroys
  retreat_strafe_threshold?: number; // retreat if the probability of wiping out defenders exceeds threshold.
  // incompatible with is_naval
  retreat_lose_air_probability?: number; // retreat if the probability of losing air exceeds threshold.  default is 1.0
  // incompatible with is_naval
  use_attackers_from_previous_wave?: boolean; // by default, the surviving defenders from the previous wave fight in the current wave.
  // when this option is true -- the surviving attackers from the previous wave fight in the current wave instead.  this is for simulating capture and hold.
}
```

## Output interface

```
export interface ProfitInfo {
  ipc: number;
  prob: number;
}
export type ProfitDistribution = Record<number, ProfitInfo>; // key: ipc value: probability

export interface MultiwaveOutput {
  attack: CalcInfo;
  defense: CalcInfo;
  casualtiesInfo: CasualtiesInfo;
  profitDistribution: ProfitDistribution[]; // key is profit, data is probability
  takesTerritory: number[];
  rounds: number[];
  waves: number;
  complexity: number;
}:
```

## Enhancements:

### strafe analysis

    	MultiwaveInput.is_deadzone	 -- optional, default false.
    		If the option is true, then the detailed attacker casualties add an additional attacker IPC cost triggerd for surving attacking land units.   This cost is reflected in the detailed casualties, as well as the summary reports.
    	MultiwaveInput.territory_value -- optional.. default 0
    		If the option is defined, then the detailed casualties will add an additional attacker IPC cost (or credit), triggered for surviving land units.  The cost is reflected in the detailed casualties as well as the summary reports.

### retreat conditions

    	- These conditions are exclusive.
    		- WaveInput.rounds should be set to -1, 0, or 100  (all rounds)
    		- WaveInput.retreat_threshold should be 0
    	- WaveInput.retreat_expected_ipc_threshold     -- optional, default undefined.
    		When defined retreat if the EV going forward is <= threshold.
    	- WaveInput.retreat_pwin_threshold		-- optional, default undefined.
    		When defined retreat if the probability of winning is <= threshold.
    		The value should be a number between 0 and 1.
    	- WaveInput.retreat_strafe_threshold		-- optional, default undefined.
    		When defined retreat if the probability of wiping out the defenders in the next round > threshold.
    		The value should be between 0 and 1.
    	- WaveInput.retreat_lose_air_probability		-- optional, default 1.0
    		Retreat if the probability of losing air in the next round exceeds threshold.

### ipc profit distribution

```
		MultiwaveOutput {
			...
		    profitDistribution: ProfitDistribution[]; // key is profit, data is probability
			...
		}
		export interface ProfitInfo {
		  ipc: number;
		  prob: number;
		}
		export type ProfitDistribution = Record<number, ProfitInfo>; // key: ipc value: probability
```

    	You can search frontend/src/App.tsx to see how the distribution is massaged into the output list and histogram.

### army recommendation

    	input:

```
// maxProfit only works with SolveTyep exhaust
export type OptimizeMode = 'targetWinPercentage' | 'maxProfit';
export type PwinMode = 'takes' | 'destroys';
export function armyRecommend(input: ArmyRecommendInput): ArmyRecommendOutput {
export type SolveType =
  | 'multiEval'
  | 'exhaust'
  | 'linearSearch'
  | 'gridSearch'
  | 'fuzzyBinarySearch';

export interface ArmyRecommendInput extends MultiwaveInput {
  attDefType: AttDefType;
  optimizeMode: OptimizeMode;
  numRecommendations: number; // only with optimizeMode maxProfit.  >=1
  targetPercentage: number; // target percentage for attacker to win or defender to hold.
  pwinMode?: PwinMode;
  solveType?: SolveType;
}
```

    	output:

```
export interface Recommendation {
  army: Army;
  cost: number; // either ipc_cost -- or the ipc profit.
}
export interface ArmyRecommendOutput {
  recommendations: Recommendation[];
}
```

    	function:

```
export function armyRecommend(input: ArmyRecommendInput): ArmyRecommendOutput
```

    	Feature:
    		target percentage based optimization:

    		input.optimizeMode =  'targetWinPercentage'
    		input.targetPercentage = 0.9 (value between 0 and 1)
    		input.pwinMode =  'takes' | 'destroys'
    		input.solveType = 'fuzzyBinarySearch'
    		input.attDefType = 'attacker' | 'defender'

    		This returns the minimum ipc cost army that achieves the target percentage.

    		The output is an array of recommendations.  For this feature currently only a single recommendation is provided.  May be enhanced to report multiple.



    		max ipc profit optimization:
    		input.optimizeMode = 'maxProfit'
    		input.solveType = 'exhaust'
    		input.numRecommendations = 3		// number of recommendations to return.
    		// only works for optimizing attacker army
    		// todo... input complexity needs to be controlled for this one, since it is doing exhaustive search.,

### controlling complexity

    	The underlying algorithm is O(N^4)... so we need to guard input size.

    	const complexity = multiwaveComplexityFastV2(multiwaveInput)

    	complexity 120000 might be a good value to for switching to monte carlo for runtime.  From my previous experiments -- calculation matches simulation aroud there.

    	I'm using 200000 currently as a hard limit, since I don't have monte carlo.

    	for the exhaustive search -- a smaller limit is needed.  Without testing, maybe something like 1000
