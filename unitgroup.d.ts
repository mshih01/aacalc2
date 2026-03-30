import type { UnitIdentifier } from './external.js';
import { type DiceMode } from './solve.js';
import { type casualty_1d } from './output.js';
export declare class unit_group_manager {
    unit_group_arr: unit_group[];
    mymap: Map<string, number>;
    get_or_create_unit_group(um: unit_manager, input: string, attdef: number, diceMode: DiceMode): unit_group;
    constructor();
}
export declare class unit_manager {
    unit_stats: Map<string, unit_stat>;
    rev_map: Map<string, string>;
    rev_map2: Map<string, string>;
    rev_map3: Map<UnitIdentifier, string>;
    unit_group_manager: unit_group_manager;
    verbose_level: number;
    skip_compute: boolean;
    constructor(verbose_level: number, skip_compute?: boolean);
    init_units(): void;
    make_unit(fullname: string, ch: string, ch2: string, att: number, def: number, cost: number, hits: number, isLand: boolean, isSub: boolean, isDestroyer: boolean, isAir: boolean, isAA: boolean, isBombard: boolean, isAmphibious: boolean): void;
    get_stat(ch: string): unit_stat;
}
export declare class unit_group {
    diceMode: DiceMode;
    unit_str: string;
    attdef: number;
    size: number;
    tbl_size: number;
    max_prob_table: number[];
    prob_hits: number[];
    first_destroyer_index: number;
    power: number[];
    pless: number[][];
    pgreater: number[][];
    prob_table2: number[];
    getIndex(i: number, j: number): number;
    geti_prob_table(ii: number): number;
    get_prob_table(i: number, j: number): number;
    seti_prob_table(ii: number, val: number): void;
    set_prob_table(i: number, j: number, val: number): void;
    constructor(manager: unit_manager, input_str: string, attdef: number, diceMode: DiceMode);
    compute_prob_table(): void;
}
export declare class general_unit_graph_node {
    unit_str: string;
    retreat: string;
    N: number;
    num_subs: number;
    num_air: number;
    num_naval: number;
    num_dest: number;
    num_aa: number;
    hasLand: boolean;
    cost: number;
    deadzone_cost: number;
    firstAirCasualty: number;
    dlast: boolean;
    index: number;
    next_aahit: general_unit_graph_node | undefined;
    next_subhit: general_unit_graph_node | undefined;
    next_airhit: general_unit_graph_node | undefined;
    next_navalhit: general_unit_graph_node;
    next_dlast_subhit: general_unit_graph_node | undefined;
    next_dlast_airhit: general_unit_graph_node | undefined;
    next_dlast_navalhit: general_unit_graph_node | undefined;
    next_submerge: general_unit_graph_node | undefined;
    next_retreat_amphibious: general_unit_graph_node | undefined;
    next_crash_fighters: general_unit_graph_node | undefined;
    next_remove_noncombat: general_unit_graph_node | undefined;
    naaArr: number[];
    nsubArr: number[];
    nairArr: number[];
    nnavalArr: number[];
    ndlastsubArr: number[];
    ndlastairArr: number[];
    ndlastnavalArr: number[];
    nosub_group: unit_group | undefined;
    naval_group: unit_group | undefined;
    numBB: number;
    constructor(um: unit_manager, unit_str: string, retreat: string, is_nonaval: boolean);
}
export declare class general_unit_group {
    um: unit_manager;
    unit_str: string;
    diceMode: DiceMode;
    attdef: number;
    destroyer_last: boolean;
    submerge_sub: boolean;
    is_crash_fighters: boolean;
    num_subs: number;
    num_naval: number;
    num_air: number;
    num_aashot: number;
    is_nonaval: boolean;
    is_naval: boolean;
    sub_group: unit_group;
    naval_group: unit_group;
    air_group: unit_group;
    dlast_group: unit_group | undefined;
    nodeArr: general_unit_graph_node[];
    constructor(um: unit_manager, input_str: string, attdef: number, dest_last: boolean, submerge: boolean, max_remove_hits: number, numAA: number, cas: casualty_1d[] | undefined, is_nonaval: boolean, is_amphibious: boolean, crash_fighters: boolean, diceMode: DiceMode, is_naval: boolean);
}
export declare class unit_stat {
    fullname: string;
    ch: string;
    ch2: string;
    att: number;
    def: number;
    cost: number;
    hits: number;
    isLand: boolean;
    isSub: boolean;
    isDestroyer: boolean;
    isAir: boolean;
    isAA: boolean;
    isBombard: boolean;
    isAmphibious: boolean;
    constructor(fullname: string, ch: string, ch2: string, att: number, def: number, cost: number, hits: number, isLand: boolean, isSub: boolean, isDestroyer: boolean, isAir: boolean, isAA: boolean, isBombard: boolean, isAmphibious: boolean);
}
export declare function hasDestroyer(group: general_unit_group, node: general_unit_graph_node): boolean;
export declare function remove_subhits2(node: general_unit_graph_node, hits: number): number;
export declare function remove_aahits(group: general_unit_group, hits: number, index: number): number;
export declare function remove_dlast_subhits2(node: general_unit_graph_node, hits: number): number;
export declare function remove_planehits2(node: general_unit_graph_node, hasDest: boolean, hits: number): number;
export declare function remove_dlast_planehits2(node: general_unit_graph_node, hasDest: boolean, hits: number): number;
export declare function remove_navalhits2(node: general_unit_graph_node, hits: number): number;
export declare function remove_dlast_navalhits2(node: general_unit_graph_node, hits: number): number;
export declare function isAir(um: unit_manager, input: string): boolean;
export declare function isSub(um: unit_manager, input: string): boolean;
export declare function isDestroyer(um: unit_manager, input: string): boolean;
export declare function isLand(um: unit_manager, input: string): boolean;
export declare function hasLand(um: unit_manager, input: string): boolean;
export declare function hasAmphibious(um: unit_manager, input: string): boolean;
export declare function hasNonAAUnit(um: unit_manager, input: string): boolean;
export declare function remove_one_plane(um: unit_manager, input_str: string): [string, string];
export declare function remove_one_notdestroyer(um: unit_manager, input_str: string): string;
export declare function remove_one_notplane(um: unit_manager, input_str: string, skipd: boolean): string;
export declare function remove_one_notsub(um: unit_manager, input_str: string, skipd: boolean): string;
interface retreat_subs_output {
    s: string;
    num_subs: number;
    subs: string;
}
export declare function retreat_subs(um: unit_manager, input_str: string): retreat_subs_output;
export declare function is_only_transports_remain(um: unit_manager, input_str: string): boolean;
export declare function is_only_aa_remain(um: unit_manager, input_str: string): boolean;
export declare function crash_fighters(um: unit_manager, input_str: string): string;
export declare function retreat_non_amphibious(um: unit_manager, input_str: string): [string, string];
export declare function get_deadzone_cost_from_str(um: unit_manager, s: string, retreat?: string): number;
export declare function getFirstAirCasualty(um: unit_manager, unit_str: string): number;
export declare function get_general_cost_remain(um: unit_manager, group: general_unit_group, ii: number): number;
export declare function get_cost_from_str(um: unit_manager, s: string, retreat?: string): number;
export declare function compute_remove_hits(naval_group: general_unit_group, max_remove_hits: number, numAA: number, cas: casualty_1d[] | undefined, is_amphibious: boolean): void;
export declare function make_unit_group(um: unit_manager, input_str: string, attdef: number, diceMode: DiceMode): unit_group;
export {};
//# sourceMappingURL=unitgroup.d.ts.map