import copy
import json
from PIL import Image, ImageDraw

from generate_pingte_all_pattern_images import render as render_single, font, center
from search_pingte_methods import ROOT, fetch_year


TARGET = 239
TYPE = 5


def trailing_hits(history):
    count = 0
    for item in reversed(history):
        if not item.get("hit"):
            break
        count += 1
    return max(1, count)


def single_for_issue(method):
    result = copy.deepcopy(method)
    prediction = next(item for item in result["history"] if item["targetPeriod"] == TARGET)
    result["predictionNumber"] = prediction["resultNumber"]
    result["predictionAnimal"] = prediction["resultAnimal"]
    result["history"] = [item for item in result["history"] if item["targetPeriod"] < TARGET]
    result["recentStreak"] = trailing_hits(result["history"])
    return result


def pair_for_issue(pair):
    result = copy.deepcopy(pair)
    prediction = next(item for item in result["history"] if item["targetPeriod"] == TARGET)
    result["predictionNumbers"] = prediction["numbers"]
    result["predictionAnimals"] = prediction["animals"]
    result["history"] = [item for item in result["history"] if item["targetPeriod"] < TARGET]
    result["recentStreak"] = trailing_hits(result["history"])
    return result


def render_pair_history(pair, rank, destination):
    width, height = 1080, 1400
    image = Image.new("RGB", (width, height), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, width - 28, height - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, width - 28, 240), radius=28, fill="#11100d")
    draw.rectangle((28, 180, width - 28, 240), fill="#11100d")
    draw.text((70, 58), "六合公式库", font=font(21, True), fill="#c59b43")
    center(draw, (width / 2, 125), f"2026-{TARGET:03d}期平特一肖", font(46, True), "#efd58e")
    center(draw, (width / 2, 190), "同一公式历史回看", font(24, True), "#9a875d")
    draw.rounded_rectangle((55, 275, width - 55, 470), radius=18, fill="#fffaf0", outline="#b88c3c", width=2)
    draw.text((85, 302), "公式一", font=font(20, True), fill="#a27a31")
    draw.text((205, 300), pair["leftName"], font=font(27, True), fill="#33291b")
    draw.text((85, 362), "公式二", font=font(20, True), fill="#a27a31")
    draw.text((205, 360), pair["rightName"], font=font(27, True), fill="#33291b")
    center(draw, (width / 2, 432), f"第{TARGET:03d}期参考：{pair['predictionAnimals'][0]}、{pair['predictionAnimals'][1]}", font(28, True), "#287b43")
    draw.text((70, 515), "历史验证", font=font(24, True), fill="#8d6a2e")
    rows = pair["history"][-5:]
    y = 565
    for item in reversed(rows):
        draw.rounded_rectangle((60, y, width - 60, y + 125), radius=12, fill="#fffdf8" if (y // 125) % 2 else "#f1ecdf", outline="#d4c8b3", width=1)
        draw.text((85, y + 22), f"{item['targetPeriod']:03d}期", font=font(27, True), fill="#aa7d2e")
        draw.text((250, y + 22), f"参考：{'、'.join(item['animals'])}", font=font(25, True), fill="#4a4235")
        draw.text((250, y + 70), f"号码：{'、'.join(str(number).zfill(2) for number in item['numbers'])}", font=font(20), fill="#756b5a")
        status = "命中" if item["hit"] else "未中"
        color = "#2f914e" if item["hit"] else "#b94438"
        draw.rounded_rectangle((850, y + 34, 980, y + 91), radius=25, fill=color)
        center(draw, (915, y + 62), status, font(21, True), "white")
        y += 140
    draw.text((70, 1328), "同一套公式逐期保存 · 仅供娱乐参考", font=font(22, True), fill="#8d6a2e")
    path = destination / f"type-5-{TARGET:03d}-{rank:03d}.png"
    image.save(path, quality=95)
    return path


def main():
    records = [item for item in fetch_year(TYPE, 2026) if int(item["period"]) < TARGET]
    current_singles = json.loads((ROOT / "public/generated/pingte-all/type-5-240-manifest.json").read_text(encoding="utf-8"))["methods"]
    singles = [single_for_issue(item) for item in current_singles]
    single_out = ROOT / "public/generated/pingte-all"
    single_paths = [render_single(item, records, rank, TARGET, TYPE, single_out) for rank, item in enumerate(singles, 1)]
    (single_out / "type-5-239-manifest.json").write_text(json.dumps({"issue": TARGET, "methods": singles, "images": [str(path.relative_to(ROOT / "public")) for path in single_paths]}, ensure_ascii=False, indent=2), encoding="utf-8")

    current_pairs = json.loads((ROOT / "public/generated/pingte-two/type-5-240-manifest.json").read_text(encoding="utf-8"))["methods"]
    pairs = [pair_for_issue(item) for item in current_pairs]
    pair_out = ROOT / "public/generated/pingte-two"
    pair_paths = [render_pair_history(item, rank, pair_out) for rank, item in enumerate(pairs, 1)]
    (pair_out / "type-5-239-manifest.json").write_text(json.dumps({"issue": TARGET, "methods": pairs, "images": [str(path.relative_to(ROOT / "public")) for path in pair_paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已回补第{TARGET}期平特一肖 {len(singles)} 条、平特二肖 {len(pairs)} 条")


if __name__ == "__main__":
    main()
