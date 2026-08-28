import json

from search_fushi_bundles import streak
from search_pingte_methods import ANIMALS, ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series


SPECS = {"2": {"poolSize": 4, "required": 2}, "3": {"poolSize": 6, "required": 3}}


def animal(value):
    return ANIMALS[(wrap(value) - 1) % 12]


def evaluate(name, calculate, records):
    predictions, hits = [], []
    for source, target in zip(records, records[1:]):
        prediction = animal(calculate(source))
        target_animals = {item["shengXiao"] for item in target["numberList"][:6]}
        predictions.append(prediction)
        hits.append(prediction in target_animals)
    return {"name": name, "predictions": predictions, "hits": hits, "nextAnimal": animal(calculate(records[-1]))}


def period_counts(methods):
    result = []
    for index in range(len(methods[0]["hits"])):
        matched = {method["predictions"][index] for method in methods if method["hits"][index]}
        result.append(len(matched))
    return result


def score(methods, required):
    counts = period_counts(methods)
    hits = [count >= required for count in counts]
    return streak(hits), sum(hits[-30:]), sum(min(count, required) for count in counts[-30:]), sum(hits)


def build_pool(methods, pool_size, required):
    representatives = []
    for zodiac in ANIMALS:
        choices = [method for method in methods if method["nextAnimal"] == zodiac]
        if choices:
            representatives.append(max(choices, key=lambda item: (sum(item["hits"][-30:]), sum(item["hits"]))))
    if len(representatives) < pool_size:
        return None
    selected = [max(representatives, key=lambda item: (sum(item["hits"][-30:]), sum(item["hits"])))]
    while len(selected) < pool_size:
        used = {item["nextAnimal"] for item in selected}
        choices = [item for item in representatives if item["nextAnimal"] not in used]
        selected.append(max(choices, key=lambda item: score(selected + [item], required)))
    counts = period_counts(selected)
    hits = [count >= required for count in counts]
    return {
        "animals": [item["nextAnimal"] for item in selected],
        "branches": [{"name": item["name"], "animal": item["nextAnimal"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Hits": sum(hits[-30:]),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
        "historyCounts": counts[-8:],
        "history": hits[-8:],
    }


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated = [(source_key, [evaluate(name, calculate, records) for name, calculate in definitions]) for source_key, definitions in make_series()]
    groups = {}
    for category, spec in SPECS.items():
        pools = []
        for source_key, methods in evaluated:
            pool = build_pool(methods, spec["poolSize"], spec["required"])
            if pool:
                pool["sourceKey"] = source_key
                pools.append(pool)
        pools.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
        groups[category] = pools
        distribution = {}
        for item in pools:
            distribution[item["recentStreak"]] = distribution.get(item["recentStreak"], 0) + 1
        print(f"{category}连肖（选{spec['poolSize']}中{spec['required']}）：{len(pools)}组；最高连中{max((item['recentStreak'] for item in pools), default=0)}期；近30期最高{max((item['recent30Hits'] for item in pools), default=0)}次")
        print("  连中分布：" + "、".join(f"{value}期={count}" for value, count in sorted(distribution.items(), reverse=True)))
    output = {"lotteryType": lottery_type, "year": year, "currentPeriod": int(records[-1]["period"]), "nextPeriod": int(records[-1]["period"]) + 1, "specs": SPECS, "groups": groups}
    destination = ROOT / "data" / "fushi" / f"lianxiao-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(destination)
    return output


if __name__ == "__main__":
    run()
