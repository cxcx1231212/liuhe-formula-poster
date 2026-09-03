import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "tema" / "bundles-type-5-2026.json"
OUT = ROOT / "public" / "generated" / "tema-bundles"


def compact(method):
    branches = method.get("branches", [])
    return {
        "sourceKey": method["sourceKey"],
        "formulaId": method.get("formulaId", ""),
        "recentStreak": method.get("recentStreak", 0),
        "numbers": [branch["number"] for branch in branches],
        "branches": [
            {"name": branch["name"], "number": branch["number"]}
            for branch in branches
        ],
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    issue = int(data["nextPeriod"])
    groups = {}
    for key in ("3", "8", "10", "18"):
        methods = data.get("bundles", {}).get(key, [])
        groups[key] = {"methods": [compact(method) for method in methods], "images": []}
    manifest = {
        "lotteryType": data["lotteryType"],
        "year": data["year"],
        "issue": issue,
        "groups": groups,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    destination = OUT / f"type-{data['lotteryType']}-{issue:03d}-manifest.json"
    destination.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    print(f"特码轻量清单：{destination}（{sum(len(v['methods']) for v in groups.values())} 条）")


if __name__ == "__main__":
    main()
