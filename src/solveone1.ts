import { Heap } from 'heap-js';

import type { UnitIdentifier } from './external.js';
import {
  remove_subhits2,
  remove_planehits2,
  remove_navalhits2,
  remove_dlast_subhits2,
  remove_dlast_planehits2,
  remove_dlast_navalhits2,
  is_retreat_state,
  hasDestroyer,
} from './solve.js';

import type { general_problem } from './solve.js';

const epsilon: number = 1e-9;

export type DiceMode = 'standard' | 'lowluck' | 'biased';

export type SortMode = 'unit_count' | 'ipc_cost';

// iterate all possible next states -- and update the probabilities
export function solve_one_general_state_copy1(
  problem: general_problem,
  N: number,
  M: number,
  allow_same_state: boolean,
  numBombard: number,
  do_retreat_only: boolean,
  disable_retreat: boolean,
  onNextState: (
    problem: general_problem,
    ii: number,
    prob: number,
    n: number,
    m: number,
    num_rounds: number, // incremental number of rounds
  ) => void = (problem, ii, prob, n: number, m: number, num_rounds: number) => {
    problem.P_1d[ii] += prob;
    // problem.setiP(ii, problem.getiP(ii) + prob);
  },
  onInitState: (problem: general_problem, n: number, m: number) => number = (
    problem,
    n,
    m,
  ) => problem.getP(n, m),
  onExitState: (problem: general_problem, n: number, m: number) => void = (
    problem,
    n,
    m,
  ) => {},
) {
  const attnode = problem.att_data.nodeArr[N];
  const defnode = problem.def_data.nodeArr[M];

  if (attnode.N == 0 || defnode.N == 0) {
    onExitState(problem, N, M);
    return;
  }

  //console.log(N, M, "solve_one_naval");
  //const p_init = problem.getP(N, M);
  const p_init = onInitState(problem, N, M);

  if (p_init == 0) {
    onExitState(problem, N, M);
    return;
  }
  if (!disable_retreat && is_retreat_state(problem, N, M)) {
    if (problem.is_amphibious) {
      if (
        attnode.N > 0 &&
        defnode.N > 0 &&
        attnode.retreat.length == 0 &&
        attnode.next_retreat_amphibious != undefined
      ) {
        const n = attnode.next_retreat_amphibious.index;
        const m = defnode.index;
        const ii = problem.getIndex(n, m);
        onNextState(problem, ii, p_init, n, m, 0);
        //problem.setiP(ii, problem.getiP(ii) + p_init);
        problem.setP(N, M, 0);
        onExitState(problem, N, M);
        return;
      }
    } else {
      onExitState(problem, N, M);
      return;
    }
  }

  if (p_init < problem.prune_threshold) {
    problem.setP(N, M, 0);
    onExitState(problem, N, M);
    return;
  }

  const N1 = attnode.num_subs;
  const N2 = attnode.num_air;
  const N3 = attnode.num_naval;
  const M1 = defnode.num_subs;
  const M2 = defnode.num_air;
  const M3 = defnode.num_naval;

  const att_destroyer = hasDestroyer(problem.att_data, attnode);
  const def_destroyer = hasDestroyer(problem.def_data, defnode);
  const att_dlast = problem.att_data.destroyer_last && M1 > 0;
  const def_dlast = problem.def_data.destroyer_last && N1 > 0;

  const att_submerge =
    problem.att_data.submerge_sub && N1 > 0 && !def_destroyer;
  const def_submerge =
    problem.def_data.submerge_sub && M1 > 0 && !att_destroyer;

  if (att_submerge || def_submerge) {
    let n = attnode.index;
    let m = defnode.index;
    if (att_submerge) {
      if (attnode.next_submerge == undefined) {
        throw new Error();
      }
      n = attnode.next_submerge.index;
    }
    if (def_submerge) {
      if (defnode.next_submerge == undefined) {
        throw new Error();
      }
      m = defnode.next_submerge.index;
    }
    const ii = problem.getIndex(n, m);

    onNextState(problem, ii, p_init, n, m, 0);
    //problem.setiP(ii, problem.getiP(ii) + p_init);

    problem.setP(N, M, 0);
    onExitState(problem, N, M);
    return;
  }
  if (defnode.next_remove_noncombat != undefined) {
    const n = attnode.index;
    const m = defnode.next_remove_noncombat.index;
    const ii = problem.getIndex(n, m);
    onNextState(problem, ii, p_init, n, m, 0);
    //problem.setiP(ii, problem.getiP(ii) + p_init);
    problem.setP(N, M, 0);
    onExitState(problem, N, M);
    return;
  }
  if (do_retreat_only) {
    onExitState(problem, N, M);
    return;
  }

  const att_sub = problem.att_data.sub_group;
  const att_air = problem.att_data.air_group;
  let att_naval = problem.att_data.naval_group;
  if (attnode.dlast && problem.att_data.dlast_group != undefined) {
    att_naval = problem.att_data.dlast_group;
  }
  const def_sub = problem.def_data.sub_group;
  const def_air = problem.def_data.air_group;
  let def_naval = problem.def_data.naval_group;
  if (defnode.dlast && problem.def_data.dlast_group != undefined) {
    def_naval = problem.def_data.dlast_group;
  }
  if (defnode.naval_group != undefined) {
    def_naval = defnode.naval_group;
  }

  // prob no hits.
  let P0 =
    att_sub.get_prob_table(N1, 0) *
    att_air.get_prob_table(N2, 0) *
    att_naval.get_prob_table(N3, 0) *
    def_sub.get_prob_table(M1, 0) *
    def_air.get_prob_table(M2, 0) *
    def_naval.get_prob_table(M3, 0);

  // subs vs. planes.
  if (N1 > 0 && N2 == 0 && N3 == 0 && M1 == 0 && M2 > 0 && M3 == 0) {
    onExitState(problem, N, M);
    return;
  }
  if (M1 > 0 && M2 == 0 && M3 == 0 && N1 == 0 && N2 > 0 && N3 == 0) {
    onExitState(problem, N, M);
    return;
  }
  // attacker all subs
  if (N1 > 0 && N2 == 0 && N3 == 0 && M2 > 0) {
    if (!def_destroyer) {
      // def no destroyer && def plane_hits > 0 && sub hits == 0 && naval hits == 0
      const p =
        att_sub.get_prob_table(N1, 0) *
        def_sub.get_prob_table(M1, 0) *
        def_naval.get_prob_table(M3, 0) *
        (1 - def_air.get_prob_table(M2, 0)); // > 0 plane hits... that don't apply.
      P0 += p;
    }
  }
  // defender all subs
  if (M1 > 0 && M2 == 0 && M3 == 0 && N2 > 0) {
    if (!att_destroyer) {
      const p =
        def_sub.get_prob_table(M1, 0) *
        att_sub.get_prob_table(N1, 0) *
        att_naval.get_prob_table(N3, 0) *
        (1 - att_air.get_prob_table(N2, 0)); // > 0 plane hits... that don't apply.
      P0 += p;
    }
  }

  // attacker all planes.
  if (N1 == 0 && N2 > 0 && N3 == 0 && M1 > 0) {
    const p =
      att_air.get_prob_table(N2, 0) *
      def_naval.get_prob_table(M3, 0) *
      def_air.get_prob_table(M2, 0) *
      (1 - def_sub.get_prob_table(M1, 0));
    P0 += p;
  }
  // defender all planes.
  if (M1 == 0 && M2 > 0 && M3 == 0 && N1 > 0) {
    const p =
      def_air.get_prob_table(M2, 0) *
      att_naval.get_prob_table(N3, 0) *
      att_air.get_prob_table(N2, 0) *
      (1 - att_sub.get_prob_table(N1, 0));
    P0 += p;
  }

  const r2 = 1 / (1 - P0);
  let r = p_init * r2;
  if (allow_same_state) {
    r = p_init;
  }

  let prob: number;
  let p2, p3, p4, p5: number;

  /*
   *  N1 ==> sub hits
   *  N2 ==> plane hits
   *  N3 ==> naval hits
   */

  let i1, i2, i3;
  let j1, j2, j3;
  let newM1, newM2, newM3;
  let newN1, newN2, newN3;
  const hasSubs = N1 > 0 || M1 > 0;
  //hasSubs = true;

  let def_remove_subhits_function = remove_dlast_subhits2;
  let def_remove_planehits_function = remove_dlast_planehits2;
  let def_remove_navalhits_function = remove_dlast_navalhits2;
  if (!def_dlast) {
    def_remove_subhits_function = remove_subhits2;
    def_remove_planehits_function = remove_planehits2;
    def_remove_navalhits_function = remove_navalhits2;
  }
  let att_remove_subhits_function = remove_dlast_subhits2;
  let att_remove_planehits_function = remove_dlast_planehits2;
  let att_remove_navalhits_function = remove_dlast_navalhits2;
  if (!att_dlast) {
    att_remove_subhits_function = remove_subhits2;
    att_remove_planehits_function = remove_planehits2;
    att_remove_navalhits_function = remove_navalhits2;
  }
  problem.setP(N, M, 0);

  const enable_airsub_optimization = true;
  const enable_airsub_optimization2 = true;

  if (
    !hasSubs &&
    attnode.nosub_group != undefined &&
    defnode.nosub_group != undefined
  ) {
    const att_nosub = attnode.nosub_group;
    const def_nosub = defnode.nosub_group;
    let i, j;
    const NNN = N2 + N3;
    const MMM = M2 + M3;
    const P0 =
      att_nosub.get_prob_table(NNN, 0) * def_nosub.get_prob_table(MMM, 0);
    const r2 = 1 / (1 - P0);
    let r = p_init * r2;
    if (allow_same_state) {
      r = p_init;
    }
    let curr_defnode = defnode;
    let curr_attnode = attnode;
    for (j = 0; j < numBombard; j++) {
      curr_attnode = curr_attnode.next_navalhit;
    }
    const start_attnode = curr_attnode;

    for (i = 0; i <= NNN; i++) {
      //let mm = remove_navalhits2(defnode, i);
      const m = curr_defnode.index;
      const p1 = att_nosub.get_prob_table(NNN, i) * r;
      let curr_attnode = start_attnode;
      for (j = 0; j <= MMM; j++) {
        prob = p1 * def_nosub.get_prob_table(MMM, j);
        //let nn = remove_navalhits2(attnode, j + numBombard);
        const n = curr_attnode.index;
        const ii = problem.getIndex(n, m);
        onNextState(problem, ii, prob, n, m, r2);
        //problem.setiP(ii, problem.getiP(ii) + prob);
        curr_attnode = curr_attnode.next_navalhit;
      }
      curr_defnode = curr_defnode.next_navalhit;
    }
  } else if (
    enable_airsub_optimization &&
    problem.rounds < 0 &&
    !problem.is_retreat &&
    problem.is_naval &&
    N3 == 0 &&
    M3 == 0
  ) {
    // air vs. subs -- cannot hit each other... so can be solved independently.
    if (enable_airsub_optimization2 && problem.nonavalproblem != undefined) {
      problem.setNoNavalP(N1, M1, N2, M2, p_init);
    } else {
      if (N1 > 0 && M1 > 0) {
        const P0 =
          att_sub.get_prob_table(N1, 0) * def_sub.get_prob_table(M1, 0);
        const r2 = 1 / (1 - P0);
        let r = p_init * r2;
        if (allow_same_state) {
          r = p_init;
        }
        for (let i1 = 0; i1 <= N1; i1++) {
          const m = def_remove_subhits_function(defnode, i1);
          const p1 = att_sub.get_prob_table(N1, i1) * r;
          for (let j1 = 0; j1 <= M1; j1++) {
            const n = att_remove_subhits_function(attnode, j1);
            const p2 = p1 * def_sub.get_prob_table(M1, j1);
            const ii = problem.getIndex(n, m);
            onNextState(problem, ii, p2, n, m, r2);
            //problem.setiP(ii, problem.getiP(ii) + p2);
          }
        }
      } else if (N2 > 0 && M2 > 0) {
        const P0 =
          att_air.get_prob_table(N2, 0) * def_air.get_prob_table(M2, 0);
        const r2 = 1 / (1 - P0);
        let r = p_init * r2;
        if (allow_same_state) {
          r = p_init;
        }
        for (let i2 = 0; i2 <= N2; i2++) {
          const m = def_remove_planehits_function(defnode, false, i2);
          const p1 = att_air.get_prob_table(N2, i2) * r;
          for (let j2 = 0; j2 <= M2; j2++) {
            const n = att_remove_planehits_function(attnode, false, j2);
            const p2 = p1 * def_air.get_prob_table(M2, j2);
            const ii = problem.getIndex(n, m);
            onNextState(problem, ii, p2, n, m, r2);
            //problem.setiP(ii, problem.getiP(ii) + p2);
          }
        }
      } else {
        console.log('unexpected -- nonaval resolution');
        throw new Error();
      }
    }
  } else {
    const enable_early_filter = true;
    if (enable_early_filter && N1 * M1 > 2) {
      const m = remove_subhits2(defnode, N1);
      const n = remove_subhits2(attnode, M1);
      const defnode2 = problem.def_data.nodeArr[m];
      const attnode2 = problem.att_data.nodeArr[n];
      newM1 = M1;
      newM2 = M2;
      newM3 = M3;
      newN1 = N1;
      newN2 = N2;
      newN3 = N3;
      if (!def_destroyer) {
        newM1 = defnode2.num_subs;
        newM2 = defnode2.num_air;
        newM3 = defnode2.num_naval;
      }
      if (!att_destroyer) {
        newN1 = attnode2.num_subs;
        newN2 = attnode2.num_air;
        newN3 = attnode2.num_naval;
      }
      const maxV1 = att_air.max_prob_table[newN2];
      const maxV2 = def_air.max_prob_table[newM2];
      const maxV3 = att_naval.max_prob_table[newN3];
      const maxV4 = def_naval.max_prob_table[newM3];
      const maxV5 = att_sub.max_prob_table[newN1];
      const maxV6 = def_sub.max_prob_table[newM1];
      const maxp = r * (maxV1 * maxV2 * maxV3 * maxV4 * maxV5 * maxV6);
      if (maxp < problem.early_prune_threshold) {
        problem.setP(N, M, 0);
        onExitState(problem, N, M);
        return;
      }
    }
    // if not first strike && other side doesn't have planes -- then treat sub his as unconstrained and remove last
    let attack_sub_unconstrained = false;
    let defend_sub_unconstrained = false;
    if (N1 > 0 && def_destroyer && M2 == 0 && N2 > 0) {
      attack_sub_unconstrained = true;
    }
    if (M1 > 0 && att_destroyer && N2 == 0 && M2 > 0) {
      defend_sub_unconstrained = true;
    }
    //console.log(attack_sub_unconstrained, defend_sub_unconstrained, "attack_sub_unconstrained, defend_sub_unconstrained");
    //attack_sub_unconstrained = false;
    //defend_sub_unconstrained = false;
    for (i1 = 0; i1 <= N1; i1++) {
      newN1 = N1;
      newN2 = N2;
      newN3 = N3;
      newM1 = M1;
      newM2 = M2;
      newM3 = M3;
      const defnode2 = attack_sub_unconstrained
        ? defnode
        : problem.def_data.nodeArr[def_remove_subhits_function(defnode, i1)];
      const att_sub_unconstrained_hits = attack_sub_unconstrained ? i1 : 0;
      if (!def_destroyer) {
        if (defnode2 == undefined) {
          console.log(
            i1,
            M,
            problem.def_data.nodeArr[M],
            problem.def_data.nodeArr[M].nsubArr,
            'undefined remove sub',
          );
        }
        newM1 = defnode2.num_subs;
        newM2 = defnode2.num_air;
        newM3 = defnode2.num_naval;
      }
      for (j1 = 0; j1 <= M1; j1++) {
        const attnode2 = defend_sub_unconstrained
          ? attnode
          : problem.att_data.nodeArr[att_remove_subhits_function(attnode, j1)];
        const def_sub_unconstrained_hits = defend_sub_unconstrained ? j1 : 0;
        if (!att_destroyer) {
          newN1 = attnode2.num_subs;
          newN2 = attnode2.num_air;
          newN3 = attnode2.num_naval;
        }
        if (att_destroyer && !def_destroyer) {
          prob =
            att_sub.get_prob_table(N1, i1) *
            def_sub.get_prob_table(newM1, j1) *
            r;
        } else if (!att_destroyer && def_destroyer) {
          prob =
            att_sub.get_prob_table(newN1, i1) *
            def_sub.get_prob_table(M1, j1) *
            r;
        } else {
          prob =
            att_sub.get_prob_table(N1, i1) * def_sub.get_prob_table(M1, j1) * r;
        }
        const maxV1 = att_air.max_prob_table[newN2];
        const maxV2 = def_air.max_prob_table[newM2];
        const maxV3 = att_naval.max_prob_table[newN3];
        const maxV4 = def_naval.max_prob_table[newM3];
        const ept0 =
          problem.early_prune_threshold / (maxV1 * maxV2 * maxV3 * maxV4);
        const ept1 = ept0 * maxV1;
        const ept2 = ept1 * maxV2;
        const ept3 = ept2 * maxV3;
        const ept4 = problem.early_prune_threshold;
        const ept5 = ept1 * maxV3;
        const ept6 = ept0 * maxV2 * maxV4;
        const ept7 = ept2 * maxV4;
        if (prob < ept0) {
          continue;
        }

        if (
          (att_destroyer || def_destroyer) &&
          attnode.nosub_group != undefined &&
          defnode.nosub_group != undefined
        ) {
          if (att_destroyer && def_destroyer) {
            const att_nosub = attnode.nosub_group;
            const def_nosub = defnode.nosub_group;
            let i, j;
            const NNN = N2 + N3;
            const MMM = M2 + M3;
            for (i = 0; i <= NNN; i++) {
              const p1 = att_nosub.get_prob_table(NNN, i) * prob;
              if (p1 < ept5) {
                continue;
              }
              const m = def_remove_navalhits_function(
                defnode2,
                i + att_sub_unconstrained_hits,
              );
              for (j = 0; j <= MMM; j++) {
                const p2 = p1 * def_nosub.get_prob_table(MMM, j);
                if (p2 < ept4) {
                  continue;
                }
                const n = att_remove_navalhits_function(
                  attnode2,
                  j + def_sub_unconstrained_hits,
                );
                const ii = problem.getIndex(n, m);
                onNextState(problem, ii, p2, n, m, r2);
                //problem.setiP(ii, problem.getiP(ii) + p2);
              }
            }
          } else if (att_destroyer) {
            const att_nosub = attnode.nosub_group;
            let i;
            const NNN = N2 + N3;
            for (i = 0; i <= NNN; i++) {
              const p1 = att_nosub.get_prob_table(NNN, i) * prob;
              if (p1 < ept5) {
                continue;
              }
              const m = def_remove_navalhits_function(defnode2, i);
              for (j2 = 0; j2 <= newM2; j2++) {
                p3 = p1 * def_air.get_prob_table(newM2, j2);
                if (p3 < ept3) {
                  continue;
                }
                const n2 = att_remove_planehits_function(
                  attnode2,
                  def_destroyer,
                  j2,
                );
                const attnode3 = problem.att_data.nodeArr[n2];
                for (j3 = 0; j3 <= newM3; j3++) {
                  p5 = p3 * def_naval.get_prob_table(newM3, j3);
                  if (p5 < ept4) {
                    continue;
                  }
                  const n3 = att_remove_navalhits_function(
                    attnode3,
                    j3 + def_sub_unconstrained_hits,
                  );
                  const ii = problem.getIndex(n3, m);
                  onNextState(problem, ii, p5, n3, m, r2);
                  //problem.setiP(ii, problem.getiP(ii) + p5);
                }
              }
            }
          } else {
            const def_nosub = defnode.nosub_group;
            let j;
            const MMM = M2 + M3;
            for (j = 0; j <= MMM; j++) {
              const p1 = prob * def_nosub.get_prob_table(MMM, j);
              if (p1 < ept6) {
                continue;
              }
              const n = att_remove_navalhits_function(attnode2, j);
              for (i2 = 0; i2 <= newN2; i2++) {
                p3 = p1 * att_air.get_prob_table(newN2, i2);
                if (p3 < ept7) {
                  continue;
                }
                const m2 = def_remove_planehits_function(
                  defnode2,
                  att_destroyer,
                  i2,
                );
                const defnode3 = problem.def_data.nodeArr[m2];
                for (i3 = 0; i3 <= newN3; i3++) {
                  p5 = p3 * att_naval.get_prob_table(newN3, i3);
                  if (p5 < ept4) {
                    continue;
                  }
                  const m3 = def_remove_navalhits_function(
                    defnode3,
                    i3 + att_sub_unconstrained_hits,
                  );
                  const ii = problem.getIndex(n, m3);
                  onNextState(problem, ii, p5, n, m3, r2);
                  //problem.setiP(ii, problem.getiP(ii) + p5);
                }
              }
            }
          }
        } else {
          for (i2 = 0; i2 <= newN2; i2++) {
            p2 = prob * att_air.get_prob_table(newN2, i2);
            if (p2 < ept1) {
              continue;
            }
            const m2 = def_remove_planehits_function(
              defnode2,
              att_destroyer,
              i2,
            );
            const defnode3 = problem.def_data.nodeArr[m2];
            for (j2 = 0; j2 <= newM2; j2++) {
              p3 = p2 * def_air.get_prob_table(newM2, j2);
              if (p3 < ept2) {
                continue;
              }
              const n2 = att_remove_planehits_function(
                attnode2,
                def_destroyer,
                j2,
              );
              const attnode3 = problem.att_data.nodeArr[n2];
              for (i3 = 0; i3 <= newN3; i3++) {
                p4 = p3 * att_naval.get_prob_table(newN3, i3);
                if (p4 < ept3) {
                  continue;
                }
                const m3 = def_remove_navalhits_function(
                  defnode3,
                  i3 + att_sub_unconstrained_hits,
                );
                for (j3 = 0; j3 <= newM3; j3++) {
                  p5 = p4 * def_naval.get_prob_table(newM3, j3);
                  if (p5 < ept4) {
                    continue;
                  }
                  const n3 = att_remove_navalhits_function(
                    attnode3,
                    j3 + def_sub_unconstrained_hits,
                  );
                  const ii = problem.getIndex(n3, m3);
                  onNextState(problem, ii, p5, n3, m3, r2);
                  //problem.setiP(ii, problem.getiP(ii) + p5);
                }
              }
            }
          }
        }
      }
    }
  }
  if (!allow_same_state) {
    problem.setP(N, M, 0);
  }
  onExitState(problem, N, M);
}
