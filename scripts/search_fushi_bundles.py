import json

from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series


def streak(values):
    count = 0
    for value in reversed(values):
        if not value:
            break
        count += 1
    return count


def evaluate(name, calculate, records):
    predictions, hits = [], []
    for source, target in zip(records, records[1:]):
        prediction = wrap(calculate(source))
        target_numbers = {int(item["number"]) for item in target["numberList"][:6]}
        predictions.append(prediction)
        hits.append(prediction in target_numbers)
    return {
        "name": name,
        "predictions": predictions,
        "hits": hits,
        "nextNumber": wrap(calculate(records[-1])),
    }


def joint_hits(methods):
    results = []
    for index in range(len(methods[0]["hits"])):
        predictions = [method["predictions"][index] for method in methods]
        results.append(len(set(predictions)) == len(methods) and all(method["hits"][index] for method in methods))
    return results


def score(methods):
    hits = joint_hits(methods)
    return streak(hits), sum(hits[-30:]), sum(hits)


def build_bundle(seed, representatives, size):
    selected = [seed]
    while len(selected) < size:
        used = {item["nextNumber"] for item in selected}
        choices = [item for item in representatives if item["nextNumber"] not in used]
        if not choices:
            return None
        selected.append(max(choices, key=lambda item: score(selected + [item])))
    hits = joint_hits(selected)
    return {
        "numbers": sorted(item["nextNumber"] for item in selected),
        "branches": [{"name": item["name"], "number": item["nextNumber"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Hits": sum(hits[-30:]),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),for name, calculate, *_ in definitions
        "history": hits[-6:],
    }


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated_series = []
    raw_count = 0
    for source_key, definitions in make_series():
        methods = [evaluate(name, calculate, records) for name, calculate in definitions]
        evaluated_series.append((source_key, methods))
        raw_count += len(methods)

    groups = {}
    for size in (2, 3, 4):
        bundles = []
        for source_key, methods in evaluated_series:
            representatives = []
            for number in sorted({method["nextNumber"] for method in methods}):
                choices = [method for method in methods if method["nextNumber"] == number]
                representatives.append(max(choices, key=lambda method: score([method])))
            if len(representatives) < size:
                continue
            choices = [build_bundle(seed, representatives, size) for seed in representatives]
            choices = [item for item in choices if item]
            if not choices:
                continue
            bundle = max(choices, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]))
            bundle["sourceKey"] = source_key
            bundles.append(bundle)
        bundles.sort(key=lambda item: (item["recent30Rate"], item["recentStreak"], item["totalRate"]), reverse=True)
        groups[str(size)] = bundles

    output = {
        "lotteryType": lottery_type,
        "year": year,
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "rawFormulaCount": raw_count,
        "groups": groups,
    }
    destination = ROOT / "data" / "fushi" / f"bundles-type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"基础公式：{raw_count}")
    for size in (2, 3, 4):
        items = groups[str(size)]
        distribution = {}
        for item in items:
            distribution[item["recent30Hits"]] = distribution.get(item["recent30Hits"], 0) + 1
        print(f"{size}中{size}：{len(items)}组；最高近30期命中{max(distribution, default=0)}次")
        print("  " + "、".join(f"{hits}次={count}组" for hits, count in sorted(distribution.items(), reverse=True)[:12]))
    print(destination)
    return output


if __name__ == "__main__":
    run()
