# Axis and Allies 1942 Online probability calculator engine

**Links:**
-- [Discord Server](https://discord.com/channels/606254910438375434/1497710431714803863)

This documents the implementation details how to trigger each enhancement in the engine.

Enhancement list:

### strafe analysis

### retreat conditions

### future-wave-aware EV retreat

```
MultiwaveInput.ev_future_wave  -- optional, default false.
  When enabled in a multiwave battle (2+ waves), the engine pre-computes
  the expected IPC outcome of all future waves for each possible survivor
  state of the current wave. This "future EV map" is then incorporated
  into the retreat decision for retreat_expected_ipc_profit_threshold.

  Without this flag, the EV retreat threshold only considers the expected
  IPC outcome of the current wave in isolation. With it enabled, preserving
  more survivors in the current wave may be preferred even at a lower
  immediate EV if it improves prospects in later waves.

  Algorithm:
  1. A backward pass (waves N-2 down to 0) builds a futureEVMap for each
     wave i. For every defender (or attacker, when
     use_attackers_from_previous_wave is set) survivor state in wave i,
     the map stores the EV of wave i+1 starting from that survivor
     composition.
  2. The map is computed using template general_problem instances seeded
     with all possible survivor compositions from the previous wave, so
     the node graph contains exact matches for the mapping.
  3. During compute_retreat_state, the future EV is added to terminal
     state values (both elimination and non-terminal retreat states).
     The retreat decision becomes:
       retreat if (fightEV + futureEV - retreatEV) < threshold
  4. AA losses are accounted for in the future EV computation via
     computeFutureWaveEV, which applies AA fire before evaluating the
     fight EV of the next wave.

  Frontend label: "Experimental: future-wave-aware EV retreat"
```

### ipc profit distribution

### army recommendation

### controlling complexity

### use attackers from previous wave (take and hold analysis)

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
  do_roundless_eval?: boolean; // enable roundless evaluation for improved runtime (on by default)
  territory_value?: number; // value of the territory being attacked, used for expected profit calculations.
  retreat_round_zero?: boolean; // if true, retreat is allowed in round 0, default is true.
}

export interface UnitGroup {
  units: Army; // defense.units may be negative from wave 2 on: those units leave the battle
  ool: UnitIdentifier[];
  takes: number;
  aaLast: boolean;
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

export type CasualtiesInfo = Record<Side, Record<string, CasualtyInfo>>;
export type CasualtiesInfoArr = Record< number, Record<Side, Record<string, CasualtyInfo>>>;

export interface MultiwaveOutput {
  attack: CalcInfo;
  defense: CalcInfo;
  casualtiesInfo: CasualtiesInfo;
  casualtiesInfoArr: CasualtiesInfoArr; // wave by wave casualties info
  profitDistribution: ProfitDistribution[]; // key is profit, data is probability
  takesTerritory: number[];
  rounds: number[];
  waves: number;
  complexity: number;
}:

export interface CalcInfo {
  survives: number[];
  ipcLoss: number[];           // legacy running total (does not account for role reversals)
  incrementalLoss: number[];   // per-wave values
  cumulativeIpcLoss: number[]; // running total (accounts for role reversals)
}
```

## Enhancements:

### strafe analysis

    	MultiwaveInput.is_deadzone	 -- optional, default false.
    		If the option is true, then the detailed attacker casualties add 
			an additional attacker IPC cost triggerd for surving attacking land units.   
			This cost is reflected in the detailed casualties, as well as the summary reports.
    	MultiwaveInput.territory_value -- optional.. default 0  (negative value is allowed)
    		If the option is defined, then the detailed casualties will add 
			an additional attacker IPC cost (or credit), triggered for surviving land units.  
			The cost is reflected in the detailed casualties as well as the summary reports.

			Negative value here is useful for modeling cost if take.   
				- e.g. unable to defend a territory so allied assets would be lost.
				- or if we choose to defend, we're giving up a highly profitable attack for 
					opponent.  We can use the expected profit for that attack here.
				- or we can't defend the capital

### retreat conditions

    	- These conditions are exclusive.
    		- WaveInput.rounds should be set to -1, 0, or 100  (all rounds)
    		- WaveInput.retreat_threshold should be 0
    	- WaveInput.retreat_expected_ipc_threshold     -- optional, default undefined.
    		When defined retreat if the EV going forward is <= threshold.
    	- WaveInput.retreat_pwin_threshold		-- optional, default undefined.
		  WaveInput.pwinMode = 'takes' | 'destroys'   default takes
    		When defined retreat if the probability of winning is <= threshold.
    		The value should be a number between 0 and 1.
    	- WaveInput.retreat_strafe_threshold		-- optional, default undefined.
    		When defined retreat if the probability of wiping out the defenders in the next 
        valid only with nosubs case.
			round > threshold.
    		The value should be between 0 and 1.
    	- WaveInput.retreat_lose_air_probability		-- optional, default 1.0
    		Retreat if the probability of losing air in the next round exceeds threshold.
        valid only with nosubs case.

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

    	You can search frontend/src/App.tsx to see how the distribution is massaged into the 
		output list and histogram.

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
  | 'fuzzyBinarySearch'
  | 'branchAndBound';

export interface ArmyRecommendInput extends MultiwaveInput {
  attDefType: AttDefType;
  optimizeMode: OptimizeMode;
  numRecommendations: number; // only with optimizeMode maxProfit.  >=1
  targetPercentage: number; // target percentage for attacker to win or defender to hold.
  pwinMode?: PwinMode;
  solveType?: SolveType;
  minArmy?: Army; // minimum counts to commit (branchAndBound and others)
  minScoreThreshold?: number; // branchAndBound only; 0 disables (default)
  maxGroundHP?: number; // branchAndBound only; cap on committed ground HP
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

    		The output is an array of recommendations.  For this feature currently only a 
			single recommendation is provided.  May be enhanced to report multiple.



    		max ipc profit optimization:
    		input.optimizeMode = 'maxProfit'
    		input.solveType = 'gridSearch'
    		input.numRecommendations = 3		// number of recommendations to return.
    		// only works for optimizing attacker army
			// done... added max IPC support for other solveTypes -- gridSearch and linearSearch

		target ipc profit optimization:
		input.optimizeMode = 'targetProfit'
		input.targetProfit = -20
		input.solveType = 'gridSearch' | 'linearSearch' | 'exhaust'
		input.attDefType = 'attacker' | 'defender'

		Returns the minimum-IPC-cost army whose expected attacker IPC profit
		meets the target.  Profit is the engine's
		defense.ipcLoss - attack.ipcLoss, so it includes captured territory
		value and the dead-zone counterattack charge.  A defender meets a
		target when profit <= targetProfit; an attacker meets it when
		profit >= targetProfit.  Example: a defender target of -20 means "the
		smallest defending army that holds the attacker to at most -20 IPC
		expected profit".

		The target-profit objective is not monotonic in army cost, especially
		with EV retreat (a larger army can cause an earlier retreat and a
		better attacker profit) and in a dead zone (a tiny defender can
		already impose the counterattack charge).  fuzzyBinarySearch is
		therefore rejected for this mode.  Small count spaces (up to 20,000
		sub-armies) are enumerated exactly with exhaust even when the caller
		requests gridSearch.  Larger pools use gridSearch/linearSearch plus a
		downward refinement that removes units while the target is still met.
		branchAndBound support is not implemented yet (planned as a follow-up).

		Unlike targetWinPercentage, target profit keeps the EV/pwin retreat
		thresholds active.  The empty army is excluded from candidates.  The
		recommendation reports the achieved profit and the optimized side's
		win probability; ArmyRecommendOutput.feasible is false when no
		evaluated army met the target and the closest fallback was returned.

    		branch and bound (solveType = 'branchAndBound'):

    		Subset search over integer unit counts.  Unlike exhaust and
    		fuzzyBinarySearch it does not materialize all sub-armies: it walks the
    		count space depth-first and only calls the exact evaluator on leaves
    		that survive the bounds.

    		- optimizeMode = 'targetWinPercentage': minimizes total IPC cost.  A
    		  partial army's cost is a lower bound on any extension, so once a
    		  feasible army of cost C is found, every partial army costing >= C is
    		  pruned.  This is the case where the strategy pays off most.  As in
    		  fuzzyBinarySearch, the EV profit and pwin retreat thresholds are
    		  ignored while evaluating candidates, so a cheap army cannot "win" by
    		  retreating.  If the target is unreachable, returns the evaluated army
    		  with the highest win percentage (lowest cost on ties); because no cost
    		  bound can prune in that case, this falls back to exhaustive
    		  enumeration, so keep targets reachable for large pools.
    		- Land target-win searches add a Lanchester score floor automatically.
    		  Unless minScoreThreshold is supplied, the floor is
    		  factor(targetPercentage) x the fixed opponent's score, where

    		    factor(t) = 1.6 * t                         for t <= 0.5
    		              = 0.8 + (t - 0.5) / 0.4 * 0.3    for 0.5 < t < 0.9
    		              = 1.1                           for t >= 0.9

    		  (0.8 at 50%, 0.95 at 70%, 1.1 at 90%).  The floor is capped at the
    		  full max army's score, so an unreachable target still evaluates a
    		  best-effort army instead of pruning the whole tree.  The floor is a
    		  model assumption, not a mathematical bound: it can prune the true
    		  optimum in unusual compositions.  Set minScoreThreshold: 0 to force an
    		  exact search.  Sea battles never auto-set it (first strike and air
    		  invulnerability make the score unreliable: 4 fighters vs 6 subs/3
    		  destroyers has an optimum score ratio of 0.36).  Measured land
    		  examples: at 90% the cheapest winning army scored 1.21-1.47x the
    		  opponent, so 1.1 leaves about a 9% margin; the floor cuts evaluations
    		  from 4,602 to 92 on the medium pool and from 5,522 to 223 on the
    		  60/60/60/20 pool.
    		- optimizeMode = 'maxProfit': returns the top numRecommendations armies
    		  by profit.  Profit is bounded by defenderTUV + max(0, territory_value);
    		  that ceiling is exact but weak, so without minScoreThreshold this is
    		  effectively exhaustive enumeration (like 'exhaust').  Intended for
    		  small pools or for callers that supply a score floor.
    		- minScoreThreshold: explicit Lanchester square-law floor in
    		  (effective pips x total HP) units.  Effective pips include artillery
    		  pairing for attackers and the 1.25x submarine bonus.  Subtrees whose
    		  maximum possible score is below the floor are pruned.  Supplying this
    		  value overrides (and disables) the automatic land floor; 0 means exact.
    		- maxGroundHP: optional cap on the total HP of committed ground units.
    		- minArmy: minimum counts per unit; candidates are always supersets.

    		Guidance compared with the existing solve types:

    		- For targetWinPercentage, fuzzyBinarySearch uses fewer exact
    		  evaluations and is slightly faster on small pools.  With the
    		  automatic floor, branchAndBound is comparable on small pools and often
    		  faster on medium/large pools because it avoids getSubArmies() and
    		  evaluates small armies; on the 60/60/60/20 pool it was about 20x
    		  faster in wall time (0.55s vs 6-12s) for the same 86 IPC army.  All
    		  compared land cases found the same army.  Use minScoreThreshold: 0
    		  when an exact answer or feasibility guarantee is required; otherwise
    		  the land floor is a heuristic that can miss the optimum.
    		- gridSearch does not strip the EV/pwin retreat thresholds.  With an EV
    		  retreat threshold set it can recommend a cheap army that survives by
    		  retreating, whereas fuzzyBinarySearch and branchAndBound ignore those
    		  thresholds for the win objective and recommend an army that actually
    		  wins.
    		- For maxProfit, gridSearch and linearSearch are much faster and matched
    		  branchAndBound's top-N in comparisons; branchAndBound top-N is
    		  exhaustive by default, so reserve it for small pools or exhaustive
    		  verification.


### use attackers from previous wave

```
WaveInput.use_attackers_from_previous_wave  -- optional, default false.
    When true, the surviving attackers from the previous wave defend in 
    the current wave instead of the surviving defenders. This
    is useful for modeling "capture and hold" scenarios where the
    attacking force need to defend against counter attack.

    Role reversal is cumulative: each wave where this flag is true toggles
    the attack/defense sides for the "All Waves Summary" totals.

    NOTE: When this flag is used, use `incrementalLoss` for per-wave
    IPC values and `cumulativeIpcLoss` for running totals. The
    library automatically accounts for role reversals in both arrays.
    The original `ipcLoss` array should not be used since it does not
    properly account for role reversals between waves.
```

### controlling complexity

The engine exposes a shared size estimate:

```
import { multiwaveComplexityFastV2, multiwaveTooComplex } from 'aacalc2';

const complexity = multiwaveComplexityFastV2(input);
// multiwaveTooComplex(input) is the same estimate with a fixed cutoff:
// returns true above 250_000.
```

The underlying algorithm is roughly O(N^4), so callers guard input size.  This
engine is currently used by two frontends, and they make that decision
independently:

- **aa1942calc.com** (external, maintained by popovitsj) is migrating to this
  engine for calculation.  `multiwaveTooComplex()` exists primarily for that
  integration: it lets his calculator fall back to Monte Carlo analysis above
  the cutoff (250_000 in `src/external.ts`).  Changing that cutoff affects
  aa1942calc.com.
- **`frontend/`** (the small React app in this repo, for local development) does
  not call `multiwaveTooComplex()`.  It calls `multiwaveComplexityFastV2()`
  directly with its own `MAX_COMPLEXITY` in `frontend/src/App.tsx` (currently
  4_000_000; it used to be 400_000).  It also has a separate
  `INSTANTANEOUS_EVALUATION_THRESHOLD` (currently 10_000) for auto-evaluating
  small inputs.

So the two thresholds are independent: 4M is the author's own dev-UI choice,
250K is the external calculator's Monte Carlo cutoff.  For exhaustive search,
callers may still want a much smaller limit.


### naval fighters/carrier landing capacity in multiwave (wave 2+)

```
MultiwaveInput.multiwave_enforce_naval_fighters_carriers  -- optional, default false.

In a naval multiwave battle (2+ waves), the defenders of wave 2+ are the
survivors of the previous wave plus that wave's reinforcements.  When this
option is enabled, air units on that defending side that exceed the aircraft
carrier landing capacity (2 fighters per carrier) are treated as retreaters:
they leave the battle instead of continuing to fight in the wave.

  * default false -- all surviving air continues to fight on wave 2+ (no
    carrier capacity check).  This matches the engine behavior after the
    fighter/carrier multiwave rollback.
  * true -- only applies to naval multiwave battles on wave 2+ (inert for
    land battles, SBR, and single-wave battles).  The capacity is computed
    from the carriers present among the combined survivors + reinforcements.
    If no carriers remain, all defending air is treated as retreating.

This option is distinct from the per-wave `is_crash_fighters` control, which
models air units being destroyed (crashed) during combat.
```

### negative reinforcements (wave 2+)

```
WaveInput.defense.units  -- negative counts are allowed from wave 2 on.
multiwave_input wave_info[i].negative_defender  -- optional internal string.
```

In a multiwave battle, the defenders of wave 2+ are the survivors carried over
from the previous wave plus that wave's reinforcements.  A negative count in
`defense.units` models a surviving unit leaving the battle before the wave: the
named units are subtracted from the carried-over pool instead of added to it.
The positive counts still form the wave's own defense reinforcements.
`make_unit_group_string` splits them: positives become `wave_input.defender`,
negatives become `wave_input.negative_defender`.

  * The subtraction applies to whichever side carries over -- by default the
    previous wave's surviving defenders, or its surviving attackers when
    `use_attackers_from_previous_wave` is set.  Both cases use the negative
    counts on `defense.units`.
  * Negative counts only affect the carry-over.  They never remove units from
    the wave's own `defense` reinforcements, so `{ inf: 1, art: -1 }` adds one
    infantry reinforcement and removes one carried-over artillery.
  * Because a unit type has a single count, one type cannot be both added as a
    reinforcement and removed from the carry-over in the same wave.
  * Survivors still on the battlefield are removed before retreated ones, so a
    unit that leaves is taken from the non-retreated survivors when possible.
  * Counts are clamped at what the state actually holds: naming more units of a
    type than survived leaves zero of that unit (no error).
  * The units that leave are recorded as that wave's retreaters on the
    `def_cas` (defend reinforcement) entry.  They therefore do not fight and do
    not count as survivors of the wave, and they appear as retreaters in the
    wave's casualty breakdown.
  * Charged nothing in IPC: a unit that leaves is not a casualty of the wave.
  * Negative counts on `attack.units` are ignored.  Negative counts are inert on
    wave 1, which has no carry-over pool.  In the frontend, the Defender unit
    inputs accept negative values from wave 2 on; wave 1 inputs (and every
    Attacker input) are clamped at zero.
  * Consequence for 3+ waves: the engine carries a wave's retreaters forward
    into the next wave ("retreated units fight in the next wave"), so a unit
    removed from wave i is available again in wave i+1.  Re-apply the negative
    count on each wave where the unit should stay out.

Example: wave 1 is defended by 4 infantry; wave 2 has no new defenders, but one
surviving infantry is pulled out to garrison another territory:

```
{
  attack: ..., defense: { units: { inf: 4 }, ool: [...], takes: 0, aaLast: false },
  ...
},
{
  attack: ..., defense: { units: { inf: -1 }, ool: [...], takes: 0, aaLast: false },
  ...
}
```

Wave 2's defenders are then wave 1's surviving infantry minus one.
