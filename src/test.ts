import * as readline from 'readline';

import {
  type DiceMode,
  type multiwave_input,
  type wave_input,
  multiwave,
  type aacalc_input,
  aacalc,
} from './solve.js';

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
    case 0:
      run2(argc, argv);
      break;
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
    num_runs: num_runs,
    verbose_level: verbose_level,
  };

  console.log('input', input);

  const output = multiwave(input);

  console.log('output', JSON.stringify(output, null, 4));

  console.timeEnd('Execution Time');
}

function run2(argc: number, argv: string[]) {
  let i = 1;
  const debug = parseInt(argv[i++]);
  const report_prune_threshold = parseFloat(argv[i++]);
  const prune_threshold = parseFloat(argv[i++]);
  const isnaval = parseInt(argv[i++]);
  const attackers = argv[i++];
  const defenders = argv[i++];

  const strafe_threshold = parseFloat(argv[i++]);
  const num_runs = Math.max(parseInt(argv[i++]), 1);
  const retreat_threshold = parseInt(argv[i++]);
  const in_progress = parseInt(argv[i++]) > 0;

  let att_destroyer_last = 0;
  let def_destroyer_last = 0;
  let att_submerge = 0;
  let def_submerge = 0;
  if (isnaval > 0) {
    att_destroyer_last = Math.max(parseInt(argv[i++]), 0);
    att_submerge = Math.max(parseInt(argv[i++]), 0);
    def_destroyer_last = Math.max(parseInt(argv[i++]), 0);
    def_submerge = Math.max(parseInt(argv[i++]), 0);
  }
  const verbose_level = parseInt(argv[i++]);

  console.time('Execution Time');
  console.log(`debug = ${debug}`);
  console.log(`report_prune_threshold = ${report_prune_threshold}`);
  console.log(`prune_threshold = ${prune_threshold}`);
  console.log(`isnaval = ${isnaval}`);
  console.log(`in_progress = ${in_progress}`);
  console.log(`attackers = ${attackers}`);
  console.log(`defenders = ${defenders}`);
  console.log(`retreat_threshold = ${retreat_threshold}`);
  console.log(debug);

  const input: aacalc_input = {
    attacker: attackers,
    defender: defenders,
    debug: debug > 0,
    prune_threshold: prune_threshold,
    report_prune_threshold: report_prune_threshold,
    is_naval: isnaval > 0,
    is_in_progress: in_progress,
    att_destroyer_last: att_destroyer_last > 0,
    def_destroyer_last: def_destroyer_last > 0,
    att_submerge_sub: att_submerge > 0,
    def_submerge_sub: def_submerge > 0,
    num_runs: num_runs,
    diceMode: 'standard',
    retreat_threshold: retreat_threshold,
    verbose_level: verbose_level,
  };
  console.log('input', input);

  const output = aacalc(input);

  console.log('output', JSON.stringify(output, null, 4));
  console.log('casualtiesInfo', JSON.stringify(output.casualtiesInfo, null, 4));
  console.log('att_cas', JSON.stringify(output.att_cas, null, 4));
  console.log('def_cas', JSON.stringify(output.def_cas, null, 4));

  console.timeEnd('Execution Time');
}
