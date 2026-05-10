import type { BattleMode, UnitId } from '../types.ts'

export const modeUnitMap: Record<BattleMode, readonly UnitId[]> = {
  land: ['inf', 'art', 'arm', 'fig', 'bom', 'aa', 'cru', 'bat'],
  sea: ['fig', 'bom', 'sub', 'tra', 'des', 'cru', 'acc', 'bat', 'dbat'],
  sbr: ['bom', 'ic'],
}

export const attackerOolPresets: Record<BattleMode, Array<{id: string; label: string; ool: UnitId[]}>> = {
  land: [
    {
      id: 'inf-art-tnk-fig-bom',
      label: 'Inf - Art - Tnk - Fig - Bom',
      ool: ['inf', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-art-tnk-bom-fig',
      label: 'Inf - Art - Tnk - Bom - Fig',
      ool: ['inf', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'inf-art-bom-tnk-fig',
      label: 'Inf - Art - Bom - Tnk - Fig',
      ool: ['inf', 'art', 'bom', 'arm', 'fig'],
    },
    {
      id: 'inf-bom-art-tnk-fig',
      label: 'Inf - Bom - Art - Tnk - Fig',
      ool: ['inf', 'bom', 'art', 'arm', 'fig'],
    },
    {
      id: 'bom-inf-art-tnk-fig',
      label: 'Bom - Inf - Art - Tnk - Fig',
      ool: ['bom', 'inf', 'art', 'arm', 'fig'],
    },
  ],
  sea: [
    {
      id: 'acc-sub-des-fig-cru-bom-bat',
      label: 'ACC - Sub - Des - Fig - Cru - Bom - Bat',
      ool: ['acc', 'sub', 'des', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'acc-sub-des-cru-fig-bom-bat',
      label: 'ACC - Sub - Des - Cru - Fig - Bom - Bat',
      ool: ['acc', 'sub', 'des', 'cru', 'fig', 'bom', 'bat'],
    },
    {
      id: 'acc-des-sub-fig-cru-bom-bat',
      label: 'ACC - Des - Sub - Fig - Cru - Bom - Bat',
      ool: ['acc', 'des', 'sub', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'sub-des-acc-fig-cru-bom-bat',
      label: 'Sub - Des - ACC - Fig - Cru - Bom - Bat',
      ool: ['sub', 'des', 'acc', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'sub-des-fig-cru-bom-acc-bat',
      label: 'Sub - Des - Fig - Cru - Bom - ACC - Bat',
      ool: ['sub', 'des', 'fig', 'cru', 'bom', 'acc', 'bat'],
    },
    {
      id: 'sub-des-cru-fig-acc-bom-bat',
      label: 'Sub - Des - Cru - Fig - ACC - Bom - Bat',
      ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bom', 'bat'],
    },
  ],
  sbr: [
    {
      id: 'standard',
      label: 'Standard (bom)',
      ool: ['bom'],
    },
  ],
}

export const attackerAmphibOolPresets: Record<BattleMode, Array<{id: string; label: string; ool: UnitId[]}>> = {
  land: [
    {
      id: 'inf-art-tnk-fig-bom',
      label: 'Inf - Inf_A - Art - Art_A - Tnk - Tnk_A - Fig - Bom',
      ool: ['inf', 'inf_a', 'art', 'art_a', 'arm', 'arm_a', 'fig', 'bom'],
    },
    {
      id: 'inf-art-tnk-bom-fig',
      label: 'Inf - Inf_A - Art - Art_A - Tnk - Tnk_A - Bom - Fig',
      ool: ['inf', 'inf_a', 'art', 'art_a', 'arm', 'arm_a', 'bom', 'fig'],
    },
    {
      id: 'inf-art-bom-tnk-fig',
      label: 'Inf - Inf_A - Art - Art_A - Bom - Tnk - Tnk_A - Fig',
      ool: ['inf', 'inf_a', 'art', 'art_a', 'bom', 'arm', 'arm_a', 'fig'],
    },
    {
      id: 'inf-bom-art-tnk-fig',
      label: 'Inf - Inf_A - Bom - Art - Art_A - Tnk - Tnk_A - Fig',
      ool: ['inf', 'inf_a', 'bom', 'art', 'art_a', 'arm', 'arm_a', 'fig'],
    },
    {
      id: 'bom-inf-art-tnk-fig',
      label: 'Bom - Inf - Inf_A - Art - Art_A - Tnk - Tnk_A - Fig',
      ool: ['bom', 'inf', 'inf_a', 'art', 'art_a', 'arm', 'arm_a', 'fig'],
    },
  ],
  sea: attackerOolPresets.sea,
  sbr: attackerOolPresets.sbr,
}

export const defenderOolPresets: Record<BattleMode, Array<{id: string; label: string; ool: UnitId[]}>> = {
  land: [
    {
      id: 'aa-inf-art-tnk-bom-fig',
      label: 'AA - Inf - Art - Tnk - Bom - Fig',
      ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'aa-inf-art-tnk-fig-bom',
      label: 'AA - Inf - Art - Tnk - Fig - Bom',
      ool: ['aa', 'inf', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'aa-inf-art-bom-tnk-fig',
      label: 'AA - Inf - Art - Bom - Tnk - Fig',
      ool: ['aa', 'inf', 'art', 'bom', 'arm', 'fig'],
    },
    {
      id: 'aa-inf-bom-art-tnk-fig',
      label: 'AA - Inf - Bom - Art - Tnk - Fig',
      ool: ['aa', 'inf', 'bom', 'art', 'arm', 'fig'],
    },
    {
      id: 'aa-bom-inf-art-tnk-fig',
      label: 'AA - Bom - Inf - Art - Tnk - Fig',
      ool: ['aa', 'bom', 'inf', 'art', 'arm', 'fig'],
    },
    {
      id: 'inf-aa-art-tnk-fig-bom',
      label: 'Inf - AA - Art - Tnk - Fig - Bom',
      ool: ['inf', 'aa', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-aa-art-tnk-bom-fig',
      label: 'Inf - AA - Art - Tnk - Bom - Fig',
      ool: ['inf', 'aa', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'inf-art-aa-tnk-fig-bom',
      label: 'Inf - Art - AA - Tnk - Fig - Bom',
      ool: ['inf', 'art', 'aa', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-art-aa-tnk-bom-fig',
      label: 'Inf - Art - AA - Tnk - Bom - Fig',
      ool: ['inf', 'art', 'aa', 'arm', 'bom', 'fig'],
    },
  ],
  sea: [
    {
      id: 'sub-des-acc-cru-fig-bat',
      label: 'Sub - Des - ACC - Cru - Fig - Bat',
      ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat'],
    },
    {
      id: 'sub-des-acc-cru-fig-bat-2',
      label: 'Sub - Des - ACC - Cru - Fig - Bat',
      ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat'],
    },
    {
      id: 'sub-des-fig-acc-cru-bat',
      label: 'Sub - Des - Fig - ACC - Cru - Bat',
      ool: ['sub', 'des', 'fig', 'acc', 'cru', 'bat'],
    },
    {
      id: 'sub-des-fig-cru-acc-bat',
      label: 'Sub - Des - Fig - Cru - ACC - Bat',
      ool: ['sub', 'des', 'fig', 'cru', 'acc', 'bat'],
    },
    {
      id: 'sub-des-cru-acc-fig-bat',
      label: 'Sub - Des - Cru - ACC - Fig - Bat',
      ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bat'],
    },
    {
      id: 'sub-des-cru-fig-acc-bat',
      label: 'Sub - Des - Cru - Fig - ACC - Bat',
      ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bat'],
    },
    {
      id: 'sub-acc-des-cru-fig-bat',
      label: 'Sub - ACC - Des - Cru - Fig - Bat',
      ool: ['sub', 'acc', 'des', 'cru', 'fig', 'bat'],
    },
  ],
  sbr: [
    {
      id: 'standard',
      label: 'Standard (ic)',
      ool: ['ic'],
    },
  ],
}
