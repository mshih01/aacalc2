#Axis and Allies 1942 Online probability calculator engine

##Overview:

Axis and Allies odds calculator with advanced features.
- math based probability computation
- basic capabilites
    - land / sea battles with sub/destroyer/air rules.
    - aa guns, shore bombardments
    - custom order of loss
- awesome advanced features inspired by popovitsj's aa1942calc.com.
    - multiwave calculation
    - amphibious assaults with planned retreat
    - standard - biased - lowluck dice
    - strategic bombing analysis.
- advanced features:
    - retreat if the exepcted profit is too low.
        - consider the territory is a deadzone
        - consider the territory value for the EV analysis.
    - retreat if the probability of winning is too low (takes / kills)
    - retreat if the probability of losing air is too high
    - retreat if the probability of destroying the defender is too high (strafe / attack to retreat)

##Future work:

- The current cost reporting and EV based analysis is based IPC cost of units.  
    - This could be generalized to any arbitrary cost function (user input -- or custom preset)
        - For example a cost function that emphasizes unit count. 
        - Or one that mirrors attack power.
        - Or one that mirrors attack strength.
        - Or a cost function which gives extra weight for losing air 
            - (e.g. a russian/german fighter worth more than others)

- Take and hold analysis... In multiwave -- switch sides in between waves to model takes and hold.

- Army recommendation.   
    - Given an attacking army and defending army, and a target percentage
        - recommend a subset of the defending army that meets target percentage to defend.
        - recommend a subset of the attacking army that meets target percentage to win.

    - Multi-territory defense analysis: (For VC win analysis)
        - Need to optimize odds to hold 3 or more territories.
        - Input:  
            - attacking forces for each of the territories.
            - total number of defending units.
        - Output:
            - the army composition for each territory that maximizes the chance to defend.

##Example usage:

```
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
					inf: 5,
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
			rounds: 100, // 100 means all rounds.
			retreat_threshold: 0, // retreat if number of attackers <= threshold
			retreat_expected_ipc_profit_threshold: 0, // optional. retreat if the EV less than threshold
		},
	],
	debug: false,
	prune_threshold: 1e-12, // prune threshold during computation
	report_prune_threshold: 1e-12, // prune threshold for reporting only.
	is_naval: false,
	in_progress: false,
	num_runs: 1,
	verbose_level: 0,
	diceMode: 'standard', // standard - lowluck - biased
	sortMode: 'unit_count', // unit_count - ipc_cost
};

let output = multiwaveExternal(input);
```



##Technical overview:

### How it works. 

From a very high level -- the calculator is super simple code. 

The original prototype in C was the following two loops:

// initilal state probability
//P[N][M] = 1.0;
//P[i][j] = 0.0 for all other i, j;

// the outer loop scheduler
for (i = N; i > 0; i--) {
    for (j = M; j > 0; j--) {
        solve_one_state(problem, i, j);
    }
}

// solve one state.
void solve_one_state(problem, n, m) {
    if (n == 0 && m == 0) {G
        return;
    }
    double P0 = Pa[n][0] * Pd[m][0];
    double r = (double)1/(1-P0);
    double prob;
    int i,j;
    int new_i, new_j;
        /*  i att hits, j def hits /
    for (i = 0; i <= n;i++) {
        for (j = 0; j <= M; j++) {
            prob = Pa[n][i] Pd[m][j] * r * p_init;
            new_i = n-j;
            new_j = m-i;
            if (new_i < 0) new_i = 0;
            if (new_j < 0) new_j = 0;
            P[new_i][new_j] += prob;
        }
    }
    P[n][m] = 0;
}

This simple code will solve any battle of N attackers vs. M defenders with fixed order
of losses (no special units like subs, AA's, bombardments).

Pa[i][j] is the probability that i attacking units gets j hits.
Pd[i][j] is the probability that i defending units gets j hits.

P[i][j] is the probability that we are "currently" in the state i attackers vs. j defenders.

It is initialized to P[N][M] = 1.0... and rest zeros

At the end of computation... 
P[i][0] is the probability of i attackers vs. 0 defenders.
P[0][j] is the probability of 0 attackers vs j defenders.
all other entries will be zero'd

When solve_one_state (i, j) is called... ever possible parent state which could lead to this state
has already previously been solved.   So P[i][j] at this point is the total probability that we 
could reach this state from all parent paths.   After solve_one_state is complete... The value of 
the state is either 0 or the final probability that we end in this state.

### Code overview.

- solve.ts -- solve_general()     
    - solve the problem... Initialize the probability matrix.
    - supporting code to handle AA's, bombardments, schedule solve_one_general_state()

- solveone.ts -- solve_one_general_state()
    - From state (i, j) -- compute the probabilities of all next states (ii, jj).   Update the child state probabilities.
    - it has been structured with callback functions for:
        - onInitState()
        - onExitState()
        - onNextState()

    - The callbacks allow for advance3d features like:
        - compute expected value for all sub-problem states.
        - compute Pwin for all sub-problem states.
        - enhance the roundless evaluation to bookkeep and maintain expected number of rounds.

    - However, javascript performance issues with high frequency callbacks lead me to duplicate this function. (solveone*.ts).   It seems like when a single callback function is used, the node engine is able to inline the callbacks.  But when callback functions are mixed -- there's high overehead (2X or more).
    - The duplication is maintained by a shell script.   It's not ideal... and if anyone knows of a better solution please let me know.

- unitgroup.ts -- compute_remove_hits(), general_unit_graph_node
    - compute_remove_hits allows random order of losses.  (AA guns, subs/plane/destroyer relations, multiwave)
        - From an initial set of states (multiple initial states may be possible due to multiwave).
            - compute all possible casualty next states (as well as any other need to transition to a different state).
    - general_unit_graph_node
        - From any state -- reach any casualty state with a single table lookup dereference.
            e.g.  remove 5 sub hits.   remove 8 plane hits.    remove 10 naval hits.
    - The graph nodes are ordered in the node array so that all parent nodes are earlier than all child nodes.
