import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
} from './index.js';
import { test, expect } from 'vitest';

test('multiwaveExternal', () => {
  const input: MultiwaveInput = {
    wave_info: [
      {
        attack: {
          units: {
            sub: 10,
            bat: 10,
          },
          ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bom', 'bat'],
          takes: 0,
          aaLast: false,
        },
        defense: {
          units: {
            sub: 10,
            bat: 10,
          },
          ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bat'],
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
    verbose_level: 0,
    diceMode: 'standard',
  };

  let output = multiwaveExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.785045644306524, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(145.518327700801, 1e-6);
  expect(output.defense.survives[0]).to.closeTo(0.2015387892399474, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(242.3648995989333, 1e-6);
});
