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
            (f"{base_name}固定加法", [(f"{base_name}加{i}", lambda r, b=calculate, n=i: b(r) + n, base_name, "add", i) for i in range(1, 19)]),
            (f"{base_name}固定减法", [(f"{base_name}减{i}", lambda r, b=calculate, n=i: b(r) - n, base_name, "subtract", i) for i in range(1, 19)]),
            (f"{base_name}交替加减法", [(f"{base_name}交替加减{i}", lambda r, b=calculate, n=i: b(r) + (n if int(r["period"]) % 2 else -n), base_name, "alternate_add_subtract", i) for i in range(1, 19)]),
            (f"{base_name}乘法", [(f"{base_name}乘{i}", lambda r, b=calculate, n=i: b(r) * n, base_name, "multiply", i) for i in range(2, 13)]),
            (f"{base_name}除法取整", [(f"{base_name}除{i}取整", lambda r, b=calculate, n=i: int(b(r) / n), base_name, "divide_floor", i) for i in range(2, 13)]),
            (f"{base_name}除法余数", [(f"{base_name}除{i}余数", lambda r, b=calculate, n=i: b(r) % n, base_name, "modulo", i) for i in range(2, 13)]),
        ]
        series.extend(groups)
    return series


def evaluate(name, calculate, base_name, operation, amount, records):
    predictions, hits = [], []
    for source, target in zip(records, records[1:]):
        predicted = animal(calculate(source))
        actual = target["numberList"][6]["shengXiao"]
        predictions.append(predicted)
        hits.append(predicted == actual)
    next_value = wrap(calculate(records[-1]))
    return {
        "name": name,
        "baseName": base_name,
        "operation": operation,
        "amount": amount,
        "predictions": predictions,
        "hits": hits,
        "nextNumber": next_value,
        "nextAnimal": animal(next_value),
        "recentStreak": streak(hits),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
    }


def combined_hits(methods):
    return [any(method["hits"][i] for method in methods) for i in range(len(methods[0]["hits"]))]


def score(methods):
    hits = combined_hits(methods)
    return streak(hits), sum(hits[-30:]), sum(hits)


def make_bundle(seed, representatives, size, allow_duplicate_results=False):
    selected = [seed]
    while len(selected) < size:
        used = {item["nextAnimal"] for item in selected}
        choices = [item for item in representatives if item not in selected and (allow_duplicate_results or item["nextAnimal"] not in used)]
        if not choices:
            return None
        selected.append(max(choices, key=lambda item: score(selected + [item])))
    hits = combined_hits(selected)
    return {
        "animals": [item["nextAnimal"] for item in selected],
        "branches": [{
            "name": item["name"], "baseName": item["baseName"],
            "operation": item["operation"], "amount": item["amount"],
            "number": item["nextNumber"], "animal": item["nextAnimal"],
        } for item in selected],
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
        methods = [evaluate(*definition, records) for definition in definitions]
        evaluated_series.append((source_key, methods))
        all_methods.extend(methods)

    # “全公式”模式：公式是否发布不再取决于近期是否命中。
    # 命中数据仍保留作历史展示，但不能再把暂时未中的公式过滤掉。
    one = list(all_methods)
    one.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    groups = {"1": one}
    for size in (3, 6, 9):
        bundles = []
        for source_key, methods in evaluated_series:
            allow_duplicate_results = "交替加减法" in source_key
            representatives = []
            for zodiac in ANIMALS:
                choices = [item for item in methods if item["nextAnimal"] == zodiac]
                if choices:
                    representatives.append(max(choices, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"])))
            candidates = methods if allow_duplicate_results else representatives
            if len(candidates) < size:
                continue
            choices = [make_bundle(seed, candidates, size, allow_duplicate_results) for seed in candidates]
            choices = [item for item in choices if item]
            if not choices:
                continue
            bundle = max(choices, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]))
            bundle["sourceKey"] = source_key
            bundles.append(bundle)
        bundles.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
        groups[str(size)] = bundles

    thresholds = {"1": 0, "3": 0, "6": 0, "9": 0}
    published = {size: list(items) for size, items in groups.items()}
    publish_thresholds_used = dict(thresholds)
    # 回测明细只用于本次排序；发布文件仅保留重建帖子所需的数据。
    # 否则 9,000 多条公式重复携带全年 predictions/hits 会膨胀到上百 MB。
    compact_groups = {
        size: [{key: value for key, value in item.items() if key not in {"predictions", "hits"}} for item in items]
        for size, items in groups.items()
    }
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "rawFormulaCount": len(all_methods),
        "groups": compact_groups,
        "publishThresholds": thresholds,
        "publishThresholdsUsed": publish_thresholds_used,
        "publishedGroups": compact_groups,
        "draws": [
            {
                "period": int(record["period"]),
                "displayPeriod": f"{int(record['period']):03d}期",
                "date": record.get("lotteryTime", ""),
                "numbers": [
                    {
                        "number": str(value["number"]).zfill(2),
                        "animal": value["shengXiao"],
                        "element": value.get("wuXing", ""),
                    }
                    for value in record["numberList"]
                ],
            }
            for record in records
        ],
    }
    destination = ROOT / "data" / "zodiac" / f"bundles-type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"基础公式：{len(all_methods)}")
    for size, label in ((1, "一肖"), (3, "三肖"), (6, "六肖"), (9, "九肖")):
        items = groups[str(size)]
        print(f"{label}：全公式 {len(items)}；连准3期以上：{sum(item['recentStreak'] >= 3 for item in items)}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
