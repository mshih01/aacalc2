@src/external.ts

I want to work on the cummulative detailed casualties with swapping.

Background:

For multiwave battles, the individual wave by wave results are found in waveOutputs.

First the behavior without swapping:
wave 0 ==> attacking force 0 attacking defending force 0.
wave 1 ==> attacking force 1 attacking defending force survivors in wave 0 + reinforcements in defending force 1.
wave 2 ==> attacking force 2 attacking defending force survivors in wave 1 + reinforcements in defending force 2.

In general for wave i, attacking forces i attacking defending force survivors in wave i-1 + reinforcements in defending force i.

The battle ends in wave i if: 1. It's the last wave -or- 2. If the attacker succeds in taking the territory

Taking the territory means, the defending force was wiped out -- and attacking remaining forces include land units.

For the cummulative detailed casualties:

in wave i:
If the battle state is terminal (the last wave, or the attacker takes the territory)
then the state needs to be added to the final result.
otherwise
the state needs to be bookkeeped -- so that it can be combined with the next wave results.

attacker side:  
 prior wave attacker bookkeep is cross multiplied with current state.

defender side:
prior wave defender is ignored -- directly use current stae.

To add swapping:

for each wave i: keep:
swap[i] = is i swapped compared to i-1 (swap[0] = 0)
parity[i] = is i swapped compared to wave 0 // which side is the output saved.
nextSwap[i] = is i+1 swapped compared to i

    	// start:
    	pendingAtt, pendingDef   is based on the current wave (i) definition.

    	// terminal state vs. continue state:
    	depends on nextSwap[i]
    	terminal condition =
    		1.  is last wave -or-
    		2.  if nextSwap[i] then attacker fails to take.
    			if !nextSwap[i] then attacker takes.


    	continue state = !terminal state.


    	// process current wave casualties.

    	// att_cas

for each cas in att_cas {
if terminal state cas {
target = parity[i] ? cummdef : cummatt;
target += cas crossmult pendingAtt;
}
if (continue state) {
savecas = nextSwap[i] ? air_cas : cas;
continue_att += savecas cross pendingAtt;
}
}

    	// def_cas
    	for each cas in def_cas {
    		if terminal state cas {
    			target = parity[i] ? cummatt : cummdef;
    			target += cas crossmult with pendingDef;
    		}
    		if (continue state) {
    			continue_def += cas cross pendingDef;
    		}
    	}

// end: pendingAtt, pendingDef is based on the next wave (i) definition.
prevPendingDef = pendingDef;
pendingAtt = nextSwap[i] ? continue_def : continue_att;
pendingDef = nextSwap[i] ? continue_att : prevPendingDef;
