"""Append a compact snapshot of the currently published formulas.

Poster images stay outside the archive. Each record only keeps the stable formula
identity, prediction and score fields needed to calculate future hit history.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated"


def stable_id(board: str, signature: str) -> str:
    digest = hashlib.sha1(f"{board}|{signature}".encode("utf-8")).hexdigest()[:10]
    return f"{board.upper()}-{digest}"


def signature_of(item: dict[str, Any]) -> str:
    preferred = (
        "sourceKey", "name", "formulaName", "leftName", "rightName", "label",
        "rank",
    )
    values = [str(item[key]) for key in preferred if item.get(key) not in (None, "")]
    return "|".join(values) or json.dumps(item, ensure_ascii=False, sort_keys=True)


def prediction_of(item: dict[str, Any]) -> Any:
    keys = (
        "predictionAnimals", "predictionNumbers", "next", "values", "outputs",
        "output", "prediction", "result",
    )
    result = {key: item[key] for key in keys if key in item}
    return result or None


def score_of(item: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "recentStreak", "streak", "maxStreak", "recent30Rate", "recent30Hits",
        "totalRate", "totalHits", "totalTests",
    )
    return {key: item[key] for key in keys if key in item}


def iter_methods(payload: dict[str, Any]) -> Iterable[tuple[str, dict[str, Any]]]:
    for item in payload.get("methods", []):
        yield "", item
    for group_key, group in payload.get("groups", {}).items():
        for item in group.get("methods", []):
            yield str(group_key), item


def snapshot(lottery_type: int, year: int, issue: int) -> dict[str, Any]:
    patterns = [
        ("pingte", GENERATED / "pingte-all" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("pingte2", GENERATED / "pingte-two" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("tema", GENERATED / "tema-bundles" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("zodiac", GENERATED / "zodiac" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("fushi", GENERATED / "fushi" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("danshuang", GENERATED / "danshuang" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("wave", GENERATED / "wave" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("wuxing", GENERATED / "wuxing" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("jiaye", GENERATED / "jiaye" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("kill", GENERATED / "kill" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("size", GENERATED / "size" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("tail", GENERATED / "tail" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
        ("head", GENERATED / "head" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
    ]
    records = []
    for board, path in patterns:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for group, item in iter_methods(payload):
            signature = signature_of(item)
            records.append({
                "formulaId": stable_id(f"{board}-{group}", signature),
                "board": board,
                "group": group,
                "signature": signature,
                "prediction": prediction_of(item),
                "score": score_of(item),
                "status": "pending",
            })
    return {"issue": issue, "formulaCount": len(records), "formulas": records}


def archive(lottery_type: int, year: int, issue: int) -> Path:
    destination = GENERATED / "formula-history" / f"type-{lottery_type}-{year}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(destination.read_text(encoding="utf-8")) if destination.exists() else {
        "lotteryType": lottery_type,
        "year": year,
        "snapshots": [],
    }
    current = snapshot(lottery_type, year, issue)
    data["snapshots"] = [row for row in data.get("snapshots", []) if row.get("issue") != issue]
    data["snapshots"].append(current)
    data["snapshots"].sort(key=lambda row: row["issue"])
    destination.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"-- 轻量历史：{destination}（{current['formulaCount']} 条）")
    return destination


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", type=int, required=True)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--issue", type=int, required=True)
    args = parser.parse_args()
    archive(args.type, args.year, args.issue)
