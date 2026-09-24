enhance save history to be group based.

Currently, history entry has single key/name. Make the history key the pair: group / name.

Add group management commands like: remove group, ability to expand and collapse groups.

Add "evaluate all group settings" -- use the current armies -- but use all other settings (e.g. retreat conditions, order of loss.   only the army composition is fixed.)

This allows batch evaluating multiple common settings like below:
{"inf":164,"art":82,"arm":80,"fig":11,"bom":13,"bat":0,"cru":0} vs.  {"inf":118,"art":85,"arm":123,"fig":3,"bom":10,"aa":0} profit    def loss  att loss  def surv  att surv  takes     rounds    runtime   description 138.772   1474.665  1335.893  0.362     0.637     0.484     5.418     2012.808  no retreat standard  bomber last 213.991   1307.637  1093.646  0.378     1.000     0.483     4.260     12043.937 EV retreat standard  bomber last 138.772   1474.665  1335.893  0.362     0.637     0.484     5.418     1923.757  no retreat standard  bomber last 213.991   1307.637  1093.646  0.378     1.000     0.483     4.260     11594.118 EV retreat standard  bomber last 82.564    1474.665  1392.101  0.362     0.637     0.484     5.418     2469.732  DZ + no retreat standard  bomber last 172.033   1283.678  1111.645  0.581     1.000     0.281     4.056     11719.776 DZ + EV retreat standard  bomber last 83.532    1474.665  1391.133  0.362     0.637     0.484     5.418     2259.868  TV + DZ + no retreat standard  bomber last 172.599   1284.294  1111.695  0.577     1.000     0.285     4.060     11851.547 TV + DZ + EV retreat standard  bomber last -24.881   373.620   398.501   1.000     1.000     0.000     1.000     486.880   1 round   standard  bomber last 28.599    764.270   735.671   1.000     1.000     0.000     2.000     1722.513  2 round   standard  bomber last 80.500    1129.506  1049.006  1.000     1.000     0.000     3.000     2096.311  3 round   standard  bomber last

So someone might want to check 1, 2, 3 rounds results.. as well as EV result, and no retreat results.
As attacker, It might also be useful to check multiple defense OOL -- since it's unknown, and you want to know the worst case.

The output can be a collapsible text region.


