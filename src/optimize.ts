// army recommendation engine.   compute the low cost sub-army that meets the target win percentage.

import {
  type MultiwaveInput,
  type MultiEvalOutput,
  type Army,
  getSubArmies,
  type MultiEvalInput,
  multiEvalExternal,
  multiwaveExternal,
  getArmyCost,
  getUnitStatsMap,
  type UnitIdentifier,
  getIntegersInRange,
  getCombinations,
} from './external.js';
import {
  optimizeSubArmy as optimizeSubArmyBranchAndBound,
  lanchesterScore,
  type BnbUnitSpec,
} from './branchandbound.js';

import { type PwinMode } from './solve.js';

export type AttDefType = 'attacker' | 'defender';

export type SolveType =
  'multiEval' | 'exhaust' | 'linearSearch' | 'gridSearch' | 'fuzzyBinarySearch' | 'branchAndBound';

// maxProfit is attacker-focused.  targetProfit keeps the EV retreat thresholds
// and supports gridSearch/linearSearch/exhaust; fuzzyBinarySearch and
// branchAndBound are rejected for it.
export type OptimizeMode = 'targetWinPercentage' | 'maxProfit' | 'targetProfit';

export interface ArmyRecommendInput extends MultiwaveInput {
  attDefType: AttDefType;
  optimizeMode: OptimizeMode;
  numRecommendations?: number; // only with optimizeMode maxProfit.  >=1
  targetPercentage?: number; // target percentage for attacker to win or defender to hold.
  // Target expected attacker IPC profit.  The engine profit is
  // defense.ipcLoss - attack.ipcLoss and includes captured territory value and
  // the dead-zone counterattack charge.  When optimizing the defender, a
  // candidate is feasible when profit <= targetProfit; when optimizing the
  // attacker, when profit >= targetProfit.
  targetProfit?: number;
  pwinMode?: PwinMode;
  solveType?: SolveType;
  beamWidth?: number; // number of beams for gridSearch beam search (default 3)
  granularity?: number; // grid divisions per dim for gridSearch (default 3)
  minArmy?: Army; // minimum army to use (defaults to all zeros)
  // branchAndBound only: explicit Lanchester score floor in (effective pips x
  // total HP) units. Effective pips include artillery pairing for attackers and
  // the 1.25x submarine bonus. If omitted, land target-win searches use
  // scoreFloorFactor(targetPercentage) x the fixed opponent's score (0.8 at 50%
  // up to 1.1 at 90%); sea battles and maxProfit use no floor. Pass 0 to force
  // an exact search.
  minScoreThreshold?: number;
  // branchAndBound only: optional cap on the total HP of committed ground units.
  maxGroundHP?: number;
}

export interface Recommendation {
  army: Army;
  cost: number; // either ipc_cost -- or the ipc profit.
  // targetProfit only: the achieved expected attacker IPC profit and the
  // optimized side's win probability, so callers can show both alongside the
  // minimum army cost.
  profit?: number;
  winPct?: number;
}
export interface ArmyRecommendOutput {
  recommendations: Recommendation[];
  // targetProfit only: false when no evaluated army met the target and the
  // closest fallback is returned.  Undefined for the other optimize modes.
  feasible?: boolean;
}

function initArmy(army: Army, value: number): Army {
  let result = { ...army };

  for (const [uid, count] of Object.entries(result)) {
    result[<UnitIdentifier>uid] = value;
  }
  return result;
}

// Profit is the attacker's expected IPC swing.  A defender meets a target when
// the attacker's profit is at or below it; an attacker meets a target when its
// profit is at or above it.
function targetProfitFeasible(
  attDefType: AttDefType,
  profit: number,
  targetProfit: number,
): boolean {
  return attDefType == 'defender' ? profit <= targetProfit : profit >= targetProfit;
}

export function armyRecommend(input: ArmyRecommendInput): ArmyRecommendOutput {
  const solveType = input.solveType;
  const attDefType = input.attDefType;
  const pwinMode = input.pwinMode ?? 'destroys';
  const optimizeMode = input.optimizeMode;
  const numRecommendations = input.numRecommendations ?? 1;

  if (optimizeMode == 'maxProfit' && solveType == 'fuzzyBinarySearch') {
    console.error('maxProfit optimizeMode does not work with fuzzyBinarySearch solveType');
    return { recommendations: [{ army: {}, cost: 0 }] };
  }
  if (
    optimizeMode == 'targetProfit' &&
    (solveType == 'fuzzyBinarySearch' || solveType == 'branchAndBound' || solveType == 'multiEval')
  ) {
    console.error(
      'targetProfit optimizeMode does not work with ' +
        solveType +
        ' solveType; use gridSearch, linearSearch, or exhaust',
    );
    return { recommendations: [], feasible: false };
  }
  if (optimizeMode == 'targetWinPercentage' && input.targetPercentage === undefined) {
    console.error('targetWinPercentage optimizeMode requires targetPercentage');
    return { recommendations: [{ army: {}, cost: 0 }] };
  }
  if (optimizeMode == 'targetProfit' && input.targetProfit === undefined) {
    console.error('targetProfit optimizeMode requires targetProfit');
    return { recommendations: [], feasible: false };
  }

  let maxArmy: Army;
  let minArmy: Army;
  let stepArmy: Army;
  if (attDefType == 'attacker') {
    maxArmy = input.wave_info[0].attack.units;
    minArmy = input.minArmy ?? initArmy(maxArmy, 0);
    stepArmy = initArmy(maxArmy, 1);
  } else {
    maxArmy = input.wave_info[0].defense.units;
    minArmy = input.minArmy ?? initArmy(maxArmy, 0);
    stepArmy = initArmy(maxArmy, 1);
  }
  // branchAndBound enumerates the count space lazily; do not materialize every
  // sub-army up front for it.
  const armies = solveType == 'branchAndBound' ? [] : getSubArmies(maxArmy, minArmy, stepArmy);
  if (solveType != 'branchAndBound' && input.verbose_level && input.verbose_level > 0) {
    console.log(armies.length, 'armies length');
    console.log(maxArmy, minArmy, stepArmy);
  }
  const surviveThreshold = input.targetPercentage ?? 0;
  if (input.verbose_level && input.verbose_level > 0) {
    console.log(input);
  }

  const finish = (recommendations: Recommendation[]): ArmyRecommendOutput => {
    if (optimizeMode != 'targetProfit') {
      return { recommendations };
    }
    const first = recommendations[0];
    const feasible =
      first?.profit !== undefined &&
      targetProfitFeasible(attDefType, first.profit, input.targetProfit ?? 0);
    return { recommendations, feasible };
  };

  switch (solveType) {
    case 'multiEval':
      solveMultiEval(input, armies, surviveThreshold, maxArmy);
      return finish([{ army: {}, cost: 0 }]);
    case 'exhaust':
      return finish(
        solveExhaust(input, attDefType, armies, surviveThreshold, optimizeMode, numRecommendations),
      );
    case 'fuzzyBinarySearch':
      return finish(solveFuzzyBinarySearch(input, attDefType, armies, surviveThreshold));
    case 'branchAndBound':
      return finish(
        solveBranchAndBound(
          input,
          attDefType,
          maxArmy,
          minArmy,
          surviveThreshold,
          optimizeMode,
          numRecommendations,
        ),
      );
    case 'linearSearch':
    case 'gridSearch':
      return finish(
        solveLinearOrGridSearch(
          input,
          attDefType,
          maxArmy,
          minArmy,
          surviveThreshold,
          optimizeMode,
          numRecommendations,
          solveType,
        ),
      );
    default:
      return finish([{ army: {}, cost: 0 }]);
  }
}

function solveMultiEval(
  input: ArmyRecommendInput,
  armies: [Army, number, number, number][],
  surviveThreshold: number,
  maxArmy: Army,
): void {
  let armylist = armies.map((tuple) => tuple[0]);
  let multiEvalInput: MultiEvalInput = {
    ...input,
    defenderList: armylist,
    attackerList: [],
  };
  multiEvalInput.wave_info[0].defense.units = maxArmy;
  let t0 = performance.now();
  let description = 'multiEval';
  console.time(description);
  let output = multiEvalExternal(multiEvalInput);
  let t1 = performance.now() - t0;
  console.timeEnd(description);
  if (input.verbose_level && input.verbose_level > 0) {
    console.log(input);
    console.log(output);
  }

  let multiEvalResult: [string, number, number, number][] = output.resultList.map(
    (tuple) => [tuple[0], tuple[1], 1 - tuple[2], tuple[3]] as [string, number, number, number],
  );
  multiEvalResult.sort((a, b) => {
    const av: number = Number(a[2] < surviveThreshold) ? 1.0 : 0.0;
    const bv: number = Number(b[2] < surviveThreshold) ? 1.0 : 0.0;
    if (av != bv) {
      return bv - av;
    } else {
      return Number(b[3]) - Number(a[3]);
    }
  });
  if (input.verbose_level && input.verbose_level > 0) {
    console.log(multiEvalResult);
    for (let k = 0; k < multiEvalResult.length; k++) {
      console.log(JSON.stringify(multiEvalResult[k]));
    }
  }
}

function solveExhaust(
  input: ArmyRecommendInput,
  attDefType: AttDefType,
  armies: [Army, number, number, number][],
  surviveThreshold: number,
  optimizeMode: OptimizeMode,
  numRecommendations: number,
): Recommendation[] {
  let out: [Army, number, number, number][] = [];
  for (let i = 0; i < armies.length; i++) {
    const [army, cost, AS, DS] = armies[i];
    const myinput: MultiwaveInput = {
      ...input,
    };
    if (attDefType == 'defender') {
      myinput.wave_info[0].defense.units = army;
    } else {
      myinput.wave_info[0].attack.units = army;
    }
    const output = multiwaveExternal(myinput);
    const survive =
      attDefType == 'defender' ? output.defense.survives[0] : output.attack.survives[0];
    const profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];
    if (input.verbose_level && input.verbose_level > 2) {
      console.log(
        myinput,
        output,
        output.complexity,
        profit,
        survive,
        'input, output, complexity, profit, survive',
      );
    }
    out.push([army, survive, cost, profit]);
  }
  if (optimizeMode == 'targetProfit') {
    const targetProfit = input.targetProfit ?? 0;
    // An empty army has profit 0 and cost 0; it is not a useful defending or
    // attacking recommendation, so exclude it from the candidate set.
    const nonEmpty = out.filter(([army]) => Object.values(army).some((count) => (count ?? 0) > 0));
    const feasible = nonEmpty.filter(([, , , profit]) =>
      targetProfitFeasible(attDefType, profit, targetProfit),
    );
    const pool = feasible.length > 0 ? feasible : nonEmpty;
    pool.sort((a, b) => {
      if (feasible.length > 0) {
        // Feasible: minimum TUV first, then the more favorable profit.
        if (a[2] != b[2]) {
          return a[2] - b[2];
        }
        const av = attDefType == 'defender' ? a[3] : -a[3];
        const bv = attDefType == 'defender' ? b[3] : -b[3];
        if (av != bv) {
          return av - bv;
        }
        return b[1] - a[1];
      }
      // Infeasible: closest profit to the target, then minimum TUV.
      const av = attDefType == 'defender' ? a[3] - targetProfit : targetProfit - a[3];
      const bv = attDefType == 'defender' ? b[3] - targetProfit : targetProfit - b[3];
      if (av != bv) {
        return av - bv;
      }
      return a[2] - b[2];
    });
    if (pool.length == 0) {
      return [];
    }
    const [army, survive, cost, profit] = pool[0];
    return [{ army, cost, profit, winPct: survive }];
  }
  if (optimizeMode == 'targetWinPercentage') {
    out.sort((a: [Army, number, number, number], b: [Army, number, number, number]) => {
      const av: number = Number(a[1] < surviveThreshold) ? 1.0 : 0.0;
      const bv: number = Number(b[1] < surviveThreshold) ? 1.0 : 0.0;
      if (av != bv) {
        return bv - av;
      } else {
        return Number(b[2]) - Number(a[2]);
      }
    });
    return [{ army: out[0][0], cost: out[0][2] }];
  } else {
    out.sort((a: [Army, number, number, number], b: [Army, number, number, number]) => {
      const av: number = Number(a[3]);
      const bv: number = Number(b[3]);
      if (av != bv) {
        return bv - av;
      } else {
        return Number(b[2]) - Number(a[2]);
      }
    });
    let recommendations: Recommendation[] = [];
    for (let i = 0; i < numRecommendations; i++) {
      recommendations.push({ army: out[i][0], cost: out[i][3] });
    }
    if (input.verbose_level && input.verbose_level > 2) {
      for (let k = 0; k < out.length; k++) {
        console.log(JSON.stringify(out[k]));
      }
    }
    return recommendations;
  }
}

function solveFuzzyBinarySearch(
  input: ArmyRecommendInput,
  attDefType: AttDefType,
  armies: [Army, number, number, number][],
  surviveThreshold: number,
): Recommendation[] {
  armies.sort((a: [Army, number, number, number], b: [Army, number, number, number]) => {
    const av: number = attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
    const bv: number = attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
    if (av != bv) {
      return av - bv;
    } else {
      return Number(a[1]) - Number(b[1]);
    }
  });
  if (input.verbose_level && input.verbose_level > 2) {
    console.log('sorted 1');
    for (let i = 0; i < armies.length; i++) {
      console.log(i, JSON.stringify(armies[i]));
    }
  }
  let low = 0;
  let high = armies.length - 1;
  let iter = 0;
  let lowPower = attDefType == 'defender' ? armies[low][3] : armies[low][2];
  let highPower = attDefType == 'defender' ? armies[high][3] : armies[high][2];
  while (low < high && high - low > 1 && lowPower < highPower) {
    let mid = Math.floor((low + high) / 2);
    const [army, cost, AS, DS] = armies[mid];
    let midPower = attDefType == 'defender' ? DS : AS;
    if (midPower == highPower) {
      break;
    }
    let midIndexArray: number[] = [];
    for (let i = mid; i > low; i--) {
      const [army, cost, AS, DS] = armies[i];
      let thePower = attDefType == 'defender' ? DS : AS;
      if (thePower == midPower) {
        midIndexArray.push(i);
        continue;
      }
      break;
    }
    for (let i = mid + 1; i < high; i++) {
      const [army, cost, AS, DS] = armies[i];
      let thePower = attDefType == 'defender' ? DS : AS;
      if (thePower == midPower) {
        midIndexArray.push(i);
        continue;
      }
      break;
    }
    midIndexArray.sort();
    let midIndexArr2: number[] = [];
    if (midIndexArray.length <= 3) {
      midIndexArr2 = midIndexArray;
    } else {
      midIndexArr2.push(midIndexArray[0]);
      midIndexArr2.push(midIndexArray[Math.floor(midIndexArray.length / 2)]);
      midIndexArr2.push(midIndexArray[midIndexArray.length - 1]);
    }
    let anySurvive: boolean = false;
    let allSurvive: boolean = true;
    for (let i = 0; i < midIndexArr2.length; i++) {
      let ii = midIndexArr2[i];
      const [army, cost, AS, DS] = armies[ii];
      const myinput: MultiwaveInput = {
        ...input,
      };
      if (attDefType == 'defender') {
        myinput.wave_info[0].defense.units = army;
      } else {
        myinput.wave_info[0].attack.units = army;
      }
      myinput.wave_info[0].retreat_expected_ipc_profit_threshold = undefined;
      myinput.wave_info[0].retreat_pwin_threshold = undefined;
      const output = multiwaveExternal(myinput);
      iter++;
      const survive =
        attDefType == 'defender' ? output.defense.survives[0] : output.attack.survives[0];
      if (survive >= surviveThreshold) {
        anySurvive = true;
      } else {
        allSurvive = false;
      }
    }
    if (input.verbose_level && input.verbose_level > 2) {
      console.log(low, high, lowPower, highPower, 'lowIndex, highIndex, lowPower, highPower');
    }
    if (allSurvive) {
      high = midIndexArray[0] - 1;
      highPower = attDefType == 'defender' ? armies[high][3] : armies[high][2];
    }
    if (!anySurvive) {
      low = midIndexArray[midIndexArray.length - 1];
      lowPower = attDefType == 'defender' ? armies[low][3] : armies[low][2];
    } else {
      high = midIndexArray[0];
      highPower = attDefType == 'defender' ? armies[high][3] : armies[high][2];
    }
  }
  let bestArmy = armies[high];
  let bestPower = attDefType == 'attacker' ? bestArmy[2] : bestArmy[3];
  bestPower = bestPower * 1.0 - 2;
  if (input.verbose_level && input.verbose_level > 0) {
    console.log('bestArmy', bestArmy);
    console.log('iterations', iter);
  }
  armies.sort((a: [Army, number, number, number], b: [Army, number, number, number]) => {
    const av: number = attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
    const bv: number = attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
    const acost: number = av >= bestPower ? 0 : 1;
    const bcost: number = bv >= bestPower ? 0 : 1;
    if (acost != bcost) {
      return acost - bcost;
    } else {
      return Number(a[1]) - Number(b[1]);
    }
  });
  if (input.verbose_level && input.verbose_level > 2) {
    console.log('sorted 2');
    for (let i = 0; i < armies.length; i++) {
      console.log(i, JSON.stringify(armies[i]));
    }
  }
  for (let i = 0; i < armies.length; i++) {
    const [army, cost, AS, DS] = armies[i];
    const myinput: MultiwaveInput = {
      ...input,
    };
    if (attDefType == 'defender') {
      myinput.wave_info[0].defense.units = army;
    } else {
      myinput.wave_info[0].attack.units = army;
    }
    myinput.wave_info[0].retreat_expected_ipc_profit_threshold = undefined;
    myinput.wave_info[0].retreat_pwin_threshold = undefined;
    const output = multiwaveExternal(myinput);
    iter++;

    if (input.verbose_level && input.verbose_level > 0) {
      console.log(iter, 'iter');
    }
    const survive =
      attDefType == 'defender' ? output.defense.survives[0] : output.attack.survives[0];
    if (survive >= surviveThreshold) {
      bestArmy = armies[i];
      break;
    }
  }

  console.log('Optimized Integer Parameters:', bestArmy);
  console.log('Minimum value found:', bestArmy[1]);
  console.log('iterations', iter);
  const myinput: MultiwaveInput = {
    ...input,
  };
  const [army, cost, AS, DS] = bestArmy;
  if (attDefType == 'defender') {
    myinput.wave_info[0].defense.units = army;
  } else {
    myinput.wave_info[0].attack.units = army;
  }
  const output = multiwaveExternal(myinput);
  if (input.verbose_level && input.verbose_level > 0) {
    console.log(myinput);
    console.log(output);
  }

  return [{ army: bestArmy[0], cost: bestArmy[1] }];
}

// Fraction of the fixed opponent's Lanchester score used as the automatic
// branch-and-bound floor for land target-win searches.  Tuned against the
// cheapest winning army measured on land scenarios:
//   50% target -> 0.8;  70% -> 0.95;  90% -> 1.1.
// Below 50% the line runs to 0 at 0% (a weaker target needs less strength).
// Above 90% it is capped at 1.1.
export function scoreFloorFactor(targetWinPct: number): number {
  const target = Math.max(0, Math.min(1, targetWinPct));
  if (target <= 0.5) {
    return 1.6 * target; // 0 at 0%, 0.8 at 50%
  }
  if (target >= 0.9) {
    return 1.1; // capped
  }
  return 0.8 + ((target - 0.5) / 0.4) * 0.3; // 0.8 at 50% -> 1.1 at 90%
}

// Branch and bound over integer unit counts.  Unlike exhaust/fuzzyBinarySearch
// it does not materialize getSubArmies(): the exact evaluator is called only on
// leaves that survive the bounds.
function solveBranchAndBound(
  input: ArmyRecommendInput,
  attDefType: AttDefType,
  maxArmy: Army,
  minArmy: Army,
  surviveThreshold: number,
  optimizeMode: OptimizeMode,
  numRecommendations: number,
): Recommendation[] {
  const stats = getUnitStatsMap();
  const optimizingAttacker = attDefType == 'attacker';

  function makeUnits(army: Army, isAttacker: boolean, minimums?: Army): BnbUnitSpec[] {
    const result: BnbUnitSpec[] = [];
    for (const [key, count] of Object.entries(army)) {
      const uid = <UnitIdentifier>key;
      if (count <= 0) {
        continue;
      }
      const stat = stats[uid];
      if (stat == undefined) {
        continue;
      }
      result.push({
        id: uid,
        count,
        min: minimums?.[uid] ?? 0,
        ipc: stat.cost,
        pips: isAttacker ? stat.att : stat.def,
        hp: stat.hits,
        isGround: stat.isLand,
        isInf: uid == 'inf' || uid == 'inf_a',
        isArt: uid == 'art' || uid == 'art_a',
        isSub: stat.isSub,
      });
    }
    return result;
  }

  const units = makeUnits(maxArmy, optimizingAttacker, minArmy);
  if (units.length == 0 || units.some((unit) => (unit.min ?? 0) > unit.count)) {
    return [{ army: {}, cost: 0 }];
  }

  const wave0 = input.wave_info[0];
  const attack = wave0.attack;
  const defense = wave0.defense;
  // Match fuzzyBinarySearch: when optimizing for a win percentage, ignore the
  // EV/pwin retreat thresholds so a cheap army cannot "win" by retreating.  The
  // profit objective keeps them, like gridSearch/linearSearch/exhaust.
  const stripRetreatEv = optimizeMode == 'targetWinPercentage';

  // Land target-win searches default to a target-dependent Lanchester floor.
  // Sea battles are excluded: first-strike and air-invulnerability make the
  // score a poor win predictor there (e.g. 4 fighters vs 6 subs/3 destroyers has
  // an optimum score ratio of 0.36).  maxProfit gets no automatic floor.  An
  // explicit minScoreThreshold (including 0 to disable) always wins.
  let minScoreThreshold = input.minScoreThreshold;
  let autoScoreFloor = false;
  if (minScoreThreshold === undefined && !input.is_naval && optimizeMode == 'targetWinPercentage') {
    const opponentArmy = optimizingAttacker ? defense.units : attack.units;
    const opponentIsAttacker = !optimizingAttacker;
    const opponentUnits = makeUnits(opponentArmy, opponentIsAttacker);
    const opponentScore = lanchesterScore(opponentUnits, opponentIsAttacker);
    // Cap at the full max army's score so an unreachable target still evaluates
    // a best-effort army instead of pruning the whole tree.
    const maxArmyScore = lanchesterScore(units, optimizingAttacker);
    minScoreThreshold = Math.min(scoreFloorFactor(surviveThreshold) * opponentScore, maxArmyScore);
    autoScoreFloor = true;
  }

  const evaluateExact = (counts: number[]): { winPct: number; profit: number } => {
    const army: Army = {};
    for (let i = 0; i < units.length; i++) {
      if (counts[i] > 0) {
        army[<UnitIdentifier>units[i].id] = counts[i];
      }
    }
    // Clone the wave and the changed unit group; do not mutate the caller's
    // input (the existing solve paths do, but new code should not).
    const wave = {
      ...wave0,
      retreat_expected_ipc_profit_threshold: stripRetreatEv
        ? undefined
        : wave0.retreat_expected_ipc_profit_threshold,
      retreat_pwin_threshold: stripRetreatEv ? undefined : wave0.retreat_pwin_threshold,
      attack: { ...attack, units: optimizingAttacker ? army : attack.units },
      defense: { ...defense, units: optimizingAttacker ? defense.units : army },
    };
    const myinput: MultiwaveInput = {
      ...input,
      wave_info: [wave, ...input.wave_info.slice(1)],
    };
    const output = multiwaveExternal(myinput);
    const winPct =
      attDefType == 'defender' ? output.defense.survives[0] : output.attack.survives[0];
    // The engine already credits captured territory IPC and charges the
    // dead-zone counterattack penalty inside this profit.
    const profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];
    return { winPct, profit };
  };

  const result = optimizeSubArmyBranchAndBound(
    units,
    {
      objective: optimizeMode == 'maxProfit' ? 'MAX_PROFIT' : 'MIN_WIN_PCT',
      targetWinPct: surviveThreshold,
      numRecommendations,
      isAttacker: optimizingAttacker,
      defenderTUV: getArmyCost(defense.units),
      territoryIPC: input.territory_value ?? 0,
      maxGroundHP: input.maxGroundHP,
      minScoreThreshold,
    },
    evaluateExact,
  );

  if (input.verbose_level && input.verbose_level > 0) {
    console.log(
      'branchAndBound score floor',
      minScoreThreshold ?? 0,
      autoScoreFloor ? '(auto 0.8 x opponent)' : '(none/explicit)',
    );
    console.log('branchAndBound evaluations', result.evalsRun, 'feasible', result.feasible);
  }

  const recommendations: Recommendation[] = [];
  for (const solution of result.solutions) {
    const army: Army = {};
    for (let i = 0; i < units.length; i++) {
      if (solution.counts[i] > 0) {
        army[<UnitIdentifier>units[i].id] = solution.counts[i];
      }
    }
    recommendations.push({
      army,
      cost: optimizeMode == 'maxProfit' ? solution.profit : solution.tuv,
    });
  }
  if (recommendations.length == 0) {
    return [{ army: {}, cost: 0 }];
  }
  return recommendations;
}

// Unit dimensions for grid/linear search.  The preferred order preserves the
// historical land order (and therefore existing results); unit types present in
// the pool but absent from the preferred list are appended.  Preferred types
// with no units stay as [0, 0] dimensions, which cost nothing to enumerate.
function gridUnitOrder(attDefType: AttDefType, maxArmy: Army): UnitIdentifier[] {
  const preferred: UnitIdentifier[] =
    attDefType == 'defender'
      ? [
          'inf',
          'art',
          'arm',
          'fig',
          'bom',
          'aa',
          'des',
          'sub',
          'acc',
          'cru',
          'bat',
          'tra',
          'dbat',
          'ic',
          'inf_a',
          'art_a',
          'arm_a',
          'bat1',
        ]
      : [
          'inf',
          'art',
          'arm',
          'fig',
          'bom',
          'bat',
          'cru',
          'des',
          'sub',
          'acc',
          'aa',
          'tra',
          'dbat',
          'ic',
          'inf_a',
          'art_a',
          'arm_a',
          'bat1',
        ];
  const ordered = [...preferred];
  for (const uid of Object.keys(maxArmy) as UnitIdentifier[]) {
    if (!ordered.includes(uid)) {
      ordered.push(uid);
    }
  }
  return ordered;
}

function solveLinearOrGridSearch(
  input: ArmyRecommendInput,
  attDefType: AttDefType,
  maxArmy: Army,
  minArmy: Army,
  surviveThreshold: number,
  optimizeMode: OptimizeMode,
  numRecommendations: number,
  solveType: SolveType | undefined,
): Recommendation[] {
  const maxUnits = maxArmy;
  const minUnits = minArmy;
  const targetProfit = input.targetProfit ?? 0;

  const unitOrder = gridUnitOrder(attDefType, maxArmy);
  for (const uid of unitOrder) {
    if ((minUnits[uid] ?? 0) > (maxUnits[uid] ?? 0)) {
      return [];
    }
  }

  interface Evaluation {
    army: Army;
    cost: number;
    survive: number;
    profit: number;
    overflow: number;
  }

  const evaluationCache = new Map<string, Evaluation>();
  const objectiveCache = new Map<string, number>();

  // Preserve the historical recommendation shape: the land unit keys for this
  // side are always present (even at zero), while any other unit type that is
  // actually available in the pool is added.  This keeps old snapshot/output
  // shapes stable while allowing naval and other unit types to be searched.
  const legacyKeys: UnitIdentifier[] =
    attDefType == 'defender'
      ? ['inf', 'art', 'arm', 'fig', 'bom', 'aa']
      : ['inf', 'art', 'arm', 'fig', 'bom', 'bat', 'cru'];
  const armyKeys = new Set<UnitIdentifier>(legacyKeys);
  for (const uid of Object.keys(maxUnits) as UnitIdentifier[]) {
    if ((maxUnits[uid] ?? 0) > 0) {
      armyKeys.add(uid);
    }
  }

  function getArmy(vars: number[]): Army {
    const army: Army = {};
    for (let i = 0; i < unitOrder.length; i++) {
      const uid = unitOrder[i];
      if (armyKeys.has(uid)) {
        army[uid] = Math.round(vars[i]);
      }
    }
    return army;
  }

  function evaluationFor(vars: number[]): Evaluation {
    const key = JSON.stringify(vars);
    const cached = evaluationCache.get(key);
    if (cached != undefined) {
      return cached;
    }
    const army = getArmy(vars);
    if (attDefType == 'defender') {
      input.wave_info[0].defense.units = army;
    } else {
      input.wave_info[0].attack.units = army;
    }
    const output = multiwaveExternal(input);
    const survive =
      attDefType == 'defender' ? output.defense.survives[0] : output.attack.survives[0];
    const profit = output.defense.ipcLoss[0] - output.attack.ipcLoss[0];
    const cost = getArmyCost(army);

    let overflow = 0;
    for (const [uid, count] of Object.entries(army)) {
      if (count < 0) {
        overflow += -count;
      }
      const max = maxUnits[<UnitIdentifier>uid] ?? 0;
      if (count > max) {
        overflow += count;
      }
      const min = minUnits[<UnitIdentifier>uid] ?? 0;
      if (count < min) {
        overflow += min - count;
      }
    }

    const evaluation: Evaluation = { army, cost, survive, profit, overflow };
    evaluationCache.set(key, evaluation);
    return evaluation;
  }

  function objectiveFor(evaluation: Evaluation): number {
    const { cost, survive, profit, overflow } = evaluation;
    if (overflow > 0) {
      if (optimizeMode == 'maxProfit') {
        return 1000000 * overflow;
      }
      if (optimizeMode == 'targetProfit') {
        return 1e15 + 1000000 * overflow;
      }
      return cost + 500 * overflow;
    }

    if (optimizeMode == 'maxProfit') {
      return -profit;
    }

    if (optimizeMode == 'targetProfit') {
      // The empty army has profit 0 and cost 0, so it would otherwise win any
      // non-negative target.  It is not a useful recommendation.
      if (!Object.values(evaluation.army).some((count) => (count ?? 0) > 0)) {
        return 1e15;
      }
      const feasible = targetProfitFeasible(attDefType, profit, targetProfit);
      // Smaller is better.  For a defender a more negative profit is the more
      // favorable outcome; for an attacker a larger profit is.
      const favorable = attDefType == 'defender' ? profit : -profit;
      if (feasible) {
        return cost * 1000000 + favorable;
      }
      const violation = attDefType == 'defender' ? profit - targetProfit : targetProfit - profit;
      return 1e12 + violation * 1000000 + cost * 1000 + favorable;
    }

    if (survive < surviveThreshold) {
      return cost + 1000000 * (surviveThreshold - survive);
    }
    return cost;
  }

  function objectiveFn(vars: number[]): number {
    const key = JSON.stringify(vars);
    const cached = objectiveCache.get(key);
    if (cached != undefined) {
      return cached;
    }
    const value = objectiveFor(evaluationFor(vars));
    objectiveCache.set(key, value);
    return value;
  }

  const initial: number[] = unitOrder.map((uid) => maxUnits[uid] ?? 0);
  const bounds: [number, number][] = unitOrder.map((uid) => [
    minUnits[uid] ?? 0,
    maxUnits[uid] ?? 0,
  ]);

  const verbose = !!(input.verbose_level && input.verbose_level > 0);

  if (verbose) console.log(initial, 'initialGuess');
  if (verbose) console.log(bounds, 'bounds');
  const beamWidth = input.beamWidth ?? 3;
  const granularity = input.granularity ?? 3;
  if (solveType == 'gridSearch') {
    const gridResults = gridSearch(objectiveFn, bounds, verbose, beamWidth, granularity);
    if (verbose)
      console.log('Optimized Integer Parameters:', gridResults.length > 0 ? gridResults[0] : 'N/A');
  } else {
    const lineResult = lineSearch(objectiveFn, initial, bounds, 20, verbose);
    if (verbose) console.log('Optimized Integer Parameters:', lineResult);
  }

  const evaluated = Array.from(evaluationCache.entries())
    .map(([key, evaluation]) => ({
      vars: JSON.parse(key) as number[],
      evaluation,
      value: objectiveFor(evaluation),
    }))
    .sort((a, b) => a.value - b.value);

  if (verbose) {
    console.log(evaluationCache.size, 'map size');
  }

  if (optimizeMode == 'targetProfit') {
    if (evaluated.length == 0) {
      return [];
    }
    const best = evaluated[0].evaluation;
    return [{ army: best.army, cost: best.cost, profit: best.profit, winPct: best.survive }];
  }

  const recommendations: Recommendation[] = [];
  const n = Math.min(numRecommendations, evaluated.length);
  for (let i = 0; i < n; i++) {
    const { army, cost, profit } = evaluated[i].evaluation;
    recommendations.push({
      army,
      cost: optimizeMode == 'maxProfit' ? profit : cost,
    });
  }

  return recommendations;
}

function approximateGradient(
  initialParams: number[],
  bounds: [number, number][],
  delta: number, // Small change for approximating gradient
  objectiveFunction: (x: number[]) => number,
): number[] {
  let params = [...initialParams];

  let gradients: number[] = [];

  // Calculate approximate gradient for each parameter
  for (let j = 0; j < params.length; j++) {
    const originalVal = params[j];
    const lowBound = bounds[j][0];
    const highBound = bounds[j][1];

    // Perturb parameter slightly in positive direction
    params[j] = Math.min(originalVal + delta, highBound);
    let xplus = params[j];
    const fPlusDelta = objectiveFunction(params);

    // Perturb parameter slightly in negative direction
    params[j] = Math.max(originalVal - delta, lowBound);
    let xminus = params[j];
    const fMinusDelta = objectiveFunction(params);

    // Calculate approximate gradient using finite difference
    gradients[j] = xplus != xminus ? (fPlusDelta - fMinusDelta) / (xplus - xminus) : 0;

    // Restore original parameter value
    params[j] = originalVal;
  }

  return gradients;
}
function doNeighborSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector,
  bound: [number, number][],
  delta: number,
  zerodelta: number,
  verbose?: boolean,
): Vector {
  let range: Number[][] = [];
  for (let i = 0; i < x.length; i++) {
    let mydelta = x[i] == 0 ? zerodelta : delta;
    let minval = bound[i][0];
    let maxval = bound[i][1];
    let min = Math.max(x[i] - mydelta, minval);
    let max = Math.min(x[i] + mydelta, maxval);
    let v = getIntegersInRange(min, max, 1);
    range.push(v);
  }
  let combinations = getCombinations(range);
  let miny = objectiveFn(x);
  let minx = x;
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    if (y1 < miny) {
      miny = y1;
      minx = x1;
    }
  }

  return minx;
}
function doGridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number, number][],
  verbose?: boolean,
  k: number = 1,
): [Vector, number][] {
  let range: Number[][] = [];
  for (let i = 0; i < bound.length; i++) {
    let minval = bound[i][0];
    let maxval = bound[i][1];
    let step = bound[i][2];
    //console.log(i, minval, maxval, step);
    let v = getIntegersInRange(minval, maxval, step);
    //console.log(i, minval, maxval, step, v);
    range.push(v);
  }
  //console.log(range, "range");
  let combinations = getCombinations(range);
  //console.log(combinations, "combinations");
  if (verbose) console.log(combinations.length, 'combinations');
  let evaluated: [Vector, number][] = [];
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    //console.log(x1, y1, "x1, y1")
    evaluated.push([x1, y1]);
  }
  evaluated.sort((a, b) => a[1] - b[1]);
  return evaluated.slice(0, k);
}
function gridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number][],
  verbose?: boolean,
  beamWidth: number = 3,
  granularity: number = 3,
): Vector[] {
  const g = granularity;
  const k = Math.max(1, beamWidth);
  let currBound: [number, number, number][] = [];
  for (let i = 0; i < bound.length; i++) {
    let low = bound[i][0];
    let high = bound[i][1];
    let step = Math.max(Math.ceil((high - low) / g), 1);
    currBound.push([low, high, step]);
  }
  if (verbose) console.log(currBound, 'currBound');
  let bestList = doGridSearch(objectiveFn, currBound, verbose, k);

  for (let iter = 0; iter < 10; iter++) {
    let prevBound = currBound;
    let allCandidates: [Vector, number][] = [];
    let stop = true;

    for (let beamIdx = 0; beamIdx < bestList.length; beamIdx++) {
      const best = bestList[beamIdx][0];
      let beamBound: [number, number, number][] = [];
      for (let d = 0; d < best.length; d++) {
        let oldstep = prevBound[d][2];
        let low = Math.max(best[d] - oldstep, bound[d][0]);
        let high = Math.min(best[d] + oldstep, bound[d][1]);
        let step = Math.max(Math.floor((high - low) / g), 1);
        if (step > 1) stop = false;
        beamBound.push([low, high, step]);
      }
      const candidates = doGridSearch(objectiveFn, beamBound, false, k);
      allCandidates.push(...candidates);
    }

    allCandidates.sort((a, b) => a[1] - b[1]);
    bestList = allCandidates.slice(0, k);
    if (verbose) {
      console.log('top k', bestList);
    }

    if (stop) break;

    const best = bestList[0][0];
    currBound = [];
    for (let d = 0; d < best.length; d++) {
      let oldstep = prevBound[d][2];
      let low = Math.max(best[d] - oldstep, bound[d][0]);
      let high = Math.min(best[d] + oldstep, bound[d][1]);
      let step = Math.max(Math.floor((high - low) / g), 1);
      currBound.push([low, high, step]);
    }
  }

  return bestList.map((pair) => pair[0]);
}
function lineSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector,
  bound: [number, number][],
  numIterations: number,
  verbose?: boolean,
): Vector {
  let x0 = x.slice();
  for (let i = 0; i < numIterations; i++) {
    let gradientAtX = approximateGradient(x0, bound, 1.0, objectiveFn);

    // negative gradient, normalized to unit length
    let direction: Vector = gradientAtX.map((val) => -val);
    let norm = Math.sqrt(direction.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) direction = direction.map((v) => v / norm);
    for (let i = 0; i < direction.length; i++) {
      let val = x0[i];
      let minBound = bound[i][0];
      let maxBound = bound[i][1];
      let dir = direction[i];
      if (val <= minBound && dir < 0) {
        direction[i] = 0;
      }
      if (val >= maxBound && dir > 0) {
        direction[i] = 0;
      }
    }
    let stepSize = backtrackingLineSearch(objectiveFn, x0, bound, direction, 0.5, 0.9, 20.0);
    const newX: Vector = x0.map((val, i) => {
      let v = Math.round(val + stepSize * direction[i]);
      if (v < bound[i][0]) {
        v = bound[i][0];
      }
      if (v > bound[i][1]) {
        v = bound[i][1];
      }
      return v;
    });
    //console.log(i, x0, gradientAtX, direction, stepSize, newX, "before check");
    let same = true;
    for (let i = 0; i < newX.length; i++) {
      if (newX[i] != x0[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      // do neighbor search
      let xNew = doNeighborSearch(objectiveFn, x0, bound, 4, 0, verbose);
      let same = true;
      for (let i = 0; i < xNew.length; i++) {
        if (xNew[i] != x0[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        break;
      }
      x0 = xNew;
      if (verbose) console.log(i, x0, 'neighbor search');
      continue;
    }
    x0 = newX;
    if (verbose) console.log(i, x0, direction, stepSize, newX);
  }
  // iterative final refinement
  let xFinal = x0;
  for (let ref = 0; ref < 5; ref++) {
    const xNext = doNeighborSearch(objectiveFn, xFinal, bound, 4, 0, verbose);
    let same = true;
    for (let i = 0; i < xNext.length; i++) {
      if (xNext[i] != xFinal[i]) {
        same = false;
        break;
      }
    }
    if (same) break;
    xFinal = xNext;
    if (verbose) console.log('refinement pass', ref, ':', xFinal);
  }
  return xFinal;
}
type Vector = number[]; // Represents a vector (e.g., a point in n-dimensional space)
interface ObjectiveFunction {
  (x: Vector): number; // Evaluates the objective function at point x
}
function backtrackingLineSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector, // Current point
  bound: [number, number][], // Current point
  direction: Vector, // Search direction (e.g., negative gradient)
  alpha: number = 0.5, // Armijo condition parameter (0 < alpha < 1)
  beta: number = 0.8, // Backtracking reduction factor (0 < beta < 1)
  initialStepSize: number = 1.0,
): number {
  let stepSize = initialStepSize;

  // Calculate the dot product of gradient and direction for the Armijo condition
  const gradientAtX = approximateGradient(x, bound, 1.0, objectiveFn);
  let dotProduct = 0;
  for (let i = 0; i < x.length; i++) {
    dotProduct += gradientAtX[i] * direction[i];
  }

  // Backtracking loop
  while (true) {
    // Calculate the new point with the current step size
    let xNew: Vector = x.map((val, i) => Math.round(val + stepSize * direction[i]));
    for (let i = 0; i < xNew.length; i++) {
      let max = bound[i][1];
      let min = bound[i][0];
      if (xNew[i] > max) {
        xNew[i] = max;
      }
      if (xNew[i] < min) {
        xNew[i] = min;
      }
    }

    let same = true;
    for (let i = 0; i < xNew.length; i++) {
      if (xNew[i] != x[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      break;
    }
    let y1 = objectiveFn(xNew);
    let y0 = objectiveFn(x);
    //console.log(y1, y0, xNew, x, stepSize, 'y1, y0, xNew, x, step');
    //console.log(y1, y0, alpha, stepSize, dotProduct, y0+alpha*stepSize*dotProduct, 'armijo condition');
    // Check the Armijo condition
    if (y1 < y0 + alpha * stepSize * dotProduct) {
      break; // Condition met, exit loop
    }

    // Reduce the step size if the condition is not met
    stepSize *= beta;

    // Optional: Add a check for minimum step size to prevent infinite loops
    // if (stepSize < epsilon) { /* Handle small step size or convergence */ }
  }

  return stepSize;
}
