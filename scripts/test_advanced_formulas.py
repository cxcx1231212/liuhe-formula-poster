from generate_advanced_formulas import candidates, value

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
for rows in candidates().values():
    for spec,_ in rows: assert 1<=value(spec,current,previous)<=49
print("PASS advanced formula families",counts)
