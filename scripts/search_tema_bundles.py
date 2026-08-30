import json
import re

from search_pingte_all_patterns import build_candidates
from search_pingte_methods import ROOT, fetch_year, wrap


def streak(values):
    result = 0
    for value in reversed(values):
        if not value:
            break
        result += 1
    return result


def score(values):
    return streak(values), sum(values[-30:]), sum(values)


def evaluate(candidate, records):
    predictions, hits = [], []
    for source, target in zip(records, records[1:]):
        prediction = wrap(candidate["calculate"](source))
        target_number = int(target["numberList"][6]["number"])
        predictions.append(prediction)
        hits.append(prediction == target_number)
    return {
        "name": candidate["name"], "family": candidate["family"], "predictions": predictions,
        "hits": hits, "nextNumber": wrap(candidate["calculate"](records[-1])),
    }


def merge_hits(selected):
    return [any(item["hits"][index] for item in selected) for index in range(len(selected[0]["hits"]))]


def build_bundle(seed, representatives, size):
    selected = [seed]
    while len(selected) < size:
        chosen_numbers = {item["nextNumber"] for item in selected}
        choices = [item for item in representatives if item["nextNumber"] not in chosen_numbers]
        candidate = max(choices, key=lambda item: score(merge_hits(selected + [item])))
        selected.append(candidate)
    hits = merge_hits(selected)
    return {
        "size": size,
        "numbers": sorted(item["nextNumber"] for item in selected),
        "branches": [{"name": item["name"], "number": item["nextNumber"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Rate": sum(hits[-30:]) / 30,
        "totalRate": sum(hits) / len(hits),
        "history": hits[-6:],
    }


def build_complete_bundle(items, size):
    """Build one deterministic post from every formula in a series.

    Formula publishing must not depend on current hits or on whether two
    branches happen to produce the same next number.  A 二/三/八码 formula is
    still that formula even when some results repeat, so keep the branches in
    numeric offset order and only take the requested amount.
    """
    selected = sorted(
        items,
        key=lambda item: int(re.search(r"(\d+)$", item["name"]).group(1)),
    )[:size]
    hits = merge_hits(selected)
    return {
        "size": size,
        "numbers": [item["nextNumber"] for item in selected],
        "branches": [{"name": item["name"], "number": item["nextNumber"]} for item in selected],
        "recentStreak": streak(hits),
        "recent30Rate": sum(hits[-30:]) / min(30, len(hits)),
        "totalRate": sum(hits) / len(hits),
        "history": hits[-6:],
    }


def series_key(name):
    match = re.fullmatch(r"(平[1-6]|特码)码(固定|合数|尾数)(加|减)\d+", name)
    if not match:
        return None
    source, method, direction = match.groups()
    source = source.replace("平", "平码") if source.startswith("平") else source
    return f"{source}{method}{direction}法"


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated = [evaluate(candidate, records) for candidate in build_candidates()]
    bundles = {}
    for size in (3, 8, 10, 18):
        items = []
        series_names = sorted(set(filter(None, (series_key(item["name"]) for item in evaluated))))
        for source in series_names:
            pool = [item for item in evaluated if series_key(item["name"]) == source]
            if len(pool) < size:
                continue
            bundle = build_complete_bundle(pool, size)
            bundle["sourceKey"] = source
            items.append(bundle)
        bundles[str(size)] = sorted(items, key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    one = json.loads((ROOT / "data" / "tema" / f"type-{lottery_type}-{year}.json").read_text(encoding="utf-8"))["publishedMethods"]
    output = {
        "lotteryType": lottery_type, "year": year, "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1, "oneCodeMethods": one, "bundles": bundles,
    }
    destination = ROOT / "data" / "tema" / f"bundles-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"一码（不去重）：{len(one)}")
    for size in (3, 8, 10, 18):
        items = bundles[str(size)]
        print(f"{size}码（全部公式）：{len(items)}；短期{sum(item['recentStreak'] < 3 for item in items)}；连准{sum(item['recentStreak'] >= 3 for item in items)}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
