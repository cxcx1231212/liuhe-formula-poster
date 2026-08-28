import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
API = "https://6htv70.com/gallerynew/h5/lottery/search"
ANIMALS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"]
POSITION_NAMES = ["平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]


def fetch_page(lottery_type, year, page):
    query = urlencode({"pageNum": page, "year": year, "sort": 1, "lotteryType": lottery_type})
    request = Request(f"{API}?{query}", headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=20) as response:
        payload = json.load(response)
    if not payload.get("success"):
        raise RuntimeError(payload.get("msg") or "开奖接口请求失败")
    return payload["data"]


def fetch_year(lottery_type, year):
    first = fetch_page(lottery_type, year, 1)
    total_pages = first["pager"]["totalPageCount"]
    pages = {1: first["recordList"]}
    if total_pages > 1:
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {page: pool.submit(fetch_page, lottery_type, year, page) for page in range(2, total_pages + 1)}
            for page, future in futures.items():
                pages[page] = future.result()["recordList"]
    records = [record for page in range(1, total_pages + 1) for record in pages[page]]
    return sorted(records, key=lambda record: (record["year"], record["period"]))


def digit_sum(number):
    return sum(int(char) for char in str(abs(number)))


def offset_for(mode, parameter, period):
    if mode == "固定":
        return parameter
    if mode == "固定减":
        return -parameter
    if mode == "递增":
        return ((period + parameter - 1) % 12) + 1
    if mode == "递减":
        return ((-period + parameter - 1) % 12) + 1
    if mode == "期合":
        return ((digit_sum(period) + parameter - 1) % 12) + 1
    raise ValueError(mode)


def wrap(number):
    while number > 49:
        number -= 12
    while number < 1:
        number += 12
    return number


def evaluate(records, position, mode, parameter):
    checks = []
    for source, target in zip(records, records[1:]):
        source_number = int(source["numberList"][position]["number"])
        add = offset_for(mode, parameter, int(source["period"]))
        result_number = wrap(source_number + add)
        result_animal = ANIMALS[(result_number - 1) % 12]
        target_numbers = target["numberList"]
        matches = [index for index, item in enumerate(target_numbers) if item["shengXiao"] == result_animal]
        checks.append({
            "sourcePeriod": int(source["period"]),
            "targetPeriod": int(target["period"]),
            "sourcePosition": position + 1,
            "sourceNumber": source_number,
            "sourceAnimal": source["numberList"][position]["shengXiao"],
            "add": add,
            "resultNumber": result_number,
            "resultAnimal": result_animal,
            "hit": bool(matches),
            "targetPositions": [index + 1 for index in matches],
            "targetNumbers": [target_numbers[index]["number"] for index in matches],
        })
    streak = 0
    for check in reversed(checks):
        if not check["hit"]:
            break
        streak += 1
    recent = checks[-30:]
    recent_rate = sum(check["hit"] for check in recent) / len(recent) if recent else 0
    total_rate = sum(check["hit"] for check in checks) / len(checks) if checks else 0
    return checks, streak, recent_rate, total_rate


def search(lottery_type=5, year=2026, limit=10, minimum_streak=3):
    records = fetch_year(lottery_type, year)
    if len(records) < 5:
        raise RuntimeError("开奖记录不足，无法搜索公式")
    candidates = []
    for position in range(7):
        # Keep only transparent patterns: the same fixed addition or subtraction.
        for mode in ("固定", "固定减"):
            parameters = range(1, 13) if mode == "固定" else range(12)
            for parameter in parameters:
                checks, streak, recent_rate, total_rate = evaluate(records, position, mode, parameter)
                if streak < minimum_streak:
                    continue
                latest = records[-1]
                source_number = int(latest["numberList"][position]["number"])
                add = offset_for(mode, parameter, int(latest["period"]))
                result_number = wrap(source_number + add)
                result_animal = ANIMALS[(result_number - 1) % 12]
                candidates.append({
                    "position": position + 1,
                    "positionName": POSITION_NAMES[position],
                    "mode": mode,
                    "parameter": parameter,
                    "formulaName": f"{POSITION_NAMES[position]}生肖{'固定加' if mode == '固定' else '固定减'}法",
                    "currentPeriod": int(latest["period"]),
                    "nextPeriod": int(latest["period"]) + 1,
                    "sourceNumber": source_number,
                    "sourceAnimal": latest["numberList"][position]["shengXiao"],
                    "nextAdd": add,
                    "predictionNumber": result_number,
                    "predictionAnimal": result_animal,
                    "recentStreak": streak,
                    "recent30Rate": round(recent_rate, 4),
                    "totalRate": round(total_rate, 4),
                    "history": checks[-max(5, streak):],
                })
    candidates.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"], -abs(item["nextAdd"])), reverse=True)
    selected = []
    signatures = set()
    for candidate in candidates:
        normalized_step = offset_for(candidate["mode"], candidate["parameter"], candidate["currentPeriod"]) % 12
        signature = (candidate["position"], normalized_step)
        if signature in signatures:
            continue
        signatures.add(signature)
        selected.append(candidate)
        if len(selected) == limit:
            break
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "recordCount": len(records),
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "minimumStreak": minimum_streak,
        "candidateCount": len({
            (candidate["position"], offset_for(candidate["mode"], candidate["parameter"], candidate["currentPeriod"]) % 12)
            for candidate in candidates
        }),
        "methods": selected,
    }
    destination = ROOT / "data" / "pingte" / f"type-{lottery_type}-{year}-{output['nextPeriod']:03d}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return output, destination


if __name__ == "__main__":
    lottery_type = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    year = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
    output, destination = search(lottery_type, year)
    print(f"记录：{output['recordCount']}期")
    print(f"候选：{output['candidateCount']}个；入选：{len(output['methods'])}个")
    for index, method in enumerate(output["methods"], 1):
        print(f"{index:02d}. {method['positionName']} {method['mode']} 参数{method['parameter']} | 连中{method['recentStreak']}期 | 近30期{method['recent30Rate']:.0%} | 下期{method['predictionAnimal']}")
    print(destination)
