import {} from './solve.js';
import {} from './output.js';
import { get_cost_from_str } from './unitgroup.js';
import { hasLand } from './unitgroup.js';
import { unit_manager } from './unitgroup.js';
import { count_units } from './preparse.js';
import { apply_ool } from './multiwave.js';
import {} from './multiwave.js';
import {} from './multiwave.js';
import { multiwave } from './multiwave.js';
import { sbr } from './sbr.js';
import { multiwaveMultiEval } from './multieval.js';
import {} from './multieval.js';
import {} from './multieval.js';
export const UnitIdentifier2UnitMap = {
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
export const Unit2UnitIdentifierMap = new Map([
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
export const Unit2ExternalNameMap = new Map([
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
export function multiwaveComplexityFastV2(input) {
    let attacker_counts = {
        num_air: 0,
        num_subs: 0,
        num_naval: 0,
        num_aa: 0,
        N: 0,
    };
    let defender_counts = {
        num_air: 0,
        num_subs: 0,
        num_naval: 0,
        num_aa: 0,
        N: 0,
    };
    let complexitySum = 0;
    let prev_defense_ool = '';
    let prev_defense_aaLast = false;
    let complexityMax = 0;
    for (let i = 0; i < input.wave_info.length; i++) {
        const wave = input.wave_info[i];
        if (!wave) {
            continue; // Skip undefined or null waves
        }
        const att_unit_group_string = make_unit_group_string(wave.attack.units, wave.attack.ool, wave.attack.takes, false, input.is_naval, input.verbose_level);
        const def_unit_group_string = make_unit_group_string(wave.defense.units, wave.defense.ool, 0, wave.defense.aaLast, input.is_naval, input.verbose_level);
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
        let air = count_units(def_unit_group_string.unit, 'f') +
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
        let defenseOOLComplexity = i == 0
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
            console.log(i, attacker_complexity, defender_complexity, attacker_complexity * defender_complexity, 'attack, defense, att * def');
            console.log(attacker_counts, defender_counts, 'att counts, def_counts');
        }
        complexitySum += complexity;
        complexityMax = Math.max(complexityMax, complexity);
        prev_defense_ool = def_unit_group_string.ool;
        prev_defense_aaLast = wave.defense.aaLast;
    }
    return complexityMax;
}
export function multiwaveComplexity(input) {
    const complexityInput = {
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
export function getInternalInput(input) {
    const wavearr = [];
    const do_roundless_eval = input.do_roundless_eval ?? true;
    for (let i = 0; i < input.wave_info.length; i++) {
        const wave = input.wave_info[i];
        if (!wave) {
            continue; // Skip undefined or null waves
        }
        const att_unit_group_string = make_unit_group_string(wave.attack.units, wave.attack.ool, wave.attack.takes, false, input.is_naval, input.verbose_level);
        const def_unit_group_string = make_unit_group_string(wave.defense.units, wave.defense.ool, 0, wave.defense.aaLast, input.is_naval, input.verbose_level);
        let rounds = wave.rounds;
        if (do_roundless_eval && rounds == 100) {
            rounds = 0;
        }
        if (input.is_naval && wave.retreat_strafe_threshold != undefined) {
            throw new Error('is_naval && retreat_strafe_threshold is not allowed');
        }
        if (input.is_naval &&
            wave.retreat_lose_air_probability != undefined &&
            wave.retreat_lose_air_probability < 1.0) {
            throw new Error('is_naval && retreat_lose_air_probability < 1.0 is not allowed');
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
            retreat_expected_ipc_profit_threshold: wave.retreat_expected_ipc_profit_threshold,
            retreat_pwin_threshold: wave.retreat_pwin_threshold,
            pwinMode: wave.pwinMode ?? 'takes', // default to 'takes' if not provided
            retreat_strafe_threshold: wave.retreat_strafe_threshold,
        };
        wavearr.push(internal_wave);
    }
    const internal_input = {
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
export function multiwaveExternal(input) {
    const internal_input = getInternalInput(input);
    const internal_output = multiwave(internal_input);
    const rounds = [];
    for (let i = 0; i < internal_output.output.length; i++) {
        rounds.push(internal_output.output[i]?.rounds ?? 0);
    }
    const casualtiesInfo = {
        attack: {},
        defense: {},
        //profit: {},
    };
    const att = {};
    const def = {};
    const lastWave = internal_output.output.length - 1;
    const lastOutput = internal_output.output[lastWave];
    const um = new unit_manager(input.verbose_level);
    const profitDist = [];
    for (let ii = 0; ii < internal_output.output.length; ii++) {
        const currOutput = internal_output.output[ii];
        if (currOutput == undefined) {
            continue; // Skip undefined outputs
        }
        let sum = 0;
        for (let i = 0; i < currOutput.att_cas.length; i++) {
            const cas = currOutput.att_cas[i];
            const casualty = {
                casualties: get_external_unit_str(um, cas.casualty),
                survivors: get_external_unit_str(um, cas.remain),
                retreaters: get_external_unit_str(um, cas.retreat),
                amount: cas.prob,
                ipcLoss: get_cost_from_str(um, cas.casualty),
            };
            let include = false;
            if (ii < internal_output.output.length - 1 &&
                cas.remain.length > 0 &&
                hasLand(um, cas.remain)) {
                // If there are land units remaining, we captured the territory in the previous wave and need to record
                // the casualties details.
                include = true;
            }
            if (ii == internal_output.output.length - 1) {
                include = true;
            }
            if (!include) {
                continue; // Skip casualties that are not relevant for the last wave
            }
            const key = get_external_unit_str(um, cas.casualty) +
                ';' +
                get_external_unit_str(um, cas.remain) +
                ';' +
                get_external_unit_str(um, cas.retreat);
            if (att[key] == undefined) {
                att[key] = casualty;
            }
            else {
                att[key].amount += cas.prob;
            }
            sum += cas.prob;
        }
        if (input.verbose_level > 2) {
            console.log(`Attacker casualties for wave ${ii}: ${sum}`);
        }
        sum = 0;
        for (let i = 0; i < currOutput.def_cas.length; i++) {
            const cas = currOutput.def_cas[i];
            const casualty = {
                casualties: get_external_unit_str(um, cas.casualty),
                survivors: get_external_unit_str(um, cas.remain),
                retreaters: get_external_unit_str(um, cas.retreat),
                amount: cas.prob,
                ipcLoss: get_cost_from_str(um, cas.casualty),
            };
            let include = false;
            let prob = cas.prob;
            if (ii < internal_output.output.length - 1 && cas.remain.length == 0) {
                // If there are land units remaining, we captured the territory in the previous wave and need to record
                // the casualties details.
                include = true;
                prob =
                    internal_output.out.takesTerritory[ii] -
                        (ii > 0 ? internal_output.out.takesTerritory[ii - 1] : 0);
            }
            if (ii == internal_output.output.length - 1) {
                include = true;
            }
            if (!include) {
                continue; // Skip casualties that are not relevant for the last wave
            }
            const key = get_external_unit_str(um, cas.casualty) +
                ';' +
                get_external_unit_str(um, cas.remain) +
                ';' +
                get_external_unit_str(um, cas.retreat);
            if (def[key] == undefined) {
                def[key] = casualty;
                def[key].amount = prob;
            }
            else {
                def[key].amount += prob;
            }
            sum += prob;
        }
        if (input.verbose_level > 2) {
            console.log(`Defender casualties for wave ${ii}: ${sum}`);
        }
        profitDist.push(currOutput.profitDistribution);
        //casualtiesInfo['profit'] = profit;
    }
    casualtiesInfo['attack'] = att;
    casualtiesInfo['defense'] = def;
    const out = {
        attack: internal_output.out.attack,
        defense: internal_output.out.defense,
        waves: internal_output.output.length,
        takesTerritory: internal_output.out.takesTerritory,
        rounds: rounds,
        casualtiesInfo: casualtiesInfo,
        profitDistribution: profitDist,
        complexity: internal_output.complexity,
    };
    return out;
}
export function multiEvalExternal(input) {
    const internal_input = getInternalInput(input);
    let attackerList = [];
    for (let i = 0; i < input.attackerList.length; i++) {
        const attackers = input.attackerList[i];
        const att_unit_group_string = make_unit_group_string(attackers, input.wave_info[0].attack.ool, input.wave_info[0].attack.takes, false, input.is_naval, input.verbose_level);
        attackerList.push(att_unit_group_string.unit);
    }
    let defenderList = [];
    for (let i = 0; i < input.defenderList.length; i++) {
        const defenders = input.defenderList[i];
        const def_unit_group_string = make_unit_group_string(defenders, input.wave_info[0].defense.ool, 0, input.wave_info[0].defense.aaLast, input.is_naval, input.verbose_level);
        defenderList.push(def_unit_group_string.unit);
    }
    const multiEvalInput = {
        ...internal_input,
        attackerList: attackerList,
        defenderList: defenderList,
    };
    const output = multiwaveMultiEval(multiEvalInput);
    return output;
}
export function make_unit_group_string(units, ool, // array of order of loss
takes, // number of land units to take with
aa_last, // take aa as second last casualty for defender
is_naval, verbose_level) {
    let unitstr = '';
    const um = new unit_manager(verbose_level);
    for (const [uid, count] of Object.entries(units)) {
        if (count == 0) {
            continue;
        }
        const ch = UnitIdentifier2UnitMap[uid];
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
    const mymap = new Map();
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
export function get_external_unit_str(um, input) {
    const map = new Map();
    for (const char of input) {
        const v = map.get(char);
        if (v != undefined) {
            map.set(char, v + 1);
        }
        else {
            map.set(char, 1);
        }
    }
    let out = '';
    map.forEach((value, key) => {
        const externalName = Unit2ExternalNameMap.get(key);
        if (externalName == undefined) {
            return;
        }
        out = out + value + ' ' + externalName + ', ';
    });
    return out.substring(0, out.length - 2);
}
export function sbrExternal(input) {
    const internalInput = {
        diceMode: input.diceMode,
        verboseLevel: input.verbose_level,
        numBombers: input.attack.units['bom'] != undefined ? input.attack.units['bom'] : 0,
        industrialComplexHitPoints: input.defense.units['ic'] != undefined ? input.defense.units['ic'] : 0,
        inProgress: input.in_progress,
        reportPruneThreshold: input.reportPruneThreshold,
        pruneThreshold: input.pruneThreshold,
    };
    //console.log(internalInput);
    const internalOutput = sbr(internalInput);
    const casualtiesInfo = {
        attack: {},
        defense: {},
        //profit: {},
    };
    const att = {};
    const def = {};
    const profit = {};
    const um = new unit_manager(input.verbose_level);
    for (let i = 0; i < internalOutput.att_cas.length; i++) {
        const cas = internalOutput.att_cas[i];
        const casualty = {
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
        const casualty = {
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
    const output = {
        attack: internalOutput.attack,
        defense: internalOutput.defense,
        casualtiesInfo: casualtiesInfo,
        profitDistribution: [internalOutput.profitDistribution],
        takesTerritory: [],
        rounds: [1, 0, 0],
        waves: 1,
        complexity: 0, // SBR does not have complexity in the same way as multiwave
    };
    return output;
}
export function getIntegersInRange(low, high, step) {
    const result = [];
    for (let i = low; i <= high; i += step) {
        result.push(i);
    }
    if (result[result.length - 1] < high) {
        result.push(high);
    }
    return result;
}
export function getArmyCost(army) {
    const um = new unit_manager(0);
    let sum = 0;
    for (const [uid, count] of Object.entries(army)) {
        let ch = UnitIdentifier2UnitMap[uid];
        let cost = um.get_stat(ch).cost;
        sum += cost * count;
    }
    return sum;
}
// compute all combinations of sub-armies from a given army
export function getSubArmies(army, startArmy, stepArmy) {
    const um = new unit_manager(0);
    let subArmies = [];
    const data = [];
    const uidList = [];
    let costMap = new Map();
    let attPowerMap = new Map();
    let defPowerMap = new Map();
    for (const uids of Object.keys(army)) {
        let uid = uids;
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
    let infIndex = 0;
    for (const [uid, count] of Object.entries(army)) {
        if (count > 0) {
            let start = startArmy[uid];
            let step = stepArmy[uid];
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
            uidList.push(uid);
        }
    }
    const allCombinations = getCombinations(data);
    for (let i = 0; i < allCombinations.length; i++) {
        const combo = allCombinations[i];
        const subArmy = {};
        let cost = 0;
        let AS = 0;
        let DS = 0;
        for (let j = 0; j < combo.length; j++) {
            const uid = uidList[j];
            const count = combo[j];
            if (count > 0) {
                subArmy[uid] = count;
            }
            cost += count * (costMap.get(uid) ?? 0);
            AS += count * (attPowerMap.get(uid) ?? 0);
            DS += count * (defPowerMap.get(uid) ?? 0);
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
export function getCombinations(arrays) {
    if (arrays.length === 0) {
        return [[]];
    }
    const firstArray = arrays[0];
    const remainingArrays = arrays.slice(1);
    const remainingCombinations = getCombinations(remainingArrays);
    const combinations = [];
    for (const item of firstArray) {
        for (const remainingCombo of remainingCombinations) {
            combinations.push([item, ...remainingCombo]);
        }
    }
    return combinations;
}
//# sourceMappingURL=external.js.map