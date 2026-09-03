import argparse
import importlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

LOTTERIES = {
    1: "香港六合彩",
    5: "澳门六合彩",
    8: "疯狂天天六合彩",
}

SEARCH_MODULES = [
    "search_pingte_methods",
    "search_pingte_all_patterns",
    "search_pingte_two_animals",
    "search_tema_patterns",
    "search_tema_one_complete",
    "search_tema_bundles",
    "search_zodiac_bundles",
    "search_fushi_pools",
    "search_lianxiao_pools",
]

GENERATOR_SCRIPTS = [
    "generate_tema_manifest.py",
    "generate_zodiac_posters.py",
    "generate_wuxing_posters.py",
    "generate_jiaye_posters.py",
    "generate_kill_posters.py",
    "generate_size_posters.py",
    "generate_tail_head_posters.py",
]

def run_search(module_name: str, lottery_type: int, year: int):
    module = importlib.import_module(module_name)
    function = getattr(module, "run", None) or getattr(module, "search")
    return function(lottery_type, year)

def run_generator(filename: str, lottery_type: int, year: int):
    source = (SCRIPTS / filename).read_text(encoding="utf-8")
    name = LOTTERIES[lottery_type]
    short_name = name.replace("六合彩", "")
    replacements = {
        "type-5-2026": f"type-{lottery_type}-{year}",
        "type-5-": f"type-{lottery_type}-",
        "fetch_year(5, 2026)": f"fetch_year({lottery_type}, {year})",
        "fetch_year(5,2026)": f"fetch_year({lottery_type},{year})",
        '"lotteryType": 5': f'"lotteryType": {lottery_type}',
        '"lotteryType":5': f'"lotteryType":{lottery_type}',
        '"year": 2026': f'"year": {year}',
        '"year":2026': f'"year":{year}',
        '"澳门六合彩 ·': f'"{name} ·',
        'f"澳门{next_period:03d}期': 'f"' + short_name + '{next_period:03d}期',
    }
    for old, new in replacements.items():
        source = source.replace(old, new)
    namespace = {
        "__name__": "__main__",
        "__file__": str(SCRIPTS / filename),
        "__package__": None,
    }
    previous_argv = sys.argv
    try:
        sys.argv = [str(SCRIPTS / filename), "--type", str(lottery_type), "--year", str(year)]
        exec(compile(source, str(SCRIPTS / filename), "exec"), namespace)
    finally:
        sys.argv = previous_argv

def update(lottery_type: int, year: int):
    print(f"\n===== 更新 {LOTTERIES[lottery_type]}（{lottery_type}） =====")
    results = {}
    for module_name in SEARCH_MODULES:
        print(f"-- 数据分析：{module_name}")
        results[module_name] = run_search(module_name, lottery_type, year)

    # Reuse the search results directly; the website renders these formulas from JSON.
    next_period = results["search_pingte_two_animals"]["nextPeriod"]
    pingte_manifests = (
        ("pingte-all", results["search_pingte_all_patterns"]),
        ("pingte-two", results["search_pingte_two_animals"]),
    )
    for folder, payload in pingte_manifests:
        output_dir = ROOT / "public" / "generated" / folder
        output_dir.mkdir(parents=True, exist_ok=True)
        manifest = output_dir / f"type-{lottery_type}-{next_period:03d}-manifest.json"
        manifest.write_text(json.dumps({"issue": next_period, "methods": payload["publishedMethods"], "images": []}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"-- 生成清单：{manifest}")

    for filename in GENERATOR_SCRIPTS:
        print(f"-- 生成清单：{filename}")
        run_generator(filename, lottery_type, year)
    # 复式页面使用全部公式清单；不要让旧的“只保留近期最佳”图片生成器
    # 覆盖固定预测数量（2码、3码、2肖、4肖）的完整结果。
    from build_fushi_full_manifests import run as build_fushi_manifest
    build_fushi_manifest(lottery_type)
    # 单双与复式一样保留全部加减公式，历史页在访问时按同一公式动态回算。
    from build_danshuang_full_manifests import run as build_danshuang_manifest
    build_danshuang_manifest(lottery_type, year)
    from build_wave_full_manifests import run as build_wave_manifest
    build_wave_manifest(lottery_type, year)
    from search_pingte_methods import fetch_year
    next_period = int(fetch_year(lottery_type, year)[-1]["period"]) + 1
    plain = f"type-{lottery_type}-{next_period}"
    padded = f"type-{lottery_type}-{next_period:03d}"
    if plain != padded:
        generated = ROOT / "public" / "generated"
        for path in generated.rglob(f"{plain}*"):
            path.rename(path.with_name(path.name.replace(plain, padded, 1)))
        for manifest in generated.rglob(f"{padded}-manifest.json"):
            text = manifest.read_text(encoding="utf-8").replace(plain, padded)
            manifest.write_text(text, encoding="utf-8")
    from archive_formula_history import archive
    archive(lottery_type, year, next_period)
    return {"lotteryType": lottery_type, "year": year, "nextPeriod": next_period}

def refresh_manifest_imports(updated: list[dict]):
    """Point the website build at the manifests produced in this run."""
    for path in (ROOT / "lib" / "formula-manifests.ts", ROOT / "lib" / "home-board-data.ts", ROOT / "app" / "page.tsx"):
        source = path.read_text(encoding="utf-8")
        for row in updated:
            lottery_type = row["lotteryType"]
            issue = row["nextPeriod"]
            source = re.sub(
                rf"type-{lottery_type}-\d{{3}}-manifest\.json",
                f"type-{lottery_type}-{issue:03d}-manifest.json",
                source,
            )
        path.write_text(source, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description="更新三个彩种的公式数据和图片")
    parser.add_argument("--types", nargs="+", type=int, default=[1, 5, 8])
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()
    invalid = [value for value in args.types if value not in LOTTERIES]
    if invalid:
        raise SystemExit(f"不支持的彩种：{invalid}")
    destination = ROOT / "public" / "generated" / "lottery-catalog.json"
    existing = json.loads(destination.read_text(encoding="utf-8")) if destination.exists() else []
    updated = [update(value, args.year) for value in args.types]
    refresh_manifest_imports(updated)
    by_type = {item["lotteryType"]: item for item in [*existing, *updated]}
    catalog = [by_type[value] for value in sorted(by_type)]
    destination.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n全部更新完成：{destination}")

if __name__ == "__main__":
    main()
