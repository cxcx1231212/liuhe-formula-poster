import json

from search_fushi_bundles import evaluate, streak
from search_pingte_methods import ROOT, fetch_year
from search_zodiac_bundles import make_series


SPECS = {"2": {"poolSize": 2, "required": 2}, "3": {"poolSize": 3, "required": 3}}


def period_counts(methods):
    counts = []
    for index in range(len(methods[0]["hits"])):
        matched = {method["predictions"][index] for method in methods if method["hits"][index]}
        counts.append(len(matched))
    return counts


def score(methods, required):
    counts = period_counts(methods)
    hits = [count >= required for count in counts]
    return streak(hits), sum(hits[-30:]), sum(min(count, required) for count in counts[-30:]), sum(hits)


def build_pool(methods, pool_size, required):
    representatives = []
    for number in sorted({method["nextNumber"] for method in methods}):
        choices = [method for method in methods if method["nextNumber"] == number]
        representatives.append(max(choices, key=lambda item: (sum(item["hits"][-30:]), sum(item["hits"]))))
    if len(representatives) < pool_size:
        return None
    selected = [max(representatives, key=lambda item: (sum(item["hits"][-30:]), sum(item["hits"])))]
    while len(selected) < pool_size:
        used = {item["nextNumber"] for item in selected}
        choices = [item for item in representatives if item["nextNumber"] not in used]
        selected.append(max(choices, key=lambda item: score(selected + [item], required)))
    counts = period_counts(selected)
    hits = [count >= required for count in counts]
    return {
        "numbers": sorted(item["nextNumber"] for item in selected),
        "branches": [{"name": item["name"], "number": item["nextNumber"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Hits": sum(hits[-30:]),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
        "historyCounts": counts[-8:],
        "history": hits[-8:],
    }


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated_series = [(source_key, [evaluate(definition[0], definition[1], records) for definition in definitions]) for source_key, definitions in make_series()]
    groups = {}
    for category, spec in SPECS.items():
        pools = []
        for source_key, methods in evaluated_series:
            pool = build_pool(methods, spec["poolSize"], spec["required"])
            if pool:
                pool["sourceKey"] = source_key
                pools.append(pool)
        pools.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
        groups[category] = pools
        print(f"{category}中{category}（选{spec['poolSize']}中{spec['required']}）：{len(pools)}组；最高连中{max((item['recentStreak'] for item in pools), default=0)}期；近30期最高{max((item['recent30Hits'] for item in pools), default=0)}次")
        distribution = {}
        for item in pools:
            distribution[item["recentStreak"]] = distribution.get(item["recentStreak"], 0) + 1
        print("  连中分布：" + "、".join(f"{value}期={count}" for value, count in sorted(distribution.items(), reverse=True)))
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "specs": SPECS,
        "groups": groups,
    }
    destination = ROOT / "data" / "fushi" / f"pools-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(destination)
    return output


if __name__ == "__main__":
    run()
