import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
} from '../index.js';

const base: MultiwaveInput = {
  wave_info: [
    {
      attack: {
        units: { des: 2 },
        ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: { acc: 1, fig: 2, cru: 1 },
        ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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
    },
    {
      attack: {
        units: { des: 5 },
        ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: { fig: 2 },
        ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat', 'tra'],
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
    },
  ],
  debug: false,
  prune_threshold: 1e-12,
  report_prune_threshold: 1e-12,
  is_naval: true,
  in_progress: false,
  num_runs: 1,
  verbose_level: 3,
  diceMode: 'standard',
  sortMode: 'unit_count',
  retreat_round_zero: true,
};

const off = multiwaveExternal(base);
console.log(off, 'off');
const on = multiwaveExternal({
  ...base,
  multiwave_enforce_naval_fighters_carriers: true,
});

console.log(on, 'on');

// With the option on, the 2 extra reinforcement fighters (4 air vs 2/carrier
// capacity) cannot fight on wave 2, so the defender survives wave 2 less often.
