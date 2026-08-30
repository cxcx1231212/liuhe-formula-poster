import json
import re

from search_pingte_all_patterns import POSITIONS, build_candidates, numbers, digit_sum, tail
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


def neighbor_offsets(size):
    """Return a balanced left/right number set without inventing extra rules."""
    if size == 3:
        return [-1, 0, 1]
    half = size // 2
    return list(range(-half, 0)) + list(range(1, half + 1))


def extended_series():
    """The complete special-number formula library beyond fixed offsets.

    Each entry is one stable formula.  Its single calculated centre is expanded
    into the requested 3/8/10/18 neighbouring codes, so the formula identity is
    unchanged across categories and historical pages.
    """
    result = []

    def add(name, calculate):
        result.append({"sourceKey": f"{name}左右码法", "baseName": name, "calculate": calculate})

    # 7 positions × original/composite/tail = 21.
    for position, label in enumerate(POSITIONS):
        add(f"{label}码原码", lambda r, p=position: numbers(r)[p])
        add(f"{label}码合数", lambda r, p=position: digit_sum(numbers(r)[p]))
        add(f"{label}码尾数", lambda r, p=position: tail(numbers(r)[p]))

    # 7 positions × add/subtract issue digit sum = 14.
    for position, label in enumerate(POSITIONS):
        add(f"{label}码加期数合数", lambda r, p=position: numbers(r)[p] + digit_sum(int(r["period"])))
        add(f"{label}码减期数合数", lambda r, p=position: numbers(r)[p] - digit_sum(int(r["period"])))

    # 21 unordered pairs × five transparent operations = 105.
    for left in range(7):
        for right in range(left + 1, 7):
            a, b = POSITIONS[left], POSITIONS[right]
            add(f"{a}码加{b}码", lambda r, x=left, y=right: numbers(r)[x] + numbers(r)[y])
            add(f"{a}码减{b}码", lambda r, x=left, y=right: numbers(r)[x] - numbers(r)[y])
            add(f"{b}码减{a}码", lambda r, x=left, y=right: numbers(r)[y] - numbers(r)[x])
            add(f"{a}合数加{b}合数", lambda r, x=left, y=right: digit_sum(numbers(r)[x]) + digit_sum(numbers(r)[y]))
            add(f"{a}尾数加{b}尾数", lambda r, x=left, y=right: tail(numbers(r)[x]) + tail(numbers(r)[y]))

    # Totals and extrema = 8.
    add("六个平码总分", lambda r: sum(numbers(r)[:6]))
    add("七码总分", lambda r: sum(numbers(r)))
    add("六个平码总分合数", lambda r: digit_sum(sum(numbers(r)[:6])))
    add("七码总分合数", lambda r: digit_sum(sum(numbers(r))))
    add("六个平码总分尾数", lambda r: tail(sum(numbers(r)[:6])))
    add("七码总分尾数", lambda r: tail(sum(numbers(r))))
    add("最小平码", lambda r: min(numbers(r)[:6]))
    add("最大平码", lambda r: max(numbers(r)[:6]))
    return result


def build_extended_bundle(spec, records, size):
    offsets = neighbor_offsets(size)
    branches = []
    branch_hits = []
    for offset in offsets:
        name = f"邻码【{spec['baseName']}】偏移{offset:+d}"
        predictions = [wrap(spec["calculate"](source) + offset) for source in records[:-1]]
        hits = [value == int(target["numberList"][6]["number"]) for value, target in zip(predictions, records[1:])]
        branches.append({"name": name, "number": wrap(spec["calculate"](records[-1]) + offset)})
        branch_hits.append(hits)
    merged = [any(values) for values in zip(*branch_hits)]
    return {
        "size": size,
        "numbers": [branch["number"] for branch in branches],
        "branches": branches,
        "recentStreak": streak(merged),
        "recent30Rate": sum(merged[-30:]) / min(30, len(merged)),
        "totalRate": sum(merged) / len(merged),
        "history": merged[-6:],
        "sourceKey": spec["sourceKey"],
    }


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
        items.extend(build_extended_bundle(spec, records, size) for spec in extended_series())
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
