import json
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from generate_pingte_all_pattern_images import font, center, render as render_single
from search_pingte_methods import ROOT, fetch_year

W, H = 1080, 2460
OUT_DIR = ROOT / "public" / "generated" / "pingte-two"


def render(pair, rank, issue, branch_paths):
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 230), radius=28, fill="#11100d")
    draw.rectangle((28, 170, W - 28, 230), fill="#11100d")
    draw.rectangle((28, 26, 38, 230), fill="#c59b43")
    draw.text((70, 58), "六合公式库", font=font(21, True), fill="#c59b43")
    center(draw, (W / 2, 105), f"2026-{issue:03d}期平特一肖", font(46, True), "#efd58e")
    center(draw, (W / 2, 160), "双肖同时开 · 历史轨迹图", font(24, True), "#9a875d")
    animals = pair["predictionAnimals"]
    draw.rounded_rectangle((382, 181, 516, 220), radius=19, fill="#31904f")
    draw.rounded_rectangle((564, 181, 698, 220), radius=19, fill="#31904f")
    center(draw, (449, 200), f"生肖一 {animals[0]}", font(18, True), "white")
    center(draw, (631, 200), f"生肖二 {animals[1]}", font(18, True), "white")

    for branch, y in ((pair["leftName"], 245), (pair["rightName"], 1340)):
        source = branch_paths[branch]
        panel = Image.open(source).convert("RGB").crop((28, 240, W - 28, 1330))
        image.paste(panel, (28, y))
    draw.rectangle((38, 1325, W - 38, 1340), fill="#11100d")
    center(draw, (W / 2, 1332), "两条公式必须在同一期同时命中", font(20, True), "#e0bd67")
    draw.text((68, 2410), "平码与特码均计入 · 历史轨迹仅供娱乐参考", font=font(22, True), fill="#8d6a2e")
    path = OUT_DIR / f"type-5-{issue:03d}-{rank:03d}.png"
    image.save(path, quality=95)
    return path


if __name__ == "__main__":
    singles = json.loads((ROOT / "data" / "pingte" / "all-patterns-type-5-2026.json").read_text(encoding="utf-8"))
    pairs = json.loads((ROOT / "data" / "pingte" / "two-animals-type-5-2026.json").read_text(encoding="utf-8"))
    single_map = {method["name"]: method for method in singles["qualifiedMethods"]}
    methods = pairs["publishedMethods"]
    issue = pairs["nextPeriod"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    records = fetch_year(5, 2026)
    with tempfile.TemporaryDirectory() as temporary:
        branch_dir = Path(temporary)
        branch_names = sorted({name for pair in methods for name in (pair["leftName"], pair["rightName"])})
        branch_paths = {name: render_single(single_map[name], records, index, issue, out_dir=branch_dir) for index, name in enumerate(branch_names, 1)}
        paths = [render(pair, rank, issue, branch_paths) for rank, pair in enumerate(methods, 1)]
    manifest = OUT_DIR / f"type-5-{issue:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue": issue, "methods": methods, "images": [str(path.relative_to(ROOT / 'public')) for path in paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {len(paths)} 张平特二肖图片：{manifest}")
