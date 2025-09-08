import { general_problem, epsilon } from './solve.js';
import {
  get_general_cost_remain,
  unit_manager,
  unit_group,
  general_unit_group,
  hasLand,
} from './unitgroup.js';

export function report_filter(threshold: number, p: number): number {
  if (p < threshold) {
    return 0;
  }
  return p;
}

export function collect_results(parent_prob: general_problem): result_data_t[] {
  const problem = parent_prob;
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;

  const resultArr: result_data_t[] = [];

  let att_cost, def_cost;

  const NN_base = get_general_cost_remain(
    parent_prob.um,
    parent_prob.att_data,
    0,
  );
  const MM_base = get_general_cost_remain(
    parent_prob.um,
    parent_prob.def_data,
    0,
  );
  const max_cost = NN_base + MM_base;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      //let p = report_filter(P[i][j]);
      const p = report_filter(
        problem.report_prune_threshold,
        problem.getP(i, j),
      );
      if (p > 0) {
        att_cost = get_general_cost_remain(problem.um, problem.att_data, i);
        def_cost = get_general_cost_remain(problem.um, problem.def_data, j);
        const i2 =
          problem.att_data.nodeArr[i].N - problem.att_data.nodeArr[i].numBB;
        const j2 =
          problem.def_data.nodeArr[j].N - problem.def_data.nodeArr[j].numBB;
        const cost = j2 - i2 + (def_cost - att_cost) / max_cost;

        const attcascost = NN_base - att_cost;
        const defcascost = MM_base - def_cost;
        const cost2 = -defcascost + attcascost;
        const dzcost =
          problem.is_deadzone && problem.def_data.nodeArr[j].N == 0
            ? problem.att_data.nodeArr[i].deadzone_cost
            : 0;
        const takes =
          problem.def_data.nodeArr[j].N == 0 &&
          problem.att_data.nodeArr[i].hasLand;
        const territoryValue = takes ? problem.territory_value : 0;
        const cost3 =
          parent_prob.sortMode == 'unit_count'
            ? cost
            : cost2 + dzcost - territoryValue;

        const data = new result_data_t(i, j, cost3, p);
        resultArr.push(data);
      }
    }
  }
  return resultArr;
}

function get_general_group_string(
  um: unit_manager,
  group: general_unit_group,
  sz: number,
): [string, string] {
  let out = '';
  const node = group.nodeArr[sz];
  if (node.retreat.length > 0) {
    out += node.retreat;
  }
  let out1 = '';
  for (const ch of node.unit_str) {
    if (ch == '') {
      continue;
    }
    const stat = um.get_stat(ch);
    out1 += stat.ch2;
  }
  return [out1, out];
}

export function get_reduced_group_string(input: string): string {
  const map: Map<string, number> = new Map();

  for (const char of input) {
    const v = map.get(char);
    if (v != undefined) {
      map.set(char, v + 1);
    } else {
      map.set(char, 1);
    }
  }

  let out = '';
  map.forEach((value: number, key: string) => {
    out = out + value + key + ', ';
  });
  return out.substring(0, out.length - 2);
}
/*
export function get_external_unit_str(um : unit_manager, input : string) :
        string
{
// stat
    let map : Map<string, number> = new Map();

    for (var char of input) {
        let v = map.get(char);
        if (v != undefined) {
            map.set(char, v + 1);
        } else {
            map.set(char, 1);
        }
    }

    let out = ""
    map.forEach((value : number, key : string) => {
        let stat = um.get_stat(key);
        
        out = out + value + " " + stat.fullname + ", "
    })
    return out.substring(0, out.length - 2);
}
*/
function get_cost(
  um: unit_manager,
  group: unit_group,
  ii: number,
  cas: string = '',
  skipBombard: boolean = false,
): [number, string] {
  const N = group.tbl_size;
  let cost = 0;
  let i;
  let out: string = '';
  for (i = ii; i < N; i++) {
    const ch = group.unit_str.charAt(i);
    if (ch == '') {
      continue;
    }
    if (skipBombard) {
      const stat = um.get_stat(ch);
      if (stat.isBombard) {
        continue;
      }
    }

    const stat = um.get_stat(ch);
    cost += stat.cost;
    out = out + stat.ch2;
  }
  for (const ch of cas) {
    if (ch == '') {
      continue;
    }
    const stat = um.get_stat(ch);
    cost += stat.cost;
    out = out + stat.ch2;
  }
  return [cost, out];
}
interface naval_cost {
  cost: number;
  casualty: string;
}
export function get_general_cost(
  problem: general_problem,
  group: general_unit_group,
  ii: number,
): naval_cost {
  let skipBombard = false;
  if (!problem.is_naval && group.attdef == 0) {
    skipBombard = true;
  }
  const node = group.nodeArr[ii];
  const mymap: Map<string, number> = new Map();
  const units_remain = node.unit_str + node.retreat;
  const baseunits = group.nodeArr[0].unit_str;

  for (const ch of baseunits) {
    const stat = problem.um.get_stat(ch);
    const ch2 = stat.ch2;
    const cnt = mymap.get(ch2);
    if (cnt == undefined) {
      mymap.set(ch2, 1);
    } else {
      mymap.set(ch2, cnt + 1);
    }
  }

  for (const ch of units_remain) {
    const stat = problem.um.get_stat(ch);
    const ch2 = stat.ch2;
    const cnt = mymap.get(ch2);
    if (cnt == undefined) {
      console.log('fatal');
      throw new Error();
    } else {
      mymap.set(ch2, cnt - 1);
    }
  }

  let casualty = '';
  let cost = 0;
  for (const [ch2, cnt] of mymap) {
    const stat = problem.um.get_stat(ch2);
    if (skipBombard && stat.isBombard) {
      continue;
    }
    cost += stat.cost * cnt;
    for (let i = 0; i < cnt; i++) {
      casualty += ch2;
    }
  }

  return { cost: cost, casualty: casualty };
}

export function print_general_results(
  baseproblem: general_problem,
  resultArr: result_data_t[],
): aacalc_output {
  const problem = baseproblem;

  if (baseproblem.verbose_level > 2) {
    console.log(resultArr.length, `number of results`);
  }

  const sortedArr = resultArr.sort((n1, n2) => {
    const r1 = n1.cost;
    const r2 = n2.cost;
    if (Math.abs(r1 - r2) < epsilon) {
      return 0;
    } else if (r1 < r2) {
      return -1;
    } else {
      return 1;
    }
  });

  const mergedArr = sortedArr;

  let att: string;
  let def: string;
  let retreat_att: string;
  let retreat_def: string;
  let red_att: string;
  let red_def: string;
  let red_att_cas: string;
  let red_def_cas: string;

  [att, retreat_att] = get_general_group_string(
    baseproblem.um,
    baseproblem.att_data,
    0,
  );
  [def, retreat_def] = get_general_group_string(
    baseproblem.um,
    baseproblem.def_data,
    0,
  );
  red_att = get_reduced_group_string(att);
  red_def = get_reduced_group_string(def);
  if (baseproblem.verbose_level > 2) {
    console.log(`attackers = ${att}`);
    console.log(`defenders = ${def}`);
    console.log(`attackers = ${red_att}`);
    console.log(`defenders = ${red_def}`);
  }

  let sum = 0.0;

  let attsurvive = 0;
  let defsurvive = 0;
  for (let ii = 0; ii < mergedArr.length; ii++) {
    const result = mergedArr[ii];
    const p = result.p;
    sum += p;
    result.cumm = sum;
    if (
      get_general_cost_remain(baseproblem.um, problem.att_data, result.i) > 0
    ) {
      attsurvive += p;
    }
    if (
      get_general_cost_remain(baseproblem.um, problem.def_data, result.j) > 0
    ) {
      defsurvive += p;
    }
  }
  sum = 0.0;
  for (let ii = mergedArr.length - 1; ii >= 0; ii--) {
    const result = mergedArr[ii];
    const p = result.p;
    sum += p;
    result.rcumm = sum;
  }

  const casualties: casualty_2d[] = [];

  // accumulate attacker and defender maps.
  const att_map: Map<number, number> = new Map();
  const att_retreat_map: Map<number, number> = new Map(); // for retreating units
  const def_map: Map<number, number> = new Map();

  const profitDist: ProfitDistribution = {};

  let totalattloss = 0;
  let totaldefloss = 0;
  let takes = 0;
  for (let ii = 0; ii < mergedArr.length; ii++) {
    const result = mergedArr[ii];
    const problem = baseproblem;
    [att, retreat_att] = get_general_group_string(
      problem.um,
      problem.att_data,
      result.i,
    );
    [def, retreat_def] = get_general_group_string(
      problem.um,
      problem.def_data,
      result.j,
    );
    const red_retreat_att = get_reduced_group_string(retreat_att);
    const red_retreat_def = get_reduced_group_string(retreat_def);
    red_att = get_reduced_group_string(att);
    red_def = get_reduced_group_string(def);
    const att_naval_cost = get_general_cost(
      problem,
      problem.att_data,
      result.i,
    );
    const def_naval_cost = get_general_cost(
      problem,
      problem.def_data,
      result.j,
    );
    red_att_cas = get_reduced_group_string(att_naval_cost.casualty);
    red_def_cas = get_reduced_group_string(def_naval_cost.casualty);
    const p = report_filter(problem.report_prune_threshold, result.p);
    const d_p = def_map.get(result.j);
    if (d_p == undefined) {
      def_map.set(result.j, p);
    } else {
      def_map.set(result.j, d_p + p);
    }
    // separate attackers into retreat and survives catetories
    if (def.length > 0) {
      const a_p = att_retreat_map.get(result.i);
      if (a_p == undefined) {
        att_retreat_map.set(result.i, p);
      } else {
        att_retreat_map.set(result.i, a_p + p);
      }
    } else {
      const a_p = att_map.get(result.i);
      if (a_p == undefined) {
        att_map.set(result.i, p);
      } else {
        att_map.set(result.i, a_p + p);
      }
    }
    if (p > 0) {
      let attloss = att_naval_cost.cost;
      const defloss = def_naval_cost.cost;
      if (
        !baseproblem.is_naval &&
        hasLand(problem.um, att) &&
        def.length == 0
      ) {
        takes += p;
        attloss -= problem.territory_value;
        //totalattloss -= problem.territory_value * p;
        if (baseproblem.is_deadzone) {
          const attnode = baseproblem.att_data.nodeArr[result.i];
          attloss += attnode.deadzone_cost;
          //totalattloss += attnode.deadzone_cost * p;
        }
      }
      totalattloss += attloss * p;
      totaldefloss += defloss * p;
      if (baseproblem.verbose_level > 2) {
        //console.log(`result:  P[%d][%d] ${red_att} vs. ${red_def} = ${p} cumm(${result.cumm}) rcumm(${result.rcumm}) (${result.cost})`, result.i, result.j);
        const att_loss = attloss;
        const def_loss = defloss;
        console.log(
          `result:  P[%d][%d] ${red_att}:${red_retreat_att} vs. ${red_def}:${red_retreat_def} (loss ${red_att_cas} ${att_loss} vs. ${red_def_cas} ${def_loss})= ${p} cumm(${result.cumm}) rcumm(${result.rcumm}) (${result.cost})`,
          result.i,
          result.j,
        );
      }
      const cas: casualty_2d = {
        attacker: red_att,
        defender: red_def,
        attacker_retreat: red_retreat_att,
        defender_retreat: red_retreat_def,
        attacker_casualty: red_att_cas,
        defender_casualty: red_def_cas,
        prob: p,
      };
      casualties.push(cas);

      const profit: number = defloss - attloss;
      const profitInfo: ProfitInfo = {
        ipc: profit,
        prob: p,
      };
      if (profitDist[profit] == undefined) {
        profitDist[profit] = profitInfo;
      } else {
        profitDist[profit].prob += p;
      }
    }
  }

  const att_cas_1d: casualty_1d[] = [];
  const def_cas_1d: casualty_1d[] = [];

  for (const [i, p] of att_map) {
    //console.log(i, p, "i, p");
    const [att, retreat_att] = get_general_group_string(
      baseproblem.um,
      baseproblem.att_data,
      i,
    );
    const att_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.att_data,
      i,
    );
    const att_cas = att_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: att,
      retreat: retreat_att,
      casualty: att_cas,
      prob: p,
    };
    att_cas_1d.push(cas);
  }
  for (const [i, p] of att_retreat_map) {
    //console.log(i, p, "i, p");
    const [att, retreat_att] = get_general_group_string(
      baseproblem.um,
      baseproblem.att_data,
      i,
    );
    const att_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.att_data,
      i,
    );
    const att_cas = att_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: '',
      retreat: retreat_att + att,
      casualty: att_cas,
      prob: p,
    };
    att_cas_1d.push(cas);
  }
  //console.log("att_cas_1d", JSON.stringify(att_cas_1d, null, 4));
  for (const [j, p] of def_map) {
    //console.log(j, p, "j, p");
    const [def, retreat_def] = get_general_group_string(
      baseproblem.um,
      baseproblem.def_data,
      j,
    );
    const def_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.def_data,
      j,
    );
    const def_cas = def_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: def,
      retreat: retreat_def,
      casualty: def_cas,
      prob: p,
    };
    def_cas_1d.push(cas);
  }
  //console.log("def_cas_1d", JSON.stringify(def_cas_1d, null, 4));
  //console.log(casualties);
  const output: aacalc_output = {
    attack: { survives: [attsurvive, 0, 0], ipcLoss: [totalattloss, 0, 0] },
    defense: { survives: [defsurvive, 0, 0], ipcLoss: [totaldefloss, 0, 0] },
    casualtiesInfo: casualties,
    att_cas: att_cas_1d,
    def_cas: def_cas_1d,
    profitDistribution: profitDist,
    rounds: baseproblem.average_rounds,
    takesTerritory: [takes, 0, 0],
  };

  return output;
}
export function collect_and_print_results(problem: general_problem) {
  const result_data = collect_results(problem);
  const out = print_general_results(problem, result_data);
  console.log(out);
}
interface aacalc_info {
  survives: number[];
  ipcLoss: number[];
}

export interface casualty_2d {
  attacker: string;
  defender: string;
  attacker_retreat: string;
  defender_retreat: string;
  attacker_casualty: string;
  defender_casualty: string;
  prob: number;
}

export interface casualty_1d {
  remain: string;
  retreat: string;
  casualty: string;
  prob: number;
}

export interface ProfitInfo {
  ipc: number;
  prob: number;
}
export type ProfitDistribution = Record<number, ProfitInfo>; // key: ipc value: probability

export interface aacalc_output {
  attack: aacalc_info;
  defense: aacalc_info;
  casualtiesInfo: casualty_2d[];
  att_cas: casualty_1d[];
  def_cas: casualty_1d[];
  profitDistribution: ProfitDistribution;
  rounds: number;
  takesTerritory: number[];
}
export class result_data_t {
  i: number;
  j: number;
  cost: number;
  p: number;
  cumm: number = 0;
  rcumm: number = 0;

  constructor(i: number, j: number, cost: number, p: number) {
    this.i = i;
    this.j = j;
    this.p = p;
    this.cost = cost;
  }
}
