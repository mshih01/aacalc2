import * as readline from 'readline';

import {
  type DiceMode,
  type multiwave_input,
  type wave_input,
  multiwave,
} from '../solve.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

let argc: number = 0;
const argv: string[] = [];

rl.on('line', (line) => {
  argv[argc++] = line;
});

rl.once('close', () => {
  console.log('done');
  const mode = parseInt(argv[0]);
  switch (mode) {
    case 1:
      run3(argc, argv);
      break;
    case 2:
      // example parse unit iniput
      break;
  }
});

function run3(argc: number, argv: string[]) {
  let i = 1;
  const debug = parseInt(argv[i++]);
  const report_prune_threshold = parseFloat(argv[i++]);
  const prune_threshold = parseFloat(argv[i++]);
  const isnaval = parseInt(argv[i++]);
  const attackers = argv[i++];
  const defenders = argv[i++];

  i++;
  const num_runs = Math.max(parseInt(argv[i++]), 1);

  let att_destroyer_last = false;
  let def_destroyer_last = false;
  let att_submerge = false;
  let def_submerge = false;
  if (isnaval > 0) {
    att_destroyer_last = parseInt(argv[i++]) > 0;
    att_submerge = parseInt(argv[i++]) > 0;
    def_destroyer_last = parseInt(argv[i++]) > 0;
    def_submerge = parseInt(argv[i++]) > 0;
  }
  const attackers2 = argv[i++];
  const defenders2 = argv[i++];
  const def_ool2 = argv[i++];
  const attackers3 = argv[i++];
  const defenders3 = argv[i++];
  const def_ool3 = argv[i++];
  const in_progress = parseInt(argv[i++]) > 0;
  const retreat1 = parseInt(argv[i++]);
  const retreat2 = parseInt(argv[i++]);
  const retreat3 = parseInt(argv[i++]);
  const aalast1 = parseInt(argv[i++]) > 0;
  const aalast2 = parseInt(argv[i++]) > 0;
  const aalast3 = parseInt(argv[i++]) > 0;
  const rounds1 = parseInt(argv[i++]);
  const rounds2 = parseInt(argv[i++]);
  const rounds3 = parseInt(argv[i++]);
  const crash1 = parseInt(argv[i++]) > 0;
  const crash2 = parseInt(argv[i++]) > 0;
  const crash3 = parseInt(argv[i++]) > 0;
  const diceModeIn = parseInt(argv[i++]);
  let diceMode: DiceMode;
  switch (diceModeIn) {
    case 0:
      diceMode = 'standard';
      break;
    case 1:
      diceMode = 'biased';
      break;
    case 2:
      diceMode = 'lowluck';
      break;
    default:
      diceMode = 'standard';
  }
  const verbose_level = parseInt(argv[i++]);

  console.time('Execution Time');

  const wavearr: wave_input[] = [];

  const wave1: wave_input = {
    attacker: attackers,
    defender: defenders,
    def_ool: '',
    def_aalast: aalast1,
    att_submerge: att_submerge,
    def_submerge: def_submerge,
    att_dest_last: att_destroyer_last,
    def_dest_last: def_destroyer_last,
    is_crash_fighters: crash1,
    rounds: rounds1,
    retreat_threshold: retreat1,
    retreat_lose_air_probability: 1.0,
  };
  const wave2: wave_input = {
    attacker: attackers2,
    defender: defenders2,
    def_ool: def_ool2,
    def_aalast: aalast2,
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: crash2,
    rounds: rounds2,
    retreat_threshold: retreat2,
    retreat_lose_air_probability: 1.0,
  };
  const wave3: wave_input = {
    attacker: attackers3,
    defender: defenders3,
    def_ool: def_ool3,
    def_aalast: aalast3,
    att_submerge: false,
    def_submerge: false,
    att_dest_last: false,
    def_dest_last: false,
    is_crash_fighters: crash3,
    rounds: rounds3,
    retreat_threshold: retreat3,
    retreat_lose_air_probability: 1.0,
  };
  wavearr.push(wave1);
  if (attackers2.length > 0) {
    wavearr.push(wave2);
  }
  if (attackers3.length > 0) {
    wavearr.push(wave3);
  }

  const input: multiwave_input = {
    wave_info: wavearr,
    debug: debug > 0,
    prune_threshold: prune_threshold,
    report_prune_threshold: report_prune_threshold,
    is_naval: isnaval > 0,
    in_progress: in_progress,
    diceMode: diceMode,
    sortMode: 'unit_count',
    is_deadzone: false,
    report_complexity_only: false, // default to false if not provided
    territory_value: 0, // default to 0 if not provided
    retreat_round_zero: false,
    do_roundless_eval: false,
    num_runs: num_runs,
    verbose_level: verbose_level,
  };

  console.log('input', input);

  const output = multiwave(input);

  console.log('output', JSON.stringify(output, null, 4));

  console.timeEnd('Execution Time');
}
