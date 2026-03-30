import { multiwaveExternal, sbrExternal, } from './external.js';
const defaultWaveOptions = {
    attackOol: ['inf', 'art', 'arm', 'fig', 'bom'],
    defenseOol: ['aa', 'inf', 'art', 'arm', 'fig', 'bom'],
    takes: 0,
    aaLast: false,
    attSubmerge: false,
    defSubmerge: false,
    attDestLast: false,
    defDestLast: false,
    isCrashFighters: false,
    rounds: 100,
    retreatThreshold: 0,
    isNaval: false,
    diceMode: 'standard',
    sortMode: 'unit_count',
    verboseLevel: 0,
};
export function makeMultiwaveInput(input) {
    const wave = {
        attack: {
            units: input.attack,
            ool: input.attackOol ?? defaultWaveOptions.attackOol,
            takes: input.takes ?? defaultWaveOptions.takes,
            aaLast: input.aaLast ?? defaultWaveOptions.aaLast,
        },
        defense: {
            units: input.defense,
            ool: input.defenseOol ?? defaultWaveOptions.defenseOol,
            takes: 0,
            aaLast: input.aaLast ?? defaultWaveOptions.aaLast,
        },
        att_submerge: input.attSubmerge ?? defaultWaveOptions.attSubmerge,
        def_submerge: input.defSubmerge ?? defaultWaveOptions.defSubmerge,
        att_dest_last: input.attDestLast ?? defaultWaveOptions.attDestLast,
        def_dest_last: input.defDestLast ?? defaultWaveOptions.defDestLast,
        is_crash_fighters: input.isCrashFighters ?? defaultWaveOptions.isCrashFighters,
        rounds: input.rounds ?? defaultWaveOptions.rounds,
        retreat_threshold: input.retreatThreshold ?? defaultWaveOptions.retreatThreshold,
        retreat_expected_ipc_profit_threshold: input.retreatExpectedIpcProfitThreshold,
        retreat_pwin_threshold: input.retreatPwinThreshold,
        retreat_strafe_threshold: input.retreatStrafeThreshold,
        retreat_lose_air_probability: input.retreatLoseAirProbability,
        pwinMode: 'takes',
    };
    return {
        wave_info: [wave],
        debug: false,
        prune_threshold: 1e-12,
        report_prune_threshold: 1e-12,
        is_naval: input.isNaval ?? defaultWaveOptions.isNaval,
        in_progress: false,
        num_runs: 1,
        verbose_level: input.verboseLevel ?? defaultWaveOptions.verboseLevel,
        diceMode: input.diceMode ?? defaultWaveOptions.diceMode,
        sortMode: input.sortMode ?? defaultWaveOptions.sortMode,
        do_roundless_eval: true,
    };
}
export function computeBattle(input) {
    return multiwaveExternal(makeMultiwaveInput(input));
}
export function computeSbrBattle(input) {
    const sbrInput = {
        attack: {
            units: input.attack,
            ool: input.attackOol ?? defaultWaveOptions.attackOol,
            takes: input.takes ?? defaultWaveOptions.takes,
            aaLast: input.aaLast ?? defaultWaveOptions.aaLast,
        },
        defense: {
            units: input.defense,
            ool: input.defenseOol ?? defaultWaveOptions.defenseOol,
            takes: 0,
            aaLast: input.aaLast ?? defaultWaveOptions.aaLast,
        },
        verbose_level: input.verboseLevel ?? defaultWaveOptions.verboseLevel,
        diceMode: input.diceMode ?? defaultWaveOptions.diceMode,
        in_progress: false,
        pruneThreshold: 1e-12,
        reportPruneThreshold: 1e-12,
    };
    return sbrExternal(sbrInput);
}
//# sourceMappingURL=frontend.js.map