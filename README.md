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
