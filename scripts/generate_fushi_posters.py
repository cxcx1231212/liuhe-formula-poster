import json

from generate_fushi_samples import render
from generate_zodiac_posters import candidate_map
from search_pingte_methods import ROOT, fetch_year


CONFIG = {
    "22": ("二中二", "2", 2, "number", "pools-type-5-2026.json"),
    "33": ("三中三", "3", 3, "number", "pools-type-5-2026.json"),
    "2x": ("二连肖", "2", 2, "animal", "lianxiao-type-5-2026.json"),
    "3x": ("三连肖", "3", 3, "animal", "lianxiao-type-5-2026.json"),
}


def main():
    data_dir = ROOT / "data" / "fushi"
    output_dir = ROOT / "public" / "generated" / "fushi"
    records = fetch_year(5, 2026)
    formulas = candidate_map()
    manifest = {"lotteryType": 5, "year": 2026, "issue": int(records[-1]["period"]) + 1, "groups": {}}
    loaded = {}
    for key, (label, source_group, required, kind, source_file) in CONFIG.items():
        payload = loaded.setdefault(source_file, json.loads((data_dir / source_file).read_text(encoding="utf-8")))
        candidates = payload["groups"][source_group]
        best = max(item["recent30Hits"] for item in candidates)
        methods = [item for item in candidates if item["recent30Hits"] == best]
        methods.sort(key=lambda item: (item["recentStreak"], item["totalRate"]), reverse=True)
        entries = []
        for index, method in enumerate(methods, 1):
            rank = f"{index:03d}"
            filename = f"type-5-{manifest['issue']}-{key}-{rank}.png"
            render(method, label, required, kind, manifest["issue"], records, formulas, output_dir, filename)
            entries.append({**method, "rank": rank, "image": f"/generated/fushi/{filename}"})
        manifest["groups"][key] = {"label": label, "required": required, "kind": kind, "recent30Best": best, "methods": entries}
        print(f"{label}: {len(entries)} posts")
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"type-5-{manifest['issue']}-manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
