import { type DiceMode, type SortMode, type PwinMode } from './solve.js';
import { type ProfitDistribution, type aacalc_output } from './output.js';
import { get_cost_from_str } from './unitgroup.js';
import { hasLand } from './unitgroup.js';
import { unit_manager } from './unitgroup.js';
import { count_units } from './preparse.js';
import { apply_ool } from './multiwave.js';
import { type wave_input } from './multiwave.js';
import { type multiwave_input } from './multiwave.js';
import { multiwave } from './multiwave.js';
import { sbr, type sbr_input } from './sbr.js';
import { multiwaveMultiEval } from './multieval.js';
import { type multieval_input } from './multieval.js';
import { type multieval_output } from './multieval.js';

export type UnitIdentifier =
  | 'aa'
  | 'inf'
  | 'art'
  | 'arm'
  | 'fig'
  | 'bom'
  | 'sub'
  | 'tra'
  | 'des'
  | 'cru'
  | 'acc'
  | 'bat'
  | 'bat1'
  | 'dbat'
  | 'ic'
  | 'inf_a'
  | 'art_a'
  | 'arm_a';

export type Army = Partial<Record<UnitIdentifier, number>>;

export const UnitIdentifier2UnitMap: Record<UnitIdentifier, string> = {
  aa: 'c',
  inf: 'i',
  art: 'a',
  arm: 't',
  fig: 'f',
  bom: 'b',
  sub: 'S',
  tra: 'T',
  des: 'D',
  cru: 'C',
  acc: 'A',
  bat: 'B',
  dbat: 'F',
  ic: 'p',
  inf_a: 'j',
  art_a: 'g',
  arm_a: 'u',
  bat1: 'B',
};

export const Unit2UnitIdentifierMap = new Map<string, UnitIdentifier>([
  ['c', 'aa'],
  ['i', 'inf'],
  ['a', 'art'],
  ['t', 'arm'],
  ['f', 'fig'],
  ['b', 'bom'],
  ['S', 'sub'],
  ['D', 'des'],
  ['C', 'cru'],
  ['A', 'acc'],
  ['B', 'bat'],
  ['E', 'bat'],
  ['d', 'inf'],
  ['T', 'tra'],
  ['e', 'aa'],
  ['F', 'dbat'],
  ['g', 'art_a'],
  ['j', 'inf_a'],
  ['u', 'arm_a'],
  ['p', 'ic'],
]);

export const Unit2ExternalNameMap = new Map<string, string>([
  ['c', 'AA'],
  ['i', 'Inf'],
  ['a', 'Art'],
  ['t', 'Arm'],
  ['f', 'Fig'],
  ['b', 'Bom'],
  ['S', 'Sub'],
  ['D', 'Des'],
  ['C', 'Cru'],
  ['A', 'ACC'],
  ['B', 'Bat'] /* ["E", "Bat"], intentional */,
  ['d', 'Inf'],
  ['T', 'Tra'],
  ['e', 'AA'],
  ['F', 'DBat'],
  ['g', 'Art*'],
  ['j', 'Inf*'],
  ['u', 'Arm*'],
  ['p', 'IPC'],
]);

export interface UnitGroup {
  units: Army;
  ool: UnitIdentifier[]; // units as above
  takes: number; // number of land unto take as attacker
  aaLast: boolean; // aa last as defender
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

export interface MultiEvalInput extends MultiwaveInput {
  attackerList: Army[];
  defenderList: Army[];
}

export interface SbrInput {
  attack: UnitGroup;
  defense: UnitGroup;
  verbose_level: number;
  diceMode: DiceMode;
  in_progress: boolean;
  pruneThreshold: number;
  reportPruneThreshold: number;
}

export type Side = 'attack' | 'defense';
export type CasualtiesInfo = Record<Side, Record<string, CasualtyInfo>>;
// wave, side, casualty details string -> casualty info
export type CasualtiesInfoArr = Record<
  number,
  Record<Side, Record<string, CasualtyInfo>>
>;

export interface CasualtyInfo {
  casualties: string;
  survivors: string;
  retreaters: string;
  amount: number;
  ipcLoss: number;
}

export interface CalcInfo {
  survives: number[];
  ipcLoss: number[];
  incrementalLoss: number[];
  cumulativeIpcLoss: number[];
}

export interface MultiwaveOutput {
  attack: CalcInfo;
  defense: CalcInfo;
  casualtiesInfo: CasualtiesInfo;
  casualtiesInfoArr: CasualtiesInfoArr; // wave by wave casualties info
  profitDistribution: ProfitDistribution[]; // wave by wave profit distribution
  takesTerritory: number[];
  rounds: number[];
  waves: number;
  complexity: number;
}

export type MultiEvalOutput = multieval_output;

export interface UnitStats {
  cost: number;
  att: number;
  def: number;
  hits: number;
}

export type UnitStatsMap = Record<UnitIdentifier, UnitStats>;

// Export unit stats lookup table for frontend
export function getUnitStatsMap(): UnitStatsMap {
  const um = new unit_manager(0, false);
  const stats: Partial<UnitStatsMap> = {};

  const unitIds: UnitIdentifier[] = [
    'aa',
    'inf',
    'art',
    'arm',
    'fig',
    'bom',
    'sub',
    'tra',
    'des',
    'cru',
    'acc',
    'bat',
    'bat1',
    'dbat',
    'ic',
    'inf_a',
    'art_a',
    'arm_a',
  ];

  for (const id of unitIds) {
    const ch = UnitIdentifier2UnitMap[id];
    if (ch) {
      try {
        const stat = um.get_stat(ch);
        stats[id] = {
          cost: stat.cost,
          att: stat.att,
          def: stat.def,
          hits: stat.hits,
        };
      } catch {
        // Skip units that don't exist
      }
    }
  }

  return stats as UnitStatsMap;
}

interface unit_counts {
  num_air: number;
  num_subs: number;
  num_naval: number;
  num_aa: number;
  N: number;
}

// complexity is too large -- caller should fallback to monte carlo
export function multiwaveTooComplex(input: MultiwaveInput): boolean {
  const complexity = multiwaveComplexityFastV2(input);
  if (complexity > 120000) {
    return true;
  }
  return false;
}

export function multiwaveComplexityFastV2(input: MultiwaveInput): number {
  let attacker_counts: unit_counts = {
    num_air: 0,
    num_subs: 0,
    num_naval: 0,
    num_aa: 0,
    N: 0,
  };
  let defender_counts: unit_counts = {
    num_air: 0,
    num_subs: 0,
    num_naval: 0,
    num_aa: 0,
    N: 0,
  };
  let complexitySum: number = 0;
  let prev_defense_ool: string = '';
  let prev_defense_aaLast: boolean = false;
  let complexityMax: number = 0;

  for (let i = 0; i < input.wave_info.length; i++) {
    const wave = input.wave_info[i];
    if (!wave) {
      continue; // Skip undefined or null waves
    }
    const att_unit_group_string = make_unit_group_string(
      wave.attack.units,
      wave.attack.ool,
      wave.attack.takes,
      false,
      input.is_naval,
      input.verbose_level,
    );
    const def_unit_group_string = make_unit_group_string(
      wave.defense.units,
      wave.defense.ool,
      0,
      wave.defense.aaLast,
      input.is_naval,
      input.verbose_level,
    );
    // attacker
    attacker_counts.num_subs = count_units(att_unit_group_string.unit, 'S');
    attacker_counts.num_air =
      count_units(att_unit_group_string.unit, 'f') +
      count_units(att_unit_group_string.unit, 'b');
    attacker_counts.num_naval =
      att_unit_group_string.unit.length -
      attacker_counts.num_subs -
      attacker_counts.num_air;
    attacker_counts.num_aa = count_units(att_unit_group_string.unit, 'c');

    let subs = count_units(def_unit_group_string.unit, 'S');
    let air =
      count_units(def_unit_group_string.unit, 'f') +
      count_units(def_unit_group_string.unit, 'b');
    let naval = def_unit_group_string.unit.length - subs - air;

    defender_counts.num_subs += subs;
    defender_counts.num_air += air;
    defender_counts.num_naval += naval;
    defender_counts.num_aa += count_units(def_unit_group_string.unit, 'c');

    attacker_counts.N =
      attacker_counts.num_air +
      attacker_counts.num_subs +
      attacker_counts.num_naval;
    defender_counts.N =
      defender_counts.num_air +
      defender_counts.num_subs +
      defender_counts.num_naval;
    let defenseOOLComplexity: number =
      i == 0
        ? 1
        : def_unit_group_string.ool == prev_defense_ool &&
            wave.defense.aaLast == prev_defense_aaLast
          ? 1
          : Math.max(defender_counts.num_aa, 3);
    defenseOOLComplexity = 1;
    let numAAShots = defender_counts.num_aa * 3;
    if (attacker_counts.num_air < numAAShots) {
      numAAShots = attacker_counts.num_air;
    }
    let attacker_complexity = input.is_naval
      ? attacker_counts.N * (attacker_counts.num_air + 1)
      : attacker_counts.N * (numAAShots + 1);
    let defender_complexity = input.is_naval
      ? defender_counts.N * (defender_counts.num_air + 1)
      : defender_counts.N;
    defender_complexity *= defenseOOLComplexity;
    let complexity = attacker_complexity * defender_complexity;
    if (input.verbose_level > 2) {
      console.log(
        i,
        attacker_complexity,
        defender_complexity,
        attacker_complexity * defender_complexity,
        'attack, defense, att * def',
      );
      console.log(attacker_counts, defender_counts, 'att counts, def_counts');
    }
    complexitySum += complexity;
    complexityMax = Math.max(complexityMax, complexity);
    prev_defense_ool = def_unit_group_string.ool;
    prev_defense_aaLast = wave.defense.aaLast;
  }
  return complexityMax;
}

export function multiwaveComplexity(input: MultiwaveInput): number {
  const complexityInput: MultiwaveInput = {
    wave_info: input.wave_info,
    debug: input.debug,
    prune_threshold: input.prune_threshold,
    report_prune_threshold: input.report_prune_threshold,
    is_naval: input.is_naval,
    in_progress: input.in_progress,
    num_runs: input.num_runs,
    verbose_level: input.verbose_level,
    diceMode: input.diceMode,
    sortMode: input.sortMode,
    is_deadzone: input.is_deadzone,
    report_complexity_only: input.report_complexity_only,
    do_roundless_eval: input.do_roundless_eval,
    territory_value: input.territory_value,
    retreat_round_zero: input.retreat_round_zero,
  };
  complexityInput.report_complexity_only = true; // only report complexity
  const output = multiwaveExternal(complexityInput);
  return output.complexity;
}

export function getInternalInput(input: MultiwaveInput): multiwave_input {
  const wavearr: wave_input[] = [];
  const do_roundless_eval = input.do_roundless_eval ?? true;
  for (let i = 0; i < input.wave_info.length; i++) {
    const wave = input.wave_info[i];
    if (!wave) {
      continue; // Skip undefined or null waves
    }

    const att_unit_group_string = make_unit_group_string(
      wave.attack.units,
      wave.attack.ool,
      wave.attack.takes,
      false,
      input.is_naval,
      input.verbose_level,
    );
    const def_unit_group_string = make_unit_group_string(
      wave.defense.units,
      wave.defense.ool,
      0,
      wave.defense.aaLast,
      input.is_naval,
      input.verbose_level,
    );

    let rounds = wave.rounds;
    if (do_roundless_eval && rounds == 100) {
      rounds = 0;
    }

    if (input.is_naval && wave.retreat_strafe_threshold != undefined) {
      throw new Error('is_naval && retreat_strafe_threshold is not allowed');
    }
    if (
      input.is_naval &&
      wave.retreat_lose_air_probability != undefined &&
      wave.retreat_lose_air_probability < 1.0
    ) {
      throw new Error(
        'is_naval && retreat_lose_air_probability < 1.0 is not allowed',
      );
    }

    const internal_wave = {
      attacker: att_unit_group_string.unit,
      defender: def_unit_group_string.unit,
      def_ool: def_unit_group_string.ool,
      def_aalast: wave.defense.aaLast,
      att_submerge: wave.att_submerge,
      def_submerge: wave.def_submerge,
      att_dest_last: wave.att_dest_last,
      def_dest_last: wave.def_dest_last,
      is_crash_fighters: wave.is_crash_fighters,
      rounds: rounds,
      retreat_threshold: wave.retreat_threshold,
      retreat_lose_air_probability: wave.retreat_lose_air_probability ?? 1.0, // default to 1.0 if not provided
      retreat_expected_ipc_profit_threshold:
        wave.retreat_expected_ipc_profit_threshold,
      retreat_pwin_threshold: wave.retreat_pwin_threshold,
      pwinMode: wave.pwinMode ?? 'takes', // default to 'takes' if not provided
      retreat_strafe_threshold: wave.retreat_strafe_threshold,
      use_attackers_from_previous_wave:
        wave.use_attackers_from_previous_wave ?? false, // default to false if not provided
    };

    wavearr.push(internal_wave);
  }

  const internal_input: multiwave_input = {
    verbose_level: input.verbose_level,
    wave_info: wavearr,
    debug: input.debug,
    prune_threshold: input.prune_threshold,
    report_prune_threshold: input.report_prune_threshold,
    is_naval: input.is_naval,
    in_progress: input.in_progress,
    is_deadzone: input.is_deadzone ?? false, // default to false if not provided
    report_complexity_only: input.report_complexity_only ?? false, // default to false if not provided
    do_roundless_eval: do_roundless_eval,
    territory_value: input.territory_value ?? 0, // default to 0 if not provided
    retreat_round_zero: input.retreat_round_zero ?? true, // default to true if not provided
    diceMode: input.diceMode,
    sortMode: input.sortMode == undefined ? 'ipc_cost' : input.sortMode,
    num_runs: input.num_runs,
  };

  return internal_input;
}

function mergeUnitStrings(str1: string, str2: string): string {
  if (!str1) return str2;
  if (!str2) return str1;
  const counts: Record<string, number> = {};
  for (const s of [str1, str2]) {
    for (const part of s.split(', ')) {
      const match = part.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const name = match[2]!;
        counts[name] = (counts[name] || 0) + parseInt(match[1]!, 10);
      }
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => `${count} ${name}`)
    .join(', ');
}

function addToMap(
  map: Record<string, CasualtyInfo>,
  key: string,
  info: CasualtyInfo,
): void {
  if (map[key] == undefined) {
    map[key] = { ...info };
  } else {
    map[key].amount += info.amount;
  }
}

function filterMapByThreshold(
  map: Record<string, CasualtyInfo>,
  threshold: number,
): Record<string, CasualtyInfo> {
  if (threshold <= 0) return map;
  return Object.fromEntries(
    Object.entries(map).filter(([, v]) => v.amount >= threshold),
  );
}

function splitAirLand(
  um: unit_manager,
  s: string,
): { air: string; land: string } {
  let air = '';
  let land = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (um.get_stat(ch).isAir) {
      air += ch;
    } else {
      land += ch;
    }
  }
  return { air, land };
}

function buildCasualtiesInfoArr(
  waveOutputs: aacalc_output[],
  verboseLevel: number,
  reportPruneThreshold: number,
): {
  casualtiesInfoArr: CasualtiesInfo[];
  profitDist: ProfitDistribution[];
} {
  const casualtiesInfoArr: CasualtiesInfo[] = [];
  const profitDist: ProfitDistribution[] = [];
  const um = new unit_manager(verboseLevel);

  for (let ii = 0; ii < waveOutputs.length; ii++) {
    casualtiesInfoArr[ii] = { attack: {}, defense: {} };
    const waveatt: Record<string, CasualtyInfo> = {};
    const wavedef: Record<string, CasualtyInfo> = {};
    const currOutput = waveOutputs[ii];
    if (currOutput == undefined) continue;

    for (let i = 0; i < currOutput.att_cas.length; i++) {
      const cas = currOutput.att_cas[i];
      const key =
        get_external_unit_str(um, cas.casualty) +
        ';' +
        get_external_unit_str(um, cas.remain) +
        ';' +
        get_external_unit_str(um, cas.retreat) +
        ';' +
        ii.toString();
      addToMap(waveatt, key, {
        casualties: get_external_unit_str(um, cas.casualty),
        survivors: get_external_unit_str(um, cas.remain),
        retreaters: get_external_unit_str(um, cas.retreat),
        amount: cas.prob,
        ipcLoss: get_cost_from_str(um, cas.casualty),
      });
    }

    for (let i = 0; i < currOutput.def_cas.length; i++) {
      const cas = currOutput.def_cas[i];
      const key =
        get_external_unit_str(um, cas.casualty) +
        ';' +
        get_external_unit_str(um, cas.remain) +
        ';' +
        get_external_unit_str(um, cas.retreat);
      addToMap(wavedef, key, {
        casualties: get_external_unit_str(um, cas.casualty),
        survivors: get_external_unit_str(um, cas.remain),
        retreaters: get_external_unit_str(um, cas.retreat),
        amount: cas.prob,
        ipcLoss: get_cost_from_str(um, cas.casualty),
      });
    }

    profitDist.push(currOutput.profitDistribution);
    casualtiesInfoArr[ii]['attack'] = filterMapByThreshold(
      waveatt,
      reportPruneThreshold,
    );
    casualtiesInfoArr[ii]['defense'] = filterMapByThreshold(
      wavedef,
      reportPruneThreshold,
    );
  }

  return { casualtiesInfoArr, profitDist };
}

function buildCumulativeCasualtiesInfo(
  waveOutputs: aacalc_output[],
  takesTerritory: number[],
  swapArr: number[],
  verboseLevel: number,
  reportPruneThreshold: number,
): CasualtiesInfo {
  const att: Record<string, CasualtyInfo> = {};
  const def: Record<string, CasualtyInfo> = {};
  const um = new unit_manager(verboseLevel);
  const lastIdx = waveOutputs.length - 1;

  interface PendingEntry {
    casualties: string;
    survivors: string;
    retreaters: string;
    ipcLoss: number;
    prob: number;
  }

  function totalP(arr: PendingEntry[]): number {
    return arr.reduce((s, p) => s + p.prob, 0);
  }

  function pushCrossMul(
    target: PendingEntry[],
    pending: PendingEntry[],
    entry: PendingEntry,
  ): void {
    if (pending.length === 0) {
      target.push(entry);
    } else {
      const tp = totalP(pending);
      for (const p of pending) {
        target.push({
          casualties: mergeUnitStrings(p.casualties, entry.casualties),
          survivors: entry.survivors,
          retreaters: mergeUnitStrings(p.retreaters, entry.retreaters),
          ipcLoss: p.ipcLoss + entry.ipcLoss,
          prob: (p.prob / tp) * entry.prob,
        });
      }
    }
  }

  function mapCrossMul(
    map: Record<string, CasualtyInfo>,
    pending: PendingEntry[],
    entry: PendingEntry,
  ): void {
    if (pending.length === 0) {
      addToMap(
        map,
        entry.casualties + ';' + entry.survivors + ';' + entry.retreaters,
        {
          casualties: entry.casualties,
          survivors: entry.survivors,
          retreaters: entry.retreaters,
          amount: entry.prob,
          ipcLoss: entry.ipcLoss,
        },
      );
    } else {
      const tp = totalP(pending);
      for (const p of pending) {
        const combinedCas = mergeUnitStrings(p.casualties, entry.casualties);
        const combinedRetreat = mergeUnitStrings(
          p.retreaters,
          entry.retreaters,
        );
        addToMap(
          map,
          combinedCas + ';' + entry.survivors + ';' + combinedRetreat,
          {
            casualties: combinedCas,
            survivors: entry.survivors,
            retreaters: combinedRetreat,
            amount: (p.prob / tp) * entry.prob,
            ipcLoss: p.ipcLoss + entry.ipcLoss,
          },
        );
      }
    }
  }

  const incrSwapArr: boolean[] = [];
  for (let i = 0; i < swapArr.length; i++) {
    incrSwapArr.push(i > 0 && swapArr[i] !== swapArr[i - 1]);
  }

  let pendingAtt: PendingEntry[] = [];
  let pendingDef: PendingEntry[] = [];

  for (let ii = 0; ii < waveOutputs.length; ii++) {
    const currOutput = waveOutputs[ii];
    if (currOutput == undefined) continue;
    if (verboseLevel > 2) {
      console.log(
        'w' + ii + ' pendingAtt:',
        JSON.stringify(
          pendingAtt.map((p) => ({
            prob: p.prob,
            ipcLoss: p.ipcLoss,
            casualties: p.casualties,
            survivors: p.survivors,
          })),
        ),
        'pendingDef:',
        JSON.stringify(
          pendingDef.map((p) => ({
            prob: p.prob,
            ipcLoss: p.ipcLoss,
            casualties: p.casualties,
            survivors: p.survivors,
          })),
        ),
      );
    }
    const swapped = swapArr[ii] === 1;
    const nextSwapped = ii < lastIdx && swapArr[ii + 1] === 1;

    if (ii < lastIdx) {
      if (!swapped) {
        // Non-last wave, not swapped
        const newContinues: PendingEntry[] = [];

        for (let i = 0; i < currOutput.att_cas.length; i++) {
          const cas = currOutput.att_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          const isCapture = cas.remain.length > 0 && hasLand(um, cas.remain);

          if (isCapture && nextSwapped) {
            // Swap transition: split land from air
            const { air: casAir } = splitAirLand(um, cas.casualty);
            const { air: remainAir } = splitAirLand(um, cas.remain);
            const { air: retreatAir } = splitAirLand(um, cas.retreat);
            const airIpc = get_cost_from_str(um, casAir);
            pushCrossMul(newContinues, pendingAtt, {
              casualties: get_external_unit_str(um, casAir),
              survivors: get_external_unit_str(um, remainAir),
              retreaters: get_external_unit_str(um, retreatAir),
              ipcLoss: airIpc,
              prob: cas.prob,
            });
          } else if (isCapture && !nextSwapped) {
            // Standard capture
            mapCrossMul(att, pendingAtt, {
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: cas.prob,
            });
          } else if (!isCapture && nextSwapped) {
            // Non-capture before swap (terminal): includes both fail and air-only survivors
            mapCrossMul(att, pendingAtt, {
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: cas.prob,
            });
          } else {
            // Standard continue (push as-is, cascade handles cross-multiplication)
            newContinues.push({
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: cas.prob,
            });
          }
        }

        // Cascade or replace pendingAtt
        if (nextSwapped || pendingAtt.length === 0) {
          pendingAtt = newContinues;
        } else if (newContinues.length > 0) {
          const tp = totalP(pendingAtt);
          const nextPending: PendingEntry[] = [];
          for (const p of pendingAtt) {
            for (const np of newContinues) {
              nextPending.push({
                casualties: mergeUnitStrings(p.casualties, np.casualties),
                survivors: np.survivors,
                retreaters: mergeUnitStrings(p.retreaters, np.retreaters),
                ipcLoss: p.ipcLoss + np.ipcLoss,
                prob: (p.prob / tp) * np.prob,
              });
            }
          }
          pendingAtt = nextPending;
        }

        // Defender side with correct terminal/continued split
        const takesInc = currOutput.takesTerritory[0];

        // For swap transition, compute true continuation prob from att_cas
        let termScale = 1;
        let defTermSum = 0;
        if (nextSwapped) {
          let contProb = 0;
          for (const c of currOutput.att_cas) {
            if (c.remain.length > 0) contProb += c.prob;
          }
          // Current terminal sum from def_cas perspective = 1 - takesInc
          // Correct terminal sum = 1 - contProb
          if (takesInc < 1) {
            termScale = (1 - contProb) / (1 - takesInc);
          }
        }
        termScale = 1.0; // undo previous fix;
        for (let i = 0; i < currOutput.def_cas.length; i++) {
          const cas = currOutput.def_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);

          if (nextSwapped) {
            if (cas.remain !== '') {
              const amt = cas.prob * termScale;
              defTermSum += amt;
              addToMap(def, casStr + ';' + remainStr + ';' + retreatStr, {
                casualties: casStr,
                survivors: remainStr,
                retreaters: retreatStr,
                amount: amt,
                ipcLoss: ipc,
              });
            } else {
              const amt = (cas.prob - takesInc) * termScale;
              defTermSum += amt;
              addToMap(def, casStr + ';' + remainStr + ';' + retreatStr, {
                casualties: casStr,
                survivors: remainStr,
                retreaters: retreatStr,
                amount: amt,
                ipcLoss: ipc,
              });
              if (pendingDef.length === 0) {
                pendingDef.push({
                  casualties: casStr,
                  survivors: '',
                  retreaters: retreatStr,
                  prob: 1,
                  ipcLoss: ipc,
                });
              }
            }
          } else {
            if (cas.remain === '') {
              addToMap(def, casStr + ';' + remainStr + ';' + retreatStr, {
                casualties: casStr,
                survivors: remainStr,
                retreaters: retreatStr,
                amount: takesInc,
                ipcLoss: ipc,
              });
            }
          }
        }
      } else {
        // Non-last wave, swapped
        const newContinues: PendingEntry[] = [];
        const newContinuesDef: PendingEntry[] = [];

        for (let i = 0; i < currOutput.def_cas.length; i++) {
          const cas = currOutput.def_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          // if swap, then the current takes isn't cummulative -- it's the incremental takes compared to previous wave
          const takesInc = currOutput.takesTerritory[0];
          const isNextWaveSwap = ii < lastIdx && incrSwapArr[ii + 1];
          const isDefenderKilled = cas.remain.length == 0;
          const captureProb = takesInc;
          const mutualKillProb = cas.prob - takesInc;
          const isTakesState = isDefenderKilled;
          const takesStateProb = captureProb;
          const isDefenderHoldsState =
            !isDefenderKilled || (isDefenderKilled && captureProb < cas.prob);
          const defenderHoldsStateProb = isDefenderKilled
            ? cas.prob - takesInc
            : cas.prob;
          let isTerminalState;
          let isContinueState;
          let terminalStateProb;
          let continueStateProb;
          if (isNextWaveSwap) {
            isTerminalState = isDefenderHoldsState;
            terminalStateProb = defenderHoldsStateProb;
            isContinueState = isTakesState;
            continueStateProb = takesStateProb;
          } else {
            isTerminalState = isTakesState;
            isContinueState = isDefenderHoldsState;
            terminalStateProb = takesStateProb;
            continueStateProb = defenderHoldsStateProb;
          }
          if (isContinueState && continueStateProb > 0) {
            /*
			// don't need to cross multiply... defender in the next
			// state already preserves
            newContinues.push({
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: continueStateProb,
            });
*/
          }
          if (isTerminalState && terminalStateProb > 0) {
            mapCrossMul(att, pendingAtt, {
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: terminalStateProb,
            });
          }
        }

        const isNextWaveSwap = ii < lastIdx && incrSwapArr[ii + 1];
        // Cascade pendingAtt with newContinues
        if (isNextWaveSwap || pendingAtt.length === 0) {
          pendingAtt = newContinues;
        } else if (newContinues.length > 0) {
          const tp = totalP(pendingAtt);
          const nextPending: PendingEntry[] = [];
          for (const p of pendingAtt) {
            for (const np of newContinues) {
              nextPending.push({
                casualties: mergeUnitStrings(p.casualties, np.casualties),
                survivors: np.survivors,
                retreaters: mergeUnitStrings(p.retreaters, np.retreaters),
                ipcLoss: p.ipcLoss + np.ipcLoss,
                prob: (p.prob / tp) * np.prob,
              });
            }
          }
          pendingAtt = nextPending;
        }

        for (let i = 0; i < currOutput.att_cas.length; i++) {
          const cas = currOutput.att_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          const isCapture = cas.remain.length > 0 && hasLand(um, cas.remain);
          const isNextWaveSwap = ii < lastIdx && incrSwapArr[ii + 1];
          let isTerminalState;
          if (isNextWaveSwap) {
            isTerminalState = !isCapture;
          } else {
            isTerminalState = isCapture;
          }
          if (isTerminalState) {
            mapCrossMul(def, pendingDef, {
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: cas.prob,
            });
          } else {
            newContinuesDef.push({
              casualties: casStr,
              survivors: remainStr,
              retreaters: retreatStr,
              ipcLoss: ipc,
              prob: cas.prob,
            });
          }
        }

        // Cascade pendingDef with newContinuesDef
        if (newContinuesDef.length > 0) {
          const tp = totalP(pendingDef);
          if (tp > 0) {
            const nextPendingDef: PendingEntry[] = [];
            for (const p of pendingDef) {
              for (const np of newContinuesDef) {
                nextPendingDef.push({
                  casualties: mergeUnitStrings(p.casualties, np.casualties),
                  survivors: np.survivors,
                  retreaters: mergeUnitStrings(p.retreaters, np.retreaters),
                  ipcLoss: p.ipcLoss + np.ipcLoss,
                  prob: (p.prob / tp) * np.prob,
                });
              }
            }
            pendingDef = nextPendingDef;
          } else {
            pendingDef = newContinuesDef;
          }
        }
      }
    } else {
      // Last wave
      if (!swapped) {
        for (let i = 0; i < currOutput.att_cas.length; i++) {
          const cas = currOutput.att_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          mapCrossMul(att, pendingAtt, {
            casualties: casStr,
            survivors: remainStr,
            retreaters: retreatStr,
            ipcLoss: ipc,
            prob: cas.prob,
          });
        }
        for (let i = 0; i < currOutput.def_cas.length; i++) {
          const cas = currOutput.def_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          addToMap(def, casStr + ';' + remainStr + ';' + retreatStr, {
            casualties: casStr,
            survivors: remainStr,
            retreaters: retreatStr,
            amount: cas.prob,
            ipcLoss: ipc,
          });
        }
      } else {
        // Last wave swapped: def_cas => att, att_cas => def
        for (let i = 0; i < currOutput.def_cas.length; i++) {
          const cas = currOutput.def_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          mapCrossMul(att, pendingAtt, {
            casualties: casStr,
            survivors: remainStr,
            retreaters: retreatStr,
            ipcLoss: ipc,
            prob: cas.prob,
          });
        }
        for (let i = 0; i < currOutput.att_cas.length; i++) {
          const cas = currOutput.att_cas[i];
          const casStr = get_external_unit_str(um, cas.casualty);
          const remainStr = get_external_unit_str(um, cas.remain);
          const retreatStr = get_external_unit_str(um, cas.retreat);
          const ipc = get_cost_from_str(um, cas.casualty);
          mapCrossMul(def, pendingDef, {
            casualties: casStr,
            survivors: remainStr,
            retreaters: retreatStr,
            ipcLoss: ipc,
            prob: cas.prob,
          });
        }
      }
    }
    function mergePending(arr: PendingEntry[]): PendingEntry[] {
      const map = new Map<string, PendingEntry>();
      for (const p of arr) {
        const key =
          p.casualties +
          '|' +
          p.survivors +
          '|' +
          p.retreaters +
          '|' +
          p.ipcLoss;
        const existing = map.get(key);
        if (existing) {
          existing.prob += p.prob;
        } else {
          map.set(key, { ...p });
        }
      }
      return Array.from(map.values());
    }
    pendingAtt = mergePending(pendingAtt);
    pendingDef = mergePending(pendingDef);
  }

  return {
    attack: filterMapByThreshold(att, reportPruneThreshold),
    defense: filterMapByThreshold(def, reportPruneThreshold),
  };
}

export function multiwaveExternal(input: MultiwaveInput): MultiwaveOutput {
  const t0_multi = performance.now();
  const internal_input = getInternalInput(input);
  const internal_output = multiwave(internal_input);
  if (input.verbose_level > 0) {
    console.log(
      'multiwave runtime:',
      (performance.now() - t0_multi).toFixed(2),
      'ms',
    );
  }

  const rounds = internal_output.output.map((o) => o?.rounds ?? 0);

  const swapArr: number[] = [];
  let currSwap = 0;
  for (let i = 0; i < input.wave_info.length; i++) {
    const wave = input.wave_info[i];
    if (wave?.use_attackers_from_previous_wave) {
      currSwap = 1 - currSwap;
    }
    swapArr.push(currSwap);
  }

  const t0_cas = performance.now();
  const { casualtiesInfoArr, profitDist } = buildCasualtiesInfoArr(
    internal_output.output,
    input.verbose_level,
    input.report_prune_threshold,
  );

  const casualtiesInfo = buildCumulativeCasualtiesInfo(
    internal_output.output,
    internal_output.out.takesTerritory,
    swapArr,
    input.verbose_level,
    input.report_prune_threshold,
  );
  if (input.verbose_level > 0) {
    console.log(
      'casualties computation runtime:',
      (performance.now() - t0_cas).toFixed(2),
      'ms',
    );
  }

  if (input.verbose_level > 1) {
    let attIpc = 0;
    let defIpc = 0;
    let attProb = 0;
    let defProb = 0;
    for (const v of Object.values(casualtiesInfo.attack)) {
      attIpc += v.amount * v.ipcLoss;
      attProb += v.amount;
    }
    for (const v of Object.values(casualtiesInfo.defense)) {
      defIpc += v.amount * v.ipcLoss;
      defProb += v.amount;
    }
    console.log(
      'cumulative detailed att ipcLoss:',
      attIpc,
      'def ipcLoss:',
      defIpc,
      'att prob:',
      attProb,
      'def prob:',
      defProb,
    );
  }

  // Compute cumulative IPC loss from incremental values, accounting for role reversals.
  // This gives the total IPC loss of the original attacker/defender across all waves.
  const attCumulativeIpc: number[] = [];
  const defCumulativeIpc: number[] = [];
  let cumAtt = 0,
    cumDef = 0;
  for (let i = 0; i < input.wave_info.length; i++) {
    const incAtt =
      internal_output.out.attack.incrementalLoss?.[i] ??
      (i > 0
        ? internal_output.out.attack.ipcLoss[i] -
          internal_output.out.attack.ipcLoss[i - 1]
        : internal_output.out.attack.ipcLoss[i]);
    const incDef =
      internal_output.out.defense.incrementalLoss?.[i] ??
      (i > 0
        ? internal_output.out.defense.ipcLoss[i] -
          internal_output.out.defense.ipcLoss[i - 1]
        : internal_output.out.defense.ipcLoss[i]);
    if (swapArr[i] === 1) {
      cumAtt += incDef;
      cumDef += incAtt;
    } else {
      cumAtt += incAtt;
      cumDef += incDef;
    }
    attCumulativeIpc.push(cumAtt);
    defCumulativeIpc.push(cumDef);
  }

  const out: MultiwaveOutput = {
    attack: {
      ...internal_output.out.attack,
      cumulativeIpcLoss: attCumulativeIpc,
    },
    defense: {
      ...internal_output.out.defense,
      cumulativeIpcLoss: defCumulativeIpc,
    },
    waves: internal_output.output.length,
    takesTerritory: internal_output.out.takesTerritory,
    rounds,
    casualtiesInfo,
    casualtiesInfoArr,
    profitDistribution: profitDist,
    complexity: internal_output.complexity,
  };
  if (input.verbose_level > 2) {
    console.log('multiwave output', out);
    console.log('multiwave output', JSON.stringify(out, null, 4));
  }

  return out;
}

export function multiEvalExternal(input: MultiEvalInput): MultiEvalOutput {
  const internal_input = getInternalInput(input);
  let attackerList: string[] = [];
  for (let i = 0; i < input.attackerList.length; i++) {
    const attackers = input.attackerList[i];
    const att_unit_group_string = make_unit_group_string(
      attackers,
      input.wave_info[0].attack.ool,
      input.wave_info[0].attack.takes,
      false,
      input.is_naval,
      input.verbose_level,
    );
    attackerList.push(att_unit_group_string.unit);
  }
  let defenderList: string[] = [];
  for (let i = 0; i < input.defenderList.length; i++) {
    const defenders = input.defenderList[i];
    const def_unit_group_string = make_unit_group_string(
      defenders,
      input.wave_info[0].defense.ool,
      0,
      input.wave_info[0].defense.aaLast,
      input.is_naval,
      input.verbose_level,
    );
    defenderList.push(def_unit_group_string.unit);
  }
  const multiEvalInput: multieval_input = {
    ...(internal_input as any),
    attackerList: attackerList,
    defenderList: defenderList,
  };
  const output = multiwaveMultiEval(multiEvalInput);
  return output;
}

interface make_unit_group_string_output {
  unit: string;
  ool: string;
}

export function make_unit_group_string(
  units: Army,
  ool: UnitIdentifier[], // array of order of loss
  takes: number, // number of land units to take with
  aa_last: boolean, // take aa as second last casualty for defender
  is_naval: boolean,
  verbose_level: number,
): make_unit_group_string_output {
  let unitstr = '';
  const um = new unit_manager(verbose_level);

  for (const [uid, count] of Object.entries(units)) {
    if (count == 0) {
      continue;
    }
    const ch = UnitIdentifier2UnitMap[<UnitIdentifier>uid];
    if (ch == undefined) {
      throw new Error('make unit group string failed');
    }
    for (let i = 0; i < count; i++) {
      unitstr += ch;
    }
  }

  let oolstr = '';
  for (let i = ool.length - 1; i >= 0; i--) {
    const unit = ool[i];
    const ch = UnitIdentifier2UnitMap[unit];
    if (ch == undefined) {
      throw new Error('make unit group string failed');
    }
    oolstr += ch;
  }
  if (!is_naval) {
    oolstr += 'BC';
  }
  if (is_naval) {
    oolstr = 'T' + oolstr;
  }
  const mymap: Map<string, number> = new Map();
  let ool2 = '';
  for (const ch of oolstr) {
    if (mymap.has(ch)) {
      continue;
    }
    mymap.set(ch, 1);
    ool2 += ch;
  }
  oolstr = ool2;

  let out = apply_ool(unitstr, oolstr, aa_last);
  if (!is_naval && takes > 0) {
    // move takes land units to the front.
    let head = '';
    let remains = out;
    for (let i = 0; i < takes; i++) {
      let j;
      let ch;
      for (j = 0; j < remains.length; j++) {
        ch = remains.charAt(j);
        const stat = um.get_stat(ch);
        if (stat == undefined) {
          throw new Error('make unit group string failed');
        }
        if (stat.isLand) {
          remains = remains.substr(0, j) + remains.substr(j + 1);
          head += ch;
          break;
        }
      }
      out = head + remains;
      if (verbose_level > 3) {
        console.log(out);
      }
    }
  }
  return { unit: out, ool: oolstr };
}

export function get_external_unit_str(um: unit_manager, input: string): string {
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
    const externalName = Unit2ExternalNameMap.get(key);
    if (externalName == undefined) {
      return;
    }
    out = out + value + ' ' + externalName + ', ';
  });
  return out.substring(0, out.length - 2);
}

export function sbrExternal(input: SbrInput): MultiwaveOutput {
  const internalInput: sbr_input = {
    diceMode: input.diceMode,
    verboseLevel: input.verbose_level,
    numBombers:
      input.attack.units['bom'] != undefined ? input.attack.units['bom'] : 0,
    industrialComplexHitPoints:
      input.defense.units['ic'] != undefined ? input.defense.units['ic'] : 0,
    inProgress: input.in_progress,
    reportPruneThreshold: input.reportPruneThreshold,
    pruneThreshold: input.pruneThreshold,
  };
  //console.log(internalInput);
  const internalOutput = sbr(internalInput);
  const casualtiesInfo: CasualtiesInfo = {
    attack: {},
    defense: {},
    //profit: {},
  };
  const att: Record<string, CasualtyInfo> = {};
  const def: Record<string, CasualtyInfo> = {};
  const profit: Record<string, CasualtyInfo> = {};
  const um = new unit_manager(input.verbose_level);
  for (let i = 0; i < internalOutput.att_cas.length; i++) {
    const cas = internalOutput.att_cas[i];
    const casualty: CasualtyInfo = {
      casualties: get_external_unit_str(um, cas.casualty),
      survivors: get_external_unit_str(um, cas.remain),
      retreaters: get_external_unit_str(um, cas.retreat),
      amount: cas.prob,
      ipcLoss: get_cost_from_str(um, cas.casualty),
    };
    att[i] = casualty;
  }
  for (let i = 0; i < internalOutput.def_cas.length; i++) {
    const cas = internalOutput.def_cas[i];
    const casualty: CasualtyInfo = {
      casualties: get_external_unit_str(um, cas.casualty),
      survivors: get_external_unit_str(um, cas.remain),
      retreaters: get_external_unit_str(um, cas.retreat),
      amount: cas.prob,
      ipcLoss: get_cost_from_str(um, cas.casualty),
    };
    def[i] = casualty;
  }
  casualtiesInfo['attack'] = att;
  casualtiesInfo['defense'] = def;
  //casualtiesInfo['profit'] = profit;

  const output: MultiwaveOutput = {
    attack: {
      ...internalOutput.attack,
      cumulativeIpcLoss: [...internalOutput.attack.ipcLoss],
    },
    defense: {
      ...internalOutput.defense,
      cumulativeIpcLoss: [...internalOutput.defense.ipcLoss],
    },
    casualtiesInfo: casualtiesInfo,
    casualtiesInfoArr: [], // SBR does not have wave by wave casualties info
    profitDistribution: [internalOutput.profitDistribution],
    takesTerritory: [],
    rounds: [1, 0, 0],
    waves: 1,
    complexity: 0, // SBR does not have complexity in the same way as multiwave
  };

  return output;
}

export function getIntegersInRange(
  low: number,
  high: number,
  step: number,
): number[] {
  const result: number[] = [];
  for (let i = low; i <= high; i += step) {
    result.push(i);
  }
  if (result[result.length - 1] < high) {
    result.push(high);
  }
  return result;
}

export function getArmyCost(army: Army): number {
  const um = new unit_manager(0);
  let sum = 0;
  for (const [uid, count] of Object.entries(army)) {
    let ch = UnitIdentifier2UnitMap[<UnitIdentifier>uid];
    let cost = um.get_stat(ch).cost;
    sum += cost * count;
  }
  return sum;
}

// compute all combinations of sub-armies from a given army
export function getSubArmies(
  army: Army,
  startArmy: Army,
  stepArmy: Army,
): [Army, number, number, number][] {
  const um = new unit_manager(0);
  let subArmies: [Army, number, number, number][] = [];
  const data: number[][] = [];
  const uidList: UnitIdentifier[] = [];
  let costMap: Map<UnitIdentifier, number> = new Map();
  let attPowerMap: Map<UnitIdentifier, number> = new Map();
  let defPowerMap: Map<UnitIdentifier, number> = new Map();
  for (const uids of Object.keys(army)) {
    let uid = <UnitIdentifier>uids;
    let ch = UnitIdentifier2UnitMap[uid];
    let cost = um.get_stat(ch).cost;
    let attPower = um.get_stat(ch).att;
    if (ch == 'a') {
      attPower = 3;
    }
    let defPower = um.get_stat(ch).def;
    if (ch == 'c') {
      defPower = 3;
    }
    let hp = um.get_stat(ch).hits;
    costMap.set(uid, cost);
    attPowerMap.set(uid, attPower + hp);
    defPowerMap.set(uid, defPower + hp);
  }
  let infIndex: number = 0;
  for (const [uid, count] of Object.entries(army)) {
    if (count > 0) {
      let start = startArmy[<UnitIdentifier>uid];
      let step = stepArmy[<UnitIdentifier>uid];
      if (start == undefined) {
        start = 0;
      }
      if (step == undefined) {
        step = 1;
      }
      let values = getIntegersInRange(start, count, step);
      data.push(values);
      if (uid == 'inf') {
        infIndex = uidList.length;
      }
      uidList.push(<UnitIdentifier>uid);
    }
  }
  const allCombinations = getCombinations(data);
  for (let i = 0; i < allCombinations.length; i++) {
    const combo = allCombinations[i];
    const subArmy: Army = {};
    let cost = 0;
    let AS = 0;
    let DS = 0;
    for (let j = 0; j < combo.length; j++) {
      const uid = uidList[j];
      const count = combo[j];
      if (count > 0) {
        subArmy[uid] = count;
      }
      cost += count * (costMap.get(<UnitIdentifier>uid) ?? 0);
      AS += count * (attPowerMap.get(<UnitIdentifier>uid) ?? 0);
      DS += count * (defPowerMap.get(<UnitIdentifier>uid) ?? 0);
      if (uid == 'art' && count > 0) {
        let numInf = combo[infIndex];
        // need 2X supporting  infantry to get the full 3 attack.   otherwise 2.5 attack
        if (numInf < count * 2) {
          let penalty = (1 - numInf / (count * 2)) * count;
          if (penalty > 0) {
            AS -= penalty;
          }
        }
        // if not sufficient supporting infantry, then downgrade to 2.0.
        if (numInf < count) {
          let penalty = (1 - numInf / count) * count * 0.5;
          if (penalty > 0) {
            AS -= penalty;
          }
        }
      }
    }
    if (Object.keys(subArmy).length > 0) {
      subArmies.push([subArmy, cost, AS, DS]);
    }
  }
  return subArmies;
}

export function getCombinations<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) {
    return [[]];
  }

  const firstArray = arrays[0];
  const remainingArrays = arrays.slice(1);
  const remainingCombinations = getCombinations(remainingArrays);

  const combinations: T[][] = [];
  for (const item of firstArray) {
    for (const remainingCombo of remainingCombinations) {
      combinations.push([item, ...remainingCombo]);
    }
  }
  return combinations;
}
