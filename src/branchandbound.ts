// Branch-and-bound optimizer for single-stack army recommendations.
//
// The caller supplies per-unit specifications and an exact evaluator; this
// module knows nothing about battle mechanics.  It searches integer unit-count
// vectors under optional minimum counts and an optional maximum total ground
// HP.
//
// Objectives
//  - MIN_WIN_PCT: smallest total IPC value (TUV) whose win probability meets
//    `targetWinPct`.
//  - MAX_PROFIT: largest profit (expected defender IPC loss minus attacker IPC
//    loss, as computed by the engine) and the top `numRecommendations` armies.
//
// Pruning is exact by default:
//  - MIN_WIN_PCT: partial TUV is a lower bound on the TUV of any extension, so
//    a partial army at least as expensive as the best feasible army is pruned.
//  - MAX_PROFIT: profit cannot exceed the defender's total IPC value plus the
//    value of the captured territory.  When optimizing the attacker that
//    ceiling is fixed; when optimizing the defender the defender's losses are
//    bounded by the candidate's own TUV, which is bounded by the partial TUV
//    plus every remaining unit.
//
// `minScoreThreshold` is an optional model-based prune using the Lanchester
// square-law product (effective pips x hit points).  It is disabled (0) by
// default because it is not a mathematical bound on battle outcomes: it prunes
// only when the caller asserts that weaker armies cannot meet the objective.

export type BnbObjective = 'MIN_WIN_PCT' | 'MAX_PROFIT';

export interface BnbUnitSpec {
  id: string;
  count: number; // maximum count available
  min?: number; // minimum count that must be committed (default 0)
  ipc: number; // IPC value of one unit
  pips: number; // offensive or defensive pips of one unit, before pairing
  hp: number; // hit points of one unit
  isGround?: boolean; // land unit, contributes to curGroundHP
  isInf?: boolean; // infantry, pairs with artillery
  isArt?: boolean; // artillery
  isSub?: boolean; // submarine, gets the first-strike pip bonus
}

export interface BnbEvaluateResult {
  winPct: number;
  profit: number;
}

export interface BnbConfig {
  objective: BnbObjective;
  targetWinPct?: number;
  numRecommendations?: number; // MAX_PROFIT only, default 1
  isAttacker: boolean; // optimized side; also enables artillery pairing
  defenderTUV?: number; // fixed defender IPC value (attacker optimization)
  territoryIPC?: number; // value of the territory being attacked
  maxGroundHP?: number; // optional cap on committed ground HP
  minScoreThreshold?: number; // optional Lanchester score floor, 0 disables
}

export interface BnbSolution {
  counts: number[]; // aligned with the caller's `units` order
  tuv: number;
  winPct: number;
  profit: number;
}

export interface BnbResult {
  // For MIN_WIN_PCT: the cheapest feasible army, or the best-evaluated army
  // when the target is unreachable.  For MAX_PROFIT: the top armies by profit.
  solutions: BnbSolution[];
  feasible: boolean;
  evalsRun: number;
}

function powerPerIPC(unit: BnbUnitSpec): number {
  const pipsX4 = unit.pips * 4 + (unit.isSub ? 2 : 0);
  return (pipsX4 * unit.hp) / Math.max(1, unit.ipc);
}

// Lanchester square-law score used by the search: effective pips x total HP.
// Effective pips include artillery pairing for attackers and the 1.25x
// submarine bonus, matching the score computed inside optimizeSubArmy.
export function lanchesterScore(units: BnbUnitSpec[], isAttacker: boolean): number {
  let pipsX4 = 0;
  let hp = 0;
  let inf = 0;
  let art = 0;
  for (const unit of units) {
    pipsX4 += unit.count * (unit.pips * 4 + (unit.isSub ? 2 : 0));
    hp += unit.count * unit.hp;
    if (isAttacker && unit.isInf) {
      inf += unit.count;
    }
    if (isAttacker && unit.isArt) {
      art += unit.count;
    }
  }
  if (isAttacker) {
    pipsX4 += 4 * Math.min(inf, art);
  }
  return (pipsX4 * hp) / 4;
}

// Units are ordered so that the most promising count varies first in the DFS.
// The last unit in the search array varies fastest.  For minimization that is
// the highest power-per-IPC unit, so cheap efficient armies are found early.
// For maximization it is the lowest power-per-IPC unit, so the weakest units
// are dropped first.
function searchOrder(units: BnbUnitSpec[], objective: BnbObjective): number[] {
  const order = units.map((unit, index) => ({
    index,
    power: powerPerIPC(unit),
  }));
  if (objective === 'MAX_PROFIT') {
    order.sort((a, b) => b.power - a.power || a.index - b.index);
  } else {
    order.sort((a, b) => a.power - b.power || a.index - b.index);
  }
  return order.map((entry) => entry.index);
}

export function optimizeSubArmy(
  units: BnbUnitSpec[],
  config: BnbConfig,
  evaluateExact: (counts: number[]) => BnbEvaluateResult,
): BnbResult {
  const n = units.length;
  if (n === 0) {
    return { solutions: [], feasible: false, evalsRun: 0 };
  }

  // A minimum larger than the maximum makes the whole search infeasible.
  for (const unit of units) {
    if ((unit.min ?? 0) > unit.count) {
      return { solutions: [], feasible: false, evalsRun: 0 };
    }
  }

  const objective = config.objective;
  const order = searchOrder(units, objective);
  const sorted = order.map((index) => units[index]);
  const isMaxProfit = objective === 'MAX_PROFIT';
  const numRecommendations = isMaxProfit ? Math.max(1, config.numRecommendations ?? 1) : 1;
  const targetWinPct = config.targetWinPct ?? 0;
  const isAttacker = config.isAttacker;
  const pairPips = isAttacker;
  const territoryBonus = Math.max(0, config.territoryIPC ?? 0);
  // Unknown defender value disables the fixed attacker-side ceiling.
  const defenderTUV = config.defenderTUV ?? Infinity;
  const maxProfitCeiling = defenderTUV + territoryBonus;
  const maxGroundHP = config.maxGroundHP;
  const scoreFloorX4 = Math.max(0, config.minScoreThreshold ?? 0) * 4;

  // Suffix sums over the search order: the remaining units at index idx.
  const suffixPipsX4 = new Array<number>(n + 1).fill(0);
  const suffixHP = new Array<number>(n + 1).fill(0);
  const suffixIPC = new Array<number>(n + 1).fill(0);
  const suffixInf = new Array<number>(n + 1).fill(0);
  const suffixArt = new Array<number>(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const unit = sorted[i];
    const pipsX4 = unit.pips * 4 + (unit.isSub ? 2 : 0);
    suffixPipsX4[i] = suffixPipsX4[i + 1] + unit.count * pipsX4;
    suffixHP[i] = suffixHP[i + 1] + unit.count * unit.hp;
    suffixIPC[i] = suffixIPC[i + 1] + unit.count * unit.ipc;
    suffixInf[i] = suffixInf[i + 1] + (unit.isInf ? unit.count : 0);
    suffixArt[i] = suffixArt[i + 1] + (unit.isArt ? unit.count : 0);
  }

  const current = new Array<number>(n).fill(0);
  let evalsRun = 0;

  // MIN_WIN_PCT state.
  let feasible = false;
  let bestTUV = Infinity;
  let bestSolution: BnbSolution | undefined;
  let fallbackWinPct = -Infinity;
  let fallbackTUV = Infinity;
  let fallbackSolution: BnbSolution | undefined;

  // MAX_PROFIT state.
  const top: BnbSolution[] = [];
  let cutoff = -Infinity; // profit of the worst kept solution, once full

  function recordProfit(solution: BnbSolution): void {
    if (top.length >= numRecommendations && solution.profit <= cutoff) {
      return;
    }
    let position = top.length;
    while (position > 0 && top[position - 1].profit < solution.profit) {
      position--;
    }
    top.splice(position, 0, solution);
    if (top.length > numRecommendations) {
      top.length = numRecommendations;
    }
    cutoff = top.length >= numRecommendations ? top[numRecommendations - 1].profit : -Infinity;
  }

  function countsForEvaluator(): number[] {
    const counts = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      counts[order[i]] = current[i];
    }
    return counts;
  }

  function dfs(
    idx: number,
    curPipsX4: number,
    curHP: number,
    curInf: number,
    curArt: number,
    curTUV: number,
    curGroundHP: number,
  ): void {
    if (maxGroundHP !== undefined && curGroundHP > maxGroundHP) {
      return;
    }

    if (isMaxProfit) {
      const remainingTUV = curTUV + suffixIPC[idx];
      const ceiling = isAttacker ? maxProfitCeiling : remainingTUV + territoryBonus;
      if (ceiling <= cutoff) {
        return;
      }
    } else if (curTUV >= bestTUV) {
      return;
    }

    if (scoreFloorX4 > 0) {
      const pairing = pairPips ? 4 * Math.min(curInf + suffixInf[idx], curArt + suffixArt[idx]) : 0;
      const maxPipsX4 = curPipsX4 + suffixPipsX4[idx] + pairing;
      const maxHP = curHP + suffixHP[idx];
      if (maxPipsX4 * maxHP < scoreFloorX4) {
        return;
      }
    }

    if (idx === n) {
      if (curHP === 0) {
        return;
      }
      const counts = countsForEvaluator();
      const result = evaluateExact(counts);
      evalsRun++;
      const solution: BnbSolution = {
        counts,
        tuv: curTUV,
        winPct: result.winPct,
        profit: result.profit,
      };
      if (isMaxProfit) {
        recordProfit(solution);
        return;
      }
      if (result.winPct >= targetWinPct) {
        feasible = true;
        if (curTUV < bestTUV) {
          bestTUV = curTUV;
          bestSolution = solution;
        }
      }
      if (
        result.winPct > fallbackWinPct ||
        (result.winPct === fallbackWinPct && curTUV < fallbackTUV)
      ) {
        fallbackWinPct = result.winPct;
        fallbackTUV = curTUV;
        fallbackSolution = solution;
      }
      return;
    }

    const unit = sorted[idx];
    const unitPipsX4 = unit.pips * 4 + (unit.isSub ? 2 : 0);
    const minCount = Math.max(0, unit.min ?? 0);
    const groundHP = unit.isGround ? unit.hp : 0;
    if (isMaxProfit) {
      for (let k = unit.count; k >= minCount; k--) {
        current[idx] = k;
        dfs(
          idx + 1,
          curPipsX4 + k * unitPipsX4,
          curHP + k * unit.hp,
          curInf + (unit.isInf ? k : 0),
          curArt + (unit.isArt ? k : 0),
          curTUV + k * unit.ipc,
          curGroundHP + k * groundHP,
        );
      }
    } else {
      for (let k = minCount; k <= unit.count; k++) {
        current[idx] = k;
        dfs(
          idx + 1,
          curPipsX4 + k * unitPipsX4,
          curHP + k * unit.hp,
          curInf + (unit.isInf ? k : 0),
          curArt + (unit.isArt ? k : 0),
          curTUV + k * unit.ipc,
          curGroundHP + k * groundHP,
        );
      }
    }
    current[idx] = minCount;
  }

  dfs(0, 0, 0, 0, 0, 0, 0);

  if (isMaxProfit) {
    return { solutions: top, feasible: top.length > 0, evalsRun };
  }
  const solution = bestSolution ?? fallbackSolution;
  return { solutions: solution ? [solution] : [], feasible, evalsRun };
}
