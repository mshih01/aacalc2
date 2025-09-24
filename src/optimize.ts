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
  type UnitIdentifier,
  getIntegersInRange,
  getCombinations,
} from './external.js';

import { type PwinMode } from './solve.js';

export type AttDefType = 'attacker' | 'defender';

export type SolveType =
  | 'multiEval'
  | 'exhaust'
  | 'linearSearch'
  | 'gridSearch'
  | 'fuzzyBinarySearch';

export interface ArmyRecommendInput extends MultiwaveInput {
  attDefType: AttDefType;
  targetPercentage: number; // target percentage for attacker to win or defender to hold.
  pwinMode?: PwinMode;
  solveType?: SolveType;
}

export interface ArmyRecommendOutput {
  recommendations: {
    army: Army;
    cost: number;
  };
}

function initArmy(army: Army, value: number): Army {
  let result = { ...army };

  for (const [uid, count] of Object.entries(result)) {
    result[<UnitIdentifier>uid] = value;
  }
  return result;
}

export function armyRecommend(input: ArmyRecommendInput): ArmyRecommendOutput {
  const solveType = input.solveType;
  const attDefType = input.attDefType;
  let armyRecommendOutput: ArmyRecommendOutput = {
    recommendations: { army: {}, cost: 0 },
  };

  let maxArmy: Army;
  let minArmy: Army;
  let stepArmy: Army;
  if (attDefType == 'attacker') {
    maxArmy = input.wave_info[0].attack.units;
    minArmy = initArmy(maxArmy, 0);
    stepArmy = initArmy(maxArmy, 1);
  } else {
    maxArmy = input.wave_info[0].defense.units;
    minArmy = initArmy(maxArmy, 0);
    stepArmy = initArmy(maxArmy, 1);
  }
  const armies = getSubArmies(maxArmy, minArmy, stepArmy);
  console.log(armies.length, 'armies length');
  console.log(maxArmy, minArmy, stepArmy);
  const surviveThreshold = input.targetPercentage;
  console.log(input);
  switch (solveType) {
    case 'multiEval': {
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
      console.log(input);
      console.log(output);

      let multiEvalResult = output.resultList.map((tuple) => [
        tuple[0],
        tuple[1],
        1 - tuple[2],
        tuple[3],
      ]);
      multiEvalResult.sort((a: any[], b: any[]) => {
        const av: number = Number(a[2] < surviveThreshold) ? 1.0 : 0.0;
        const bv: number = Number(b[2] < surviveThreshold) ? 1.0 : 0.0;
        if (av != bv) {
          return bv - av;
        } else {
          return Number(b[3]) - Number(a[3]);
        }
      });
      console.log(multiEvalResult);
      for (let k = 0; k < multiEvalResult.length; k++) {
        console.log(JSON.stringify(multiEvalResult[k]));
      }
      break;
    }
    case 'exhaust': {
      // brute force
      let out: [Army, number, number][] = [];
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
        const survive =
          attDefType == 'defender'
            ? output.defense.survives[0]
            : output.attack.survives[0];
        console.log(myinput);
        console.log(output.complexity);
        out.push([army, survive, cost]);
      }
      out.sort((a: any[], b: any[]) => {
        const av: number = Number(a[1] < surviveThreshold) ? 1.0 : 0.0;
        const bv: number = Number(b[1] < surviveThreshold) ? 1.0 : 0.0;
        if (av != bv) {
          return bv - av;
        } else {
          return Number(b[2]) - Number(a[2]);
        }
      });
      for (let k = 0; k < out.length; k++) {
        console.log(JSON.stringify(out[k]));
      }
      armyRecommendOutput.recommendations = {
        army: out[0][0],
        cost: out[0][2],
      };
      break;
    }
    case 'fuzzyBinarySearch':
      armies.sort((a: any[], b: any[]) => {
        const av: number =
          attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
        const bv: number =
          attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
        if (av != bv) {
          return av - bv;
        } else {
          return Number(a[1]) - Number(b[1]);
        }
      });
      console.log('sorted 1');
      for (let i = 0; i < armies.length; i++) {
        console.log(i, JSON.stringify(armies[i]));
      }
      let low = 0;
      let high = armies.length - 1;
      let iter = 0;
      let lowPower = attDefType == 'defender' ? armies[low][3] : armies[low][2];
      let highPower =
        attDefType == 'defender' ? armies[high][3] : armies[high][2];
      while (low < high && high - low > 1 && lowPower < highPower) {
        let mid = Math.floor((low + high) / 2);
        const [army, cost, AS, DS] = armies[mid];
        let midPower = attDefType == 'defender' ? DS : AS;
        /*
          if (midPower == lowPower || midPower == highPower) {
            break;
          }
            */
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
          midIndexArr2.push(
            midIndexArray[Math.floor(midIndexArray.length / 2)],
          );
          midIndexArr2.push(midIndexArray[midIndexArray.length - 1]);
        }
        //midIndexArray  = [];
        //midIndexArray.push(mid);
        let anySurvive: boolean = false;
        let allSurvive: boolean = true;
        //console.log(midIndexArr2, 'midIndexArr2');
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
          myinput.wave_info[0].retreat_expected_ipc_profit_threshold =
            undefined;
          myinput.wave_info[0].retreat_pwin_threshold = undefined;
          const output = multiwaveExternal(myinput);
          iter++;
          const survive =
            attDefType == 'defender'
              ? output.defense.survives[0]
              : output.attack.survives[0];
          if (survive >= surviveThreshold) {
            anySurvive = true;
          } else {
            allSurvive = false;
          }
        }
        console.log(
          low,
          high,
          lowPower,
          highPower,
          'lowIndex, highIndex, lowPower, highPower',
        );
        if (allSurvive) {
          high = midIndexArray[0] - 1;
          highPower =
            attDefType == 'defender' ? armies[high][3] : armies[high][2];
        }
        if (!anySurvive) {
          low = midIndexArray[midIndexArray.length - 1];
          lowPower = attDefType == 'defender' ? armies[low][3] : armies[low][2];
        } else {
          high = midIndexArray[0];
          highPower =
            attDefType == 'defender' ? armies[high][3] : armies[high][2];
        }
      }
      let bestArmy = armies[high];
      let bestPower = attDefType == 'attacker' ? bestArmy[2] : bestArmy[3];
      bestPower = bestPower * 1.0 - 2;
      console.log('bestArmy', bestArmy);
      console.log('iterations', iter);
      armies.sort((a: any[], b: any[]) => {
        const av: number =
          attDefType == 'attacker' ? Number(a[2]) : Number(a[3]);
        const bv: number =
          attDefType == 'attacker' ? Number(b[2]) : Number(b[3]);
        const acost: number = av >= bestPower ? 0 : 1;
        const bcost: number = bv >= bestPower ? 0 : 1;
        if (acost != bcost) {
          return acost - bcost;
        } else {
          return Number(a[1]) - Number(b[1]);
        }
      });
      console.log('sorted 2');
      for (let i = 0; i < armies.length; i++) {
        console.log(i, JSON.stringify(armies[i]));
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
        console.log(iter, 'iter');
        //console.log(myinput.wave_info[0].attack.units);
        //console.log(myinput.wave_info[0].defense.units);
        //console.log(output);
        const survive =
          attDefType == 'defender'
            ? output.defense.survives[0]
            : output.attack.survives[0];
        if (survive >= surviveThreshold) {
          bestArmy = armies[i];
          break;
        }
      }

      armyRecommendOutput.recommendations = {
        army: bestArmy[0],
        cost: bestArmy[1],
      };
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
      console.log(myinput);
      console.log(output);

      break;
    case 'linearSearch':
    case 'gridSearch': {
      const maxUnits = maxArmy;

      const mymap: Map<string, number> = new Map();
      let callCount = 0;
      function getArmy(vars: number[]): Army {
        // vars: [inf, art, arm, fig, bom, aa]

        const army: Army =
          attDefType == 'defender'
            ? {
                inf: Math.round(vars[0]),
                art: Math.round(vars[1]),
                arm: Math.round(vars[2]),
                fig: Math.round(vars[3]),
                bom: Math.round(vars[4]),
                aa: Math.round(vars[5]),
              }
            : {
                inf: Math.round(vars[0]),
                art: Math.round(vars[1]),
                arm: Math.round(vars[2]),
                fig: Math.round(vars[3]),
                bom: Math.round(vars[4]),
                bat: Math.round(vars[5]),
                cru: Math.round(vars[6]),
              };
        return army;
      }
      function armyCostObjective(vars: number[]): number {
        let key = JSON.stringify(vars);
        let retval = mymap.get(key);
        if (retval != undefined) {
          return retval;
        }
        callCount++;
        let t0 = performance.now();
        retval = armyCostObjectiveHelper(vars);
        let t1 = performance.now() - t0;
        //console.log(callCount, t1, vars, retval, 'call objective');
        mymap.set(key, retval);
        return retval;
      }
      function armyCostObjectiveHelper(vars: number[]): number {
        // vars: [inf, art, arm, fig, bom, aa]
        const army: Army = getArmy(vars);
        if (attDefType == 'defender') {
          input.wave_info[0].defense.units = army;
        } else {
          input.wave_info[0].attack.units = army;
        }

        const output = multiwaveExternal(input);
        const survive =
          attDefType == 'defender'
            ? output.defense.survives[0]
            : output.attack.survives[0];
        const cost = getArmyCost(army);

        let overflow = 0;
        for (const [uid, count] of Object.entries(army)) {
          if (count < 0) {
            overflow += -count;
          }
          let max = maxUnits[<UnitIdentifier>uid] ?? 0;
          if (count > max) {
            overflow += count;
          }
        }
        if (overflow > 0) {
          return cost + 500 * overflow;
        }

        // Penalty if constraint not met
        if (survive < surviveThreshold) {
          return cost + 1000000 * (surviveThreshold - survive); // Large penalty
        }
        return cost;
      }

      // Initial guess (e.g., max units)
      const numInf: number = maxArmy['inf'] ?? 0;
      const numArt: number = maxArmy['art'] ?? 0;
      const numArm: number = maxArmy['arm'] ?? 0;
      const numFig: number = maxArmy['fig'] ?? 0;
      const numBom: number = maxArmy['bom'] ?? 0;
      const numCru: number = maxArmy['cru'] ?? 0;
      const numBat: number = maxArmy['bat'] ?? 0;
      const numAA: number = maxArmy['aa'] ?? 0;

      const initial: number[] =
        attDefType == 'defender'
          ? [numInf, numArt, numArm, numFig, numBom, numAA]
          : [numInf, numArt, numArm, numFig, numBom, numBat, numCru];
      const bounds: [number, number][] =
        attDefType == 'defender'
          ? [
              [0, numInf],
              [0, numArt],
              [0, numArm],
              [0, numFig],
              [0, numBom],
              [0, numAA],
            ]
          : [
              [0, numInf],
              [0, numArt],
              [0, numArm],
              [0, numFig],
              [0, numBom],
              [0, numBat],
              [0, numCru],
            ];

      // Example Usage
      const initialGuess = initial;
      console.log(initialGuess, 'initialGuess');
      console.log(bounds, 'bounds');
      const finalParams: Vector =
        solveType == 'gridSearch'
          ? gridSearch(armyCostObjective, bounds)
          : lineSearch(armyCostObjective, initialGuess, bounds, 5);

      console.log('Optimized Integer Parameters:', finalParams);
      console.log('Minimum value found:', armyCostObjective(finalParams));
      console.log(mymap.size, 'map size');
      const bestArmy = getArmy(finalParams);
      const cost = getArmyCost(bestArmy);
      armyRecommendOutput.recommendations = { army: bestArmy, cost: cost };

      break;
    }
  }
  console.log(process.memoryUsage());
  return armyRecommendOutput;
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
    gradients[j] =
      xplus > xminus ? (fPlusDelta - fMinusDelta) / (xplus - xminus) : 0;

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
): Vector {
  let range: Number[][] = [];
  for (let i = 0; i < x.length; i++) {
    let minval = bound[i][0];
    let maxval = bound[i][1];
    let min = x[i] > 0 ? Math.max(x[i] - delta, minval) : 0;
    let max = x[i] > 0 ? Math.min(x[i] + delta, maxval) : 0;
    let v = getIntegersInRange(min, max, 1);
    range.push(v);
  }
  //console.log(range, "range");
  let combinations = getCombinations(range);
  //console.log(combinations, "combinations");
  //console.log(combinations.length, "combinations");
  let miny = objectiveFn(x);
  let minx = x;
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    //console.log(x1, y1, "x1, y1")
    if (y1 < miny) {
      miny = y1;
      minx = x1;
    }
  }

  //console.log(minx, miny, "minx, miny")
  return minx;
}
function doGridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number, number][],
): Vector {
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
  console.log(combinations.length, 'combinations');
  let miny = undefined;
  let minx: Vector = [];
  for (let i = 0; i < combinations.length; i++) {
    const x1 = combinations[i] as Vector;
    const y1 = objectiveFn(x1);
    //console.log(x1, y1, "x1, y1")
    if (miny == undefined || y1 < miny) {
      miny = y1;
      minx = x1;
    }
  }

  //console.log(minx, miny, "minx, miny")
  return minx;
}
function gridSearch(
  objectiveFn: ObjectiveFunction,
  bound: [number, number][],
): Vector {
  let currBound: [number, number, number][] = [];
  for (let i = 0; i < bound.length; i++) {
    let low = bound[i][0];
    let high = bound[i][1];
    let step = Math.max(Math.ceil((high - low) / 3), 1);
    currBound.push([low, high, step]);
  }
  console.log(currBound, 'currBound');
  let best = doGridSearch(objectiveFn, currBound);

  for (let i = 0; i < 10; i++) {
    let prevBound = currBound.slice();

    currBound = [];
    let stop = true;
    for (let i = 0; i < best.length; i++) {
      let oldstep = prevBound[i][2];
      let low = Math.max(best[i] - oldstep, bound[i][0]);
      let high = Math.min(best[i] + oldstep, bound[i][1]);
      let step = Math.max(Math.floor((high - low) / 3), 1);
      if (step > 1) {
        stop = false;
      }
      currBound.push([low, high, step]);
    }
    console.log(currBound, 'currBound');
    best = doGridSearch(objectiveFn, currBound);
    if (stop) {
      break;
    }
  }

  return best;
}
function lineSearch(
  objectiveFn: ObjectiveFunction,
  x: Vector,
  bound: [number, number][],
  numIterations: number,
): Vector {
  let x0 = x.slice();
  for (let i = 0; i < numIterations; i++) {
    let gradientAtX = approximateGradient(x0, bound, 1.0, objectiveFn);

    // negative gradient
    let direction: Vector = gradientAtX.map((val, i) =>
      val > 0 ? -val : -val,
    );
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
    let stepSize = backtrackingLineSearch(
      objectiveFn,
      x0,
      bound,
      direction,
      0.5,
      0.5,
      2.0,
    );
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
      let xNew = doNeighborSearch(objectiveFn, x0, bound, 8);
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
      console.log(i, x0, 'neighbor search');
      continue;
    }
    x0 = newX;
    console.log(i, x0, direction, stepSize, newX);
  }
  return x0;
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
    let xNew: Vector = x.map((val, i) =>
      Math.round(val + stepSize * direction[i]),
    );
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
