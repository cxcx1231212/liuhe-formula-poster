"""Generate six independent numeric formula families and backtest them."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {
    "digit": "合数公式", "span": "跨度公式", "neighbor": "邻数公式",
    "mirror": "镜像公式", "multi": "多码合成", "cross": "跨期交叉",
}

def wrap49(value): return (int(value) - 1) % 49 + 1
def digit(value): return sum(map(int, str(abs(int(value)))))
def numbers(draw): return [int(ball["number"]) for ball in draw["numbers"]]

def value(spec, current, previous=None):
    ns = numbers(current); kind = spec["kind"]
    if kind == "digit": base = digit(ns[spec["a"]])
    elif kind == "span": base = abs(ns[spec["a"]] - ns[spec["b"]])
    elif kind == "neighbor": base = ns[spec["a"]]
    elif kind == "mirror": base = 50 - ns[spec["a"]]
    elif kind == "multi": base = ns[spec["a"]] + ns[spec["b"]]
    elif kind == "cross":
        if previous is None: return None
        base = ns[spec["a"]] + numbers(previous)[spec["b"]]
    else: raise ValueError(f"unknown advanced kind: {kind}")
    return wrap49(base + spec["offset"])

def candidates():
    result = {key: [] for key in LABELS}
    positions = range(7)
    for a in positions:
        for offset in range(-6, 7):
            result["digit"].append(({"kind":"digit","a":a,"offset":offset}, f"第{a+1}码合数{offset:+d}"))
            if offset in (-2,-1,1,2): result["neighbor"].append(({"kind":"neighbor","a":a,"offset":offset}, f"第{a+1}码邻数{offset:+d}"))
            result["mirror"].append(({"kind":"mirror","a":a,"offset":offset}, f"第{a+1}码镜像{offset:+d}"))
    for a in positions:
        for b in range(a+1, 7):
            for offset in range(-3, 4):
                result["span"].append(({"kind":"span","a":a,"b":b,"offset":offset}, f"第{a+1}码与第{b+1}码跨度{offset:+d}"))
                result["multi"].append(({"kind":"multi","a":a,"b":b,"offset":offset}, f"第{a+1}码加第{b+1}码{offset:+d}"))
        for b in positions:
            for offset in range(-3, 4):
                result["cross"].append(({"kind":"cross","a":a,"b":b,"offset":offset}, f"本期第{a+1}码加上期第{b+1}码{offset:+d}"))
    return result

def summarize(history):
    hits = [row["hit"] for row in history]
    streak = 0
    for hit in reversed(hits):
        if not hit: break
        streak += 1
    recent = hits[-30:]
    return {"recentStreak":streak,"recent30Hits":sum(recent),"recent30Rate":sum(recent)/len(recent),"totalRate":sum(hits)/len(hits),"scoredPeriods":len(hits)}

def load_draws(lottery_type):
    paths=list((ROOT / "public" / "generated" / "wuxing").glob(f"type-{lottery_type}-*-manifest.json"))
    if not paths: raise FileNotFoundError(f"missing wuxing draw source for type {lottery_type}")
    path=max(paths,key=lambda item:int(item.name.split("-")[2]))
    data = json.loads(path.read_text(encoding="utf-8"))
    return int(data["issue"]),sorted((row for row in data["draws"] if len(row.get("numbers", [])) == 7), key=lambda row:int(row["period"]))

def run(lottery_type, year):
    issue,draws = load_draws(lottery_type)
    families = candidates(); groups = {}
    for category, rows in families.items():
        methods = []
        for source_index, (spec, name) in enumerate(rows):
            history = []
            for index in range(1, len(draws)-1):
                prediction = value(spec, draws[index], draws[index-1])
                target = int(draws[index+1]["numbers"][6]["number"])
                history.append({"sourcePeriod":int(draws[index]["period"]),"targetPeriod":int(draws[index+1]["period"]),"predictionNumber":prediction,"actualNumber":target,"hit":prediction==target})
            prediction = value(spec, draws[-1], draws[-2] if len(draws)>1 else None)
            methods.append({"rank":str(source_index+1).zfill(3),"sourceIndex":source_index,"name":name,"label":LABELS[category],"spec":spec,"predictionNumbers":[prediction],"next":[prediction],"history":history,**summarize(history)})
        methods.sort(key=lambda row:(-row["recentStreak"],-row["recent30Rate"],-row["totalRate"],row["sourceIndex"]))
        for rank, method in enumerate(methods, 1): method["rank"] = str(rank).zfill(3)
        groups[category] = {"label":LABELS[category],"methods":methods}
        print(f"{LABELS[category]}: {len(methods)} formulas; best streak {methods[0]['recentStreak']}", flush=True)
    # These are calculation families, not website categories. Convert every
    # family into number bundles and append them to the existing Tema groups.
    path = ROOT / "public" / "generated" / "tema-bundles" / f"type-{lottery_type}-{issue:03d}-manifest.json"
    manifest=json.loads(path.read_text(encoding="utf-8"))
    bundle_offsets={"3":(-1,0,1),"8":(-3,-2,-1,0,1,2,3,4),"10":tuple(range(-4,6)),"18":tuple(range(-8,10))}
    previous=draws[-2] if len(draws)>1 else None;current=draws[-1]
    for group_key,offsets in bundle_offsets.items():
        destination=manifest["groups"][group_key]["methods"]
        destination[:]=[method for method in destination if not method.get("algorithmFamily")]
        for family,payload in groups.items():
            for source in payload["methods"]:
                specs=[];branches=[]
                for delta in offsets:
                    spec={**source["spec"],"offset":source["spec"]["offset"]+delta}
                    number=value(spec,current,previous);specs.append(spec)
                    branches.append({"name":f"{source['name']} 分支{delta:+d}","number":number,"advancedSpec":spec})
                hits=[]
                for draw_index in range(1,len(draws)-1):
                    predicted={value(spec,draws[draw_index],draws[draw_index-1]) for spec in specs}
                    hits.append({"hit":int(draws[draw_index+1]["numbers"][6]["number"]) in predicted})
                destination.append({"sourceKey":f"{LABELS[family]}｜{source['name']}","name":source["name"],"label":LABELS[family],"algorithmFamily":family,"advancedSpecs":specs,"numbers":[row["number"] for row in branches],"branches":branches,**summarize(hits)})
        print(f"已融入 {group_key}码中特：{len(destination)} 条",flush=True)
    path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(path,flush=True)

if __name__ == "__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--type",type=int,required=True);parser.add_argument("--year",type=int,default=2026);args=parser.parse_args()
    run(args.type,args.year)
