import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated"
SOURCES = [
    ("pingte:one", "pingte-all", None), ("pingte:two", "pingte-two", None),
    *((f"tema:{c}", "tema-bundles", c) for c in ("3", "8", "10", "18")),
    *((f"zodiac:{c}", "zodiac", c) for c in ("1", "3", "6", "9")),
    *((f"fushi:{c}", "fushi", c) for c in ("22", "33", "2x", "3x")),
    ("danshuang:", "danshuang", None), ("wave:", "wave", None),
    ("wuxing:", "wuxing", None), ("jiaye:", "jiaye", None),
    *((f"kill:{c}", "kill", c) for c in ("code", "animal", "tail", "head", "wave")),
    ("size:", "size", None), ("tail:", "tail", None), ("head:", "head", None),
]

def latest(folder, lottery_type):
    found = []
    for path in (GENERATED / folder).glob(f"type-{lottery_type}-*-manifest.json"):
        match = re.search(r"type-\d+-(\d+)-manifest", path.name)
        if match:
            found.append((int(match.group(1)), path))
    if not found:
        raise FileNotFoundError(f"missing {folder} for type {lottery_type}")
    return max(found)[1]

def number(value):
    return value if isinstance(value, (int, float)) else 0

def rate(method):
    if isinstance(method.get("totalRate"), (int, float)):
        return method["totalRate"]
    history = method.get("history")
    if isinstance(history, list) and history:
        return sum(row.get("hit") is True for row in history) / len(history)
    if isinstance(method.get("recent30Rate"), (int, float)):
        return method["recent30Rate"]
    return number(method.get("recent30Hits")) / 30

def compact(method):
    return {key: method[key] for key in ("rank", "label", "name") if key in method}

def build(lottery_type):
    boards = {}
    for key, folder, category in SOURCES:
        data = json.loads(latest(folder, lottery_type).read_text(encoding="utf-8"))
        if folder == "zodiac" and category:
            split = GENERATED / "zodiac" / f"type-{lottery_type}-{int(data['issue']):03d}-{category}-manifest.json"
            split.write_text(json.dumps({"issue": int(data["issue"]), "group": data.get("groups", {}).get(category, {}), "draws": data.get("draws", [])}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        methods = data.get("groups", {}).get(category, {}).get("methods", []) if category else data.get("methods", [])
        methods = sorted(methods, key=lambda m: (-number(m.get("recentStreak", m.get("streak"))), -rate(m)))
        boards[key] = {"issue": int(data["issue"]), "methods": [compact(m) for m in methods]}
    output_dir = GENERATED / "home-board"
    output_dir.mkdir(parents=True, exist_ok=True)
    for key, payload in boards.items():
        safe_key = key.replace(":", "-")
        output = output_dir / f"type-{lottery_type}-{safe_key}.json"
        output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"首页轻量清单：{output} ({output.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    for value in (1, 5, 8):
        build(value)
