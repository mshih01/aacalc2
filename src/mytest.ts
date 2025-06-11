import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
} from './index.js';

const input: MultiwaveInput = {
  wave_info: [
    {
      attack: {
        units: {
          inf: 3,
          arm: 2,
          fig: 3,
        },
        ool: ['inf', 'art', 'arm', 'fig', 'bom'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: {
          inf: 4,
          art: 2,
          arm: 1,
          aa: 1,
        },
        ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
        takes: 0,
        aaLast: false,
      },
      att_submerge: false,
      def_submerge: false,
      att_dest_last: false,
      def_dest_last: false,
      is_crash_fighters: false,
      rounds: 100,
      retreat_threshold: 0,
      retreat_expected_ipc_profit_threshold: 0,
    },
  ],
  debug: false,
  prune_threshold: 1e-12,
  report_prune_threshold: 1e-12,
  is_naval: false,
  in_progress: false,
  num_runs: 1,
  verbose_level: 3,
  diceMode: 'standard',
};

let output = multiwaveExternal(input);
console.log(output, 'multiwaveExternal expected profit output');
