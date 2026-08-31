import json
from pathlib import Path

from search_pingte_methods import fetch_year

ROOT = Path(__file__).resolve().parents[1]


def compact(item, rank):
    return {
        "rank": f"{rank:03d}",
        "sourceKey": item["sourceKey"],
        "branches": item["branches"],
        "recentStreak": item.get("recentStreak", 0),
        "recent30Hits": item.get("recent30Hits", 0),
        "recent30Rate": item.get("recent30Rate", 0),
    }


def compact_draw(record):
    return {
        "period": int(record["period"]),
        "displayPeriod": f'{int(record["period"]):03d}期',
        "date": record.get("lotteryTime", ""),
        "numbers": [
            {
                "number": f'{int(item["number"]):02d}',
                "animal": item["shengXiao"],
                "element": item.get("wuXing", ""),
            }
            for item in record["numberList"]
        ],
    }


def run(lottery_type):
    pools = json.loads((ROOT / f"data/fushi/pools-type-{lottery_type}-2026.json").read_text())
    lian = json.loads((ROOT / f"data/fushi/lianxiao-type-{lottery_type}-2026.json").read_text())
    draws = [compact_draw(record) for record in fetch_year(lottery_type, 2026)]
    groups = {
        "22": {"label": "二中二", "kind": "number", "poolSize": 2, "required": 2,
               "methods": [compact(item, index + 1) for index, item in enumerate(pools["groups"]["2"])]},
        "33": {"label": "三中三", "kind": "number", "poolSize": 3, "required": 3,
               "methods": [compact(item, index + 1) for index, item in enumerate(pools["groups"]["3"])]},
        "2x": {"label": "二连肖", "kind": "animal", "poolSize": 2, "required": 2,
               "methods": [compact(item, index + 1) for index, item in enumerate(lian["groups"]["2"])]},
        "3x": {"label": "三连肖", "kind": "animal", "poolSize": 4, "required": 3,
               "methods": [compact(item, index + 1) for index, item in enumerate(lian["groups"]["3"])]},
    }
    output = {"lotteryType": lottery_type, "year": 2026, "issue": pools["nextPeriod"], "groups": groups, "draws": draws}
    destination = ROOT / f"public/generated/fushi/type-{lottery_type}-{pools['nextPeriod']:03d}-manifest.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    print(destination, {key: len(group["methods"]) for key, group in groups.items()})


if __name__ == "__main__":
    for value in (1, 5, 8):
        run(value)
