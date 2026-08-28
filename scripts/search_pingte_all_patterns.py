import json
import re
from pathlib import Path

from search_pingte_methods import ANIMALS, ROOT, digit_sum, fetch_year, wrap

POSITIONS = ["平1", "平2", "平3", "平4", "平5", "平6", "特码"]


def is_renderable_name(name):
    patterns = [
        r"平\d合数＋平\d合数", r"平\d尾数＋平\d尾数",
        r"平\d码尾数(?:加|减)\d+", r"平\d码固定(?:加|减)\d+",
        r"七码总分加\d+",
    ]
    return any(re.fullmatch(pattern, name) for pattern in patterns)


def tail(number):
    value = number % 10
    return 10 if value == 0 else value


def numbers(record):
    return [int(item["number"]) for item in record["numberList"]]


def build_candidates():
    candidates = []

    def add(family, name, calculate):
        candidates.append({"family": family, "name": name, "calculate": calculate})

    for position, position_name in enumerate(POSITIONS):
        for amount in range(1, 19):
            add("单码固定加减", f"{position_name}码固定加{amount}", lambda r, p=position, a=amount: numbers(r)[p] + a)
            add("单码固定加减", f"{position_name}码固定减{amount}", lambda r, p=position, a=amount: numbers(r)[p] - a)
            add("合数固定加减", f"{position_name}码合数加{amount}", lambda r, p=position, a=amount: digit_sum(numbers(r)[p]) + a)
            add("合数固定加减", f"{position_name}码合数减{amount}", lambda r, p=position, a=amount: digit_sum(numbers(r)[p]) - a)
            add("尾数固定加减", f"{position_name}码尾数加{amount}", lambda r, p=position, a=amount: tail(numbers(r)[p]) + a)
            add("尾数固定加减", f"{position_name}码尾数减{amount}", lambda r, p=position, a=amount: tail(numbers(r)[p]) - a)
        add("期数合数", f"{position_name}码加期数合数", lambda r, p=position: numbers(r)[p] + digit_sum(int(r["period"])))
        add("期数合数", f"{position_name}码减期数合数", lambda r, p=position: numbers(r)[p] - digit_sum(int(r["period"])))

    for left in range(7):
        for right in range(left + 1, 7):
            left_name, right_name = POSITIONS[left], POSITIONS[right]
            add("两码相加", f"{left_name}码＋{right_name}码", lambda r, a=left, b=right: numbers(r)[a] + numbers(r)[b])
            add("两码相减", f"{left_name}码－{right_name}码", lambda r, a=left, b=right: numbers(r)[a] - numbers(r)[b])
            add("两码相减", f"{right_name}码－{left_name}码", lambda r, a=left, b=right: numbers(r)[b] - numbers(r)[a])
            add("两码合数", f"{left_name}合数＋{right_name}合数", lambda r, a=left, b=right: digit_sum(numbers(r)[a]) + digit_sum(numbers(r)[b]))
            add("两码尾数", f"{left_name}尾数＋{right_name}尾数", lambda r, a=left, b=right: tail(numbers(r)[a]) + tail(numbers(r)[b]))

    for amount in range(1, 13):
        add("平码总分", f"六个平码总分加{amount}", lambda r, a=amount: sum(numbers(r)[:6]) + a)
        add("七码总分", f"七码总分加{amount}", lambda r, a=amount: sum(numbers(r)) + a)
        add("极值号码", f"最小平码加{amount}", lambda r, a=amount: min(numbers(r)[:6]) + a)
        add("极值号码", f"最大平码加{amount}", lambda r, a=amount: max(numbers(r)[:6]) + a)
    add("平码总分", "六个平码总分个位", lambda r: tail(sum(numbers(r)[:6])))
    add("七码总分", "七码总分个位", lambda r: tail(sum(numbers(r))))
    add("平码总分", "六个平码总分合数", lambda r: digit_sum(sum(numbers(r)[:6])))
    add("七码总分", "七码总分合数", lambda r: digit_sum(sum(numbers(r))))
    return candidates


def animal_for(value):
    normalized = wrap(value)
    return normalized, ANIMALS[(normalized - 1) % 12]


def evaluate(candidate, records):
    checks = []
    for source, target in zip(records, records[1:]):
        result_number, result_animal = animal_for(candidate["calculate"](source))
        matches = [index for index, item in enumerate(target["numberList"]) if item["shengXiao"] == result_animal]
        checks.append({
            "sourcePeriod": int(source["period"]),
            "targetPeriod": int(target["period"]),
            "resultNumber": result_number,
            "resultAnimal": result_animal,
            "hit": bool(matches),
            "targetPositions": [index + 1 for index in matches],
            "targetNumbers": [target["numberList"][index]["number"] for index in matches],
        })
    streak = 0
    for check in reversed(checks):
        if not check["hit"]:
            break
        streak += 1
    recent30 = checks[-30:]
    return {
        "family": candidate["family"],
        "name": candidate["name"],
        "recentStreak": streak,
        "recent30Rate": sum(item["hit"] for item in recent30) / len(recent30),
        "totalRate": sum(item["hit"] for item in checks) / len(checks),
        "predictionNumber": animal_for(candidate["calculate"](records[-1]))[0],
        "predictionAnimal": animal_for(candidate["calculate"](records[-1]))[1],
        "history": checks[-6:],
        "trajectory": tuple(item["resultAnimal"] for item in checks),
    }


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    evaluated = [evaluate(candidate, records) for candidate in build_candidates()]
    evaluated.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    unique = []
    seen = set()
    for method in evaluated:
        signature = (method["trajectory"], method["predictionAnimal"])
        if signature in seen:
            continue
        seen.add(signature)
        method.pop("trajectory")
        unique.append(method)
    strict_five = [method for method in unique if method["recentStreak"] >= 4]
    recent_three = [method for method in unique if method["recentStreak"] >= 3]
    qualified = [method for method in unique if method["recentStreak"] >= 1]
    published, published_animals = [], set()
    for method in qualified:
        if method["predictionAnimal"] in published_animals or not is_renderable_name(method["name"]):
            continue
        published_animals.add(method["predictionAnimal"])
        published.append(method)
    selected = []
    for method in strict_five:
        selected.append({**method, "tier": "5期公式"})
        if len(selected) == 10:
            break
    if len(selected) < 10:
        selected_names = {method["name"] for method in selected}
        for method in recent_three:
            if method["name"] in selected_names or method["recentStreak"] >= 4:
                continue
            selected.append({**method, "tier": "3期公式"})
            selected_names.add(method["name"])
            if len(selected) == 10:
                break
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "recordCount": len(records),
        "rawCandidateCount": len(evaluated),
        "uniqueCandidateCount": len(unique),
        "strictFiveCount": len(strict_five),
        "recentThreeCount": len(recent_three),
        "qualifiedCount": len(qualified),
        "qualifiedMethods": qualified,
        "publishedCount": len(published),
        "publishedMethods": published,
        "strictFiveMethods": strict_five,
        "selectedMethods": selected,
        "topMethods": unique[:30],
    }
    destination = ROOT / "data" / "pingte" / f"all-patterns-type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"原始公式：{len(evaluated)}；去重后：{len(unique)}")
    print(f"最近5期全中：{len(strict_five)}；最近至少连中3期：{len(recent_three)}")
    for index, method in enumerate(strict_five[:30], 1):
        print(f"{index:02d}. [{method['family']}] {method['name']} | 连中{method['recentStreak']} | 近30期{method['recent30Rate']:.0%} | 预测{method['predictionAnimal']}")
    print("入选前10：")
    for index, method in enumerate(selected, 1):
        print(f"{index:02d}. {method['tier']} | {method['name']} | 连中{method['recentStreak']} | 预测{method['predictionAnimal']}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
