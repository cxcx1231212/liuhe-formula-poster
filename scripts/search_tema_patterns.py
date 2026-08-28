import json

from search_pingte_all_patterns import build_candidates
from search_pingte_methods import ROOT, fetch_year, wrap


def streak_of(checks):
    streak = 0
    for check in reversed(checks):
        if not check["hit"]:
            break
        streak += 1
    return streak


def category_for(family):
    if family in {"单码固定加减", "期数合数"}:
        return "单码加减"
    if family in {"合数固定加减", "尾数固定加减"}:
        return "合数尾数"
    if family.startswith("两码"):
        return "两码组合"
    return "总分综合"


def combination_counts(candidates, source, target_number, sizes=(1, 3, 8, 10, 18)):
    frequencies = {}
    for candidate in candidates:
        result = wrap(candidate["calculate"](source))
        frequencies[result] = frequencies.get(result, 0) + 1
    target_frequency = frequencies.get(target_number, 0)
    other_frequencies = [count for number, count in frequencies.items() if number != target_number]
    maximum = max(sizes) - 1
    ways = [0] * (maximum + 1)
    ways[0] = 1
    for frequency in other_frequencies:
        for size in range(maximum, 0, -1):
            ways[size] += ways[size - 1] * frequency
    return {size: target_frequency * ways[size - 1] for size in sizes}, frequencies


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    candidates = build_candidates()
    methods = []
    for candidate in candidates:
        checks = []
        trajectory = []
        for source, target in zip(records, records[1:]):
            result = wrap(candidate["calculate"](source))
            target_number = int(target["numberList"][6]["number"])
            checks.append({
                "sourcePeriod": int(source["period"]), "targetPeriod": int(target["period"]),
                "resultNumber": result, "targetNumber": target_number, "hit": result == target_number,
            })
            trajectory.append(result)
        streak = streak_of(checks)
        if streak < 1:
            continue
        recent30 = checks[-30:]
        methods.append({
            "family": candidate["family"], "category": category_for(candidate["family"]), "name": candidate["name"],
            "recentStreak": streak, "recent30Rate": sum(item["hit"] for item in recent30) / len(recent30),
            "totalRate": sum(item["hit"] for item in checks) / len(checks),
            "predictionNumber": wrap(candidate["calculate"](records[-1])),
            "history": checks[-6:], "trajectory": tuple(trajectory),
        })
    methods.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    unique, seen = [], set()
    for method in methods:
        signature = method.pop("trajectory")
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(method)
    counts, frequencies = combination_counts(candidates, records[-2], int(records[-1]["numberList"][6]["number"]))
    output = {
        "lotteryType": lottery_type, "year": year, "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1, "publishedCount": len(unique), "publishedMethods": unique,
        "rawCombinationCounts": {str(size): count for size, count in counts.items()},
        "lastVerifiedPeriod": int(records[-1]["period"]), "lastVerifiedSpecialNumber": int(records[-1]["numberList"][6]["number"]),
    }
    destination = ROOT / "data" / "tema" / f"type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"当前命中的特码公式：{len(methods)}；轨迹去重后发布：{len(unique)}")
    for category in ("单码加减", "合数尾数", "两码组合", "总分综合"):
        print(category, sum(item["category"] == category for item in unique))
    print("短期", sum(item["recentStreak"] < 3 for item in unique), "连准", sum(item["recentStreak"] >= 3 for item in unique))
    print("不去重组合数量：")
    for size, count in counts.items():
        print(f"{size}码中特：{count}")
    for index, item in enumerate(unique[:30], 1):
        print(f"{index:02d}. {item['name']} → {item['predictionNumber']:02d}｜{item['category']}｜连中{item['recentStreak']}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
