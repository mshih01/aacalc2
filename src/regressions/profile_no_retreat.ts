import { type MultiwaveInput, multiwaveExternal } from '../index.js';

const verbose = 0;

const input: MultiwaveInput = {
  wave_info: [
    {
      attack: {
        units: {
          inf: 150,
          art: 40,
          fig: 10,
        },
        ool: ['inf', 'art', 'arm', 'fig', 'bom'],
        takes: 0,
        aaLast: false,
      },
      defense: {
        units: {
          inf: 150,
          art: 40,
          fig: 6,
          aa: 3,
        },
        ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
        takes: 0,
        aaLast: true,
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
  is_naval: false,
  in_progress: false,
  num_runs: 1,
  verbose_level: verbose,
  diceMode: 'standard',
  sortMode: 'ipc_cost',
};

for (let i = 0; i < 10; i++) {
  console.log('starting...');
  const t0 = performance.now();
  const output = multiwaveExternal(input);
  const t1 = performance.now() - t0;
  console.log(`runtime: ${t1.toFixed(1)}ms`);
  console.log(
    'profit:',
    (output.defense.ipcLoss[0] - output.attack.ipcLoss[0]).toFixed(3),
  );
}
