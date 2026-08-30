import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for lottery_type in (1, 5, 8):
    source = ROOT / "data" / "zodiac" / f"bundles-type-{lottery_type}-2026.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    issue = int(data["nextPeriod"])
    groups = {size: {"label": f"{size}肖", "methods": methods} for size, methods in data["publishedGroups"].items()}
    target = ROOT / "public" / "generated" / "zodiac" / f"type-{lottery_type}-{issue:03d}-manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"issue": issue, "groups": groups, "draws": data["draws"]}, ensure_ascii=False), encoding="utf-8")
    print(target, sum(len(group["methods"]) for group in groups.values()))
