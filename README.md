Axis and Allies 1942 Online probability calculator engine

example usage:

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
