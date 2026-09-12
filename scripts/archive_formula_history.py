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
        "family", "category", "kind", "size", "lineCount",
    )
    values = [str(item[key]) for key in preferred if item.get(key) not in (None, "")]
    branch_names = item.get("branchNames") or [row.get("name") for row in item.get("branches", []) if row.get("name")]
    values.extend(sorted(map(str, branch_names)))
    structural = any(item.get(key) not in (None, "") for key in ("sourceKey", "name", "formulaName", "leftName", "rightName", "family", "category", "kind")) or bool(branch_names)
    if not structural and item.get("rank") not in (None, ""):
        values.append(f"legacy-rank:{item['rank']}")
    # Older manifests did not preserve the formula source for a few boards.
    # Rank is only a last-resort compatibility key for those legacy snapshots.
    return "|".join(values) or f"legacy-rank:{item.get('rank', '')}"


from repair_history_integrity import prediction_for as prediction_of, settle, draw_record, backup
# history-integrity-v1


def score_of(item: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "recentStreak", "streak", "maxStreak", "recent30Rate", "recent30Hits",
        "totalRate", "totalHits", "totalTests",
    )
    return {key: item[key] for key in keys if key in item}


def iter_methods(payload: dict[str, Any]) -> Iterable[tuple[str, int, dict[str, Any]]]:
    for index, item in enumerate(payload.get("methods", []), 1):
        yield "", index, item
    for group_key, group in payload.get("groups", {}).items():
        for index, item in enumerate(group.get("methods", []), 1):
            yield str(group_key), index, item


def post_href(board: str, group: str, issue: int, rank: str) -> str:
    if board in {"tema", "zodiac", "fushi", "kill", "advanced"}:
        return f"/posts/{board}/{group}/{issue}/{rank}"
    return f"/posts/{board}/{issue}/{rank}"


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
        ("advanced", GENERATED / "advanced" / f"type-{lottery_type}-{issue:03d}-manifest.json"),
    ]
    from search_pingte_methods import fetch_year
    source_draw = next((draw_record(x) for x in fetch_year(lottery_type, year) if int(x["period"]) == issue-1), None)
    records = []
    for board, path in patterns:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for group, index, item in iter_methods(payload):
            signature = signature_of(item)
            formula_id = stable_id(f"{board}-{group}", signature)
            if item.get("formulaId") != formula_id:
                item["formulaId"] = formula_id
                changed = True
            rank = str(item.get("rank") or index).zfill(3)
            records.append({
                "formulaId": formula_id,
                "board": board,
                "group": group,
                "signature": signature,
                "rank": rank,
                "label": item.get("label") or item.get("name") or item.get("sourceKey") or board,
                "image": item.get("image"),
                "href": post_href(board, group, issue, rank),
                "prediction": prediction_of(item, board, group, source_draw),
                "score": score_of(item),
                "status": "pending",
            })
        if changed:
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"issue": issue, "formulaCount": len(records), "formulas": records}


def archive(lottery_type: int, year: int, issue: int) -> Path:
    legacy = GENERATED / "formula-history" / f"type-{lottery_type}-{year}.json"
    destination = GENERATED / "formula-history" / f"type-{lottery_type}-{year}" / "snapshots"
    destination.mkdir(parents=True, exist_ok=True)
    # history-snapshots-v1: retain legacy backup; append only per-issue files.
    if legacy.exists():
        for row in json.loads(legacy.read_text(encoding="utf-8")).get("snapshots", []):
            path = destination / f"{int(row['issue']):03d}.json"
            if not path.exists():
                path.write_text(json.dumps(row, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    current = snapshot(lottery_type, year, issue)
    current_path = destination / f"{issue:03d}.json"
    if current_path.exists(): backup(current_path)
    current_path.write_text(json.dumps(current, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    from search_pingte_methods import fetch_year
    draws = {int(row["period"]): row for row in fetch_year(lottery_type, year)}
    for path in destination.glob("*.json"):
        draw = draws.get(int(path.stem))
        if draw:
            row = json.loads(path.read_text(encoding="utf-8"))
            settle(row, draw)
            path.write_text(json.dumps(row, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"-- Per-issue history: {current_path} ({current['formulaCount']} formulas)")
    return current_path



if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", type=int, required=True)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--issue", type=int, required=True)
    args = parser.parse_args()
    archive(args.type, args.year, args.issue)
