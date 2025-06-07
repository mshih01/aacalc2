import {
  type MultiwaveInput,
  type MultiwaveOutput,
  multiwaveExternal,
  sbrExternal,
  type SbrInput,
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

test('sbrExternal', () => {
  const input: SbrInput = {
    verbose_level: 0,
    diceMode: 'standard',
    attack: {
      units: {
        bom: 5,
      },
      ool: ['bom'],
      takes: 0,
      aaLast: false,
    },
    defense: {
      units: {
        ic: 20,
      },
      ool: ['ic'],
      takes: 0,
      aaLast: false,
    },
    in_progress: false,
    reportPruneThreshold: 1e-12,
    pruneThreshold: 1e-12,
  };
  let output = sbrExternal(input);

  expect(output.attack.survives[0]).to.closeTo(0.999871399176955, 1e-6);
  expect(output.attack.ipcLoss[0]).to.closeTo(10, 1e-6);
  expect(output.defense.survives[0]).to.closeTo(0.8556527702363717, 1e-6);
  expect(output.defense.ipcLoss[0]).to.closeTo(14.329007261845037, 1e-6);
});
