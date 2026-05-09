import { general_problem } from './solve.js';
import type { multiwave_input, wave_input } from './multiwave.js';
import type { casualty_1d } from './output.js';
import type { unit_manager } from './unitgroup.js';

export function createGeneralProblem(
  input: multiwave_input,
  wave: wave_input,
  um: unit_manager,
  attackers_internal: string,
  defenders_internal: string,
  defend_add_reinforce: casualty_1d[] | undefined,
): general_problem {
  return new general_problem({
    verbose_level: input.verbose_level,
    um,
    att_str: attackers_internal,
    def_str: defenders_internal,
    prob: 1.0,
    att_dest_last: wave.att_dest_last,
    att_submerge: wave.att_submerge,
    def_dest_last: wave.def_dest_last,
    def_submerge: wave.def_submerge,
    rounds: wave.rounds,
    retreat_threshold: wave.retreat_threshold,
    is_crash_fighters: wave.is_crash_fighters,
    is_naval: input.is_naval,
    def_cas: defend_add_reinforce,
    is_nonaval: false,
    diceMode: input.diceMode,
    sortMode: input.sortMode,
    is_deadzone: input.is_deadzone,
    skip_compute: input.report_complexity_only,
    territory_value: input.territory_value,
    retreat_round_zero: input.retreat_round_zero,
    do_roundless_eval: input.do_roundless_eval,
    retreat_lose_air_probability: wave.retreat_lose_air_probability,
    retreat_expected_ipc_profit_threshold:
      wave.retreat_expected_ipc_profit_threshold,
    retreat_pwin_threshold: wave.retreat_pwin_threshold,
    pwinMode: wave.pwinMode,
    retreat_strafe_threshold: wave.retreat_strafe_threshold,
  });
}
