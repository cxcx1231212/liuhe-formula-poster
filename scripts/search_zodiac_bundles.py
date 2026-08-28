import json

from search_pingte_methods import ANIMALS, ROOT, fetch_year, wrap
from search_tema_one_complete import bases


def streak(values):
    count = 0
    for value in reversed(values):
        if not value:
            break
        count += 1
    return count


def animal(value):
    number = wrap(value)
    return ANIMALS[(number - 1) % 12]


def make_series():
    series = []
    for base_name, calculate in bases():
        groups = [
            (f"{base_name}固定加法", [(f"{base_name}加{i}", lambda r, b=calculate, n=i: b(r) + n) for i in range(1, 19)]),
            (f"{base_name}固定减法", [(f"{base_name}减{i}", lambda r, b=calculate, n=i: b(r) - n) for i in range(1, 19)]),
            (f"{base_name}乘法", [(f"{base_name}乘{i}", lambda r, b=calculate, n=i: b(r) * n) for i in range(2, 13)]),
            (f"{base_name}除法取整", [(f"{base_name}除{i}取整", lambda r, b=calculate, n=i: int(b(r) / n)) for i in range(2, 13)]),
            (f"{base_name}除法余数", [(f"{base_name}除{i}余数", lambda r, b=calculate, n=i: b(r) % n) for i in range(2, 13)]),
        ]
        series.extend(groups)
    return series


def evaluate(name, calculate, records):
    predictions, hits = [], []
    for source, target in zip(records, records[1:]):
        predicted = animal(calculate(source))
        actual = target["numberList"][6]["shengXiao"]
        predictions.append(predicted)
        hits.append(predicted == actual)
    return {
        "name": name,
        "predictions": predictions,
        "hits": hits,
        "nextAnimal": animal(calculate(records[-1])),
        "recentStreak": streak(hits),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
    }


def combined_hits(methods):
    return [any(method["hits"][i] for method in methods) for i in range(len(methods[0]["hits"]))]


def score(methods):
    hits = combined_hits(methods)
    return streak(hits), sum(hits[-30:]), sum(hits)


def make_bundle(seed, representatives, size):
    selected = [seed]
    while len(selected) < size:
        used = {item["nextAnimal"] for item in selected}
        choices = [item for item in representatives if item["nextAnimal"] not in used]
        selected.append(max(choices, key=lambda item: score(selected + [item])))
    hits = combined_hits(selected)
    return {
        "animals": [item["nextAnimal"] for item in selected],
        "branches": [{"name": item["name"], "animal": item["nextAnimal"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
        "history": hits[-6:],
    }


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated_series = []
    all_methods = []
    for source_key, definitions in make_series():
        methods = [evaluate(name, calculate, records) for name, calculate in definitions]
        evaluated_series.append((source_key, methods))
        all_methods.extend(methods)

    one = [method for method in all_methods if method["recentStreak"] >= 1]
    one.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    groups = {"1": one}
    for size in (3, 6, 9):
        bundles = []
        for source_key, methods in evaluated_series:
            representatives = []
            for zodiac in ANIMALS:
                choices = [item for item in methods if item["nextAnimal"] == zodiac]
                if choices:
                    representatives.append(max(choices, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"])))
            if len(representatives) < size:
                continue
            choices = [make_bundle(seed, representatives, size) for seed in representatives]
            bundle = max(choices, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]))
            if bundle["recentStreak"] < 1:
                continue
            bundle["sourceKey"] = source_key
            bundles.append(bundle)
        bundles.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
        groups[str(size)] = bundles

    thresholds = {"1": 0.30, "3": 0.50, "6": 23 / 30, "9": 29 / 30}
    published = {}
    publish_thresholds_used = {}
    for size, items in groups.items():
        steps = [thresholds[size]]
        if size == "1":
            steps.extend([0.27, 0.25])
        selected = []
        used = steps[-1]
        for threshold in steps:
            selected = [item for item in items if item["recent30Rate"] >= threshold]
            used = threshold
            if selected:
                break
        published[size] = selected[:5] if used < thresholds[size] else selected
        publish_thresholds_used[size] = used
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "rawFormulaCount": len(all_methods),
        "groups": groups,
        "publishThresholds": thresholds,
        "publishThresholdsUsed": publish_thresholds_used,
        "publishedGroups": published,
    }
    destination = ROOT / "data" / "zodiac" / f"bundles-type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"基础公式：{len(all_methods)}")
    for size, label in ((1, "一肖"), (3, "三肖"), (6, "六肖"), (9, "九肖")):
        items = groups[str(size)]
        print(f"{label}：{len(items)}；最高准确率榜：{len(published[str(size)])}；连准3期以上：{sum(item['recentStreak'] >= 3 for item in items)}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
