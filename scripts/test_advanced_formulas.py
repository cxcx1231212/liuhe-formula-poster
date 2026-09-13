from generate_advanced_formulas import candidates, value
from board_sort_scores import Scorer

current={"numbers":[{"number":n} for n in (12,34,7,49,20,5,18)]}
previous={"numbers":[{"number":n} for n in (1,2,3,4,5,6,7)]}
cases=(
    ({"kind":"digit","a":0,"offset":0},3),
    ({"kind":"span","a":0,"b":1,"offset":0},22),
    ({"kind":"neighbor","a":0,"offset":1},13),
    ({"kind":"mirror","a":0,"offset":0},38),
    ({"kind":"multi","a":0,"b":1,"offset":0},46),
    ({"kind":"cross","a":0,"b":0,"offset":0},13),
)
for spec,expected in cases: assert value(spec,current,previous)==expected,(spec,value(spec,current,previous),expected)
counts={key:len(rows) for key,rows in candidates().items()}
assert counts=={"digit":91,"span":147,"neighbor":28,"mirror":91,"multi":147,"cross":343},counts
assert value({"kind":"multi","a":1,"b":3,"offset":3},current,previous)==86
assert value({"kind":"neighbor","a":2,"offset":-10},current,previous)==-3
def scoring_draw(period):
    return {"period":period,"numbers":[{"number":str(number),"animal":"马","element":"金"} for number in (1,2,3,4,5,6,7)]}
cross_metrics=Scorer([scoring_draw(1),scoring_draw(2),scoring_draw(3)]).score("tema","",{
    "algorithmFamily":"cross","advancedSpecs":[{"kind":"cross","a":0,"b":0,"offset":0}],
})
assert cross_metrics["scoredPeriods"]==1,cross_metrics
print("PASS advanced formula families",counts)
