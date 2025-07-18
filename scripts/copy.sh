#! /bin/bash



echo $pwd
for i in {1..3} ; 
do echo $i ;
  echo $i
  sed -e "s/solve_one_general_state/solve_one_general_state_copy$i/" src/solveone.ts > src/solveone$i.ts
done;
