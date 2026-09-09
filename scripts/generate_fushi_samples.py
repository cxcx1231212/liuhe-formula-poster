import json
import math
import re

from PIL import Image, ImageDraw

from generate_pingte_all_pattern_images import center, font
from generate_zodiac_posters import COLORS, XS, animal, base_expression, candidate_map, source_positions
from search_pingte_methods import ROOT, fetch_year, wrap


W = 1080
OUT = ROOT / "previews" / "fushi"


def calculation_text(name, record, formulas):
    raw = formulas[name](record)
    result = wrap(raw)
    if match := re.fullmatch(r"(.+?)交替加减(\d+)", name):
        base, amount = match.groups()
        expression, _ = base_expression(base.removesuffix("固定").replace("特码码", "特码"), record)
        symbol = "＋" if int(record["period"]) % 2 else "－"
        answer = f"{raw}" if 1 <= raw <= 49 else f"{raw}→{result:02d}"
        return f"{expression}{symbol}{amount}＝{answer}"
    if match := re.fullmatch(r"(.+?)(加|减|乘)(\d+)", name):
        base, operation, amount = match.groups()
        expression, _ = base_expression(base, record)
        symbol = {"加": "＋", "减": "－", "乘": "×"}[operation]
        answer = f"{raw}" if 1 <= raw <= 49 else f"{raw}→{result:02d}"
        return f"{expression}{symbol}{amount}＝{answer}"
    if match := re.fullmatch(r"(.+?)除(\d+)(取整|余数)", name):
        base, amount, mode = match.groups()
        expression, _ = base_expression(base, record)
        operation = f"÷{amount}取整" if mode == "取整" else f"÷{amount}余"
        answer = f"{raw}" if 1 <= raw <= 49 else f"{raw}→{result:02d}"
        return f"({expression}){operation}＝{answer}"
    return f"{name}＝{result:02d}"


def box_height(size):
    # 手机端优先保证文字清晰：项目越多就让图片向下延长，不横向硬塞。
    columns = 2 if size <= 10 else 3
    return math.ceil(size / columns) * 76 + 24, columns


def formula_box(draw, top, branches, source, formulas, required, kind, target=None):
    height, columns = box_height(len(branches))
    left, right = 305, 1005
    draw.rounded_rectangle((left, top, right, top + height), radius=13, fill="#fffaf0", outline="#c59b43", width=3)
    cell_w = (right - left - 20) / columns
    number_results = [wrap(formulas[branch["name"]](source)) for branch in branches]
    results = [animal(formulas[branch["name"]](source)) for branch in branches] if kind == "animal" else number_results
    target_positions = {}
    if target:
        for position, item in enumerate(target["numberList"][:6]):
            key = item["shengXiao"] if kind == "animal" else int(item["number"])
            target_positions.setdefault(key, position)
    matched_results = set(results) & set(target_positions)
    full_hit = bool(target) and len(matched_results) >= required
    matches = []
    used_results = set()
    for index, branch in enumerate(branches):
        row, column = divmod(index, columns)
        x1 = left + 10 + column * cell_w
        y1 = top + 12 + row * 76
        color = COLORS[index % len(COLORS)]
        draw.rounded_rectangle((x1, y1, x1 + cell_w - 8, y1 + 62), radius=9, fill=color)
        text = calculation_text(branch["name"], source, formulas) + (f"＝{results[index]}" if kind == "animal" else "")
        text_size = 19 if columns == 3 else 22
        center(draw, (x1 + (cell_w - 8) / 2, y1 + 31), text, font(text_size, True), "white")
        if full_hit and results[index] in target_positions and results[index] not in used_results:
            used_results.add(results[index])
            draw.rounded_rectangle((x1 - 2, y1 - 2, x1 + cell_w - 6, y1 + 64), radius=11, outline="#11100d", width=4)
            matches.append((index, target_positions[results[index]], x1 + cell_w - 8, y1 + 31))
    return height, matches


def record_row(draw, record, y, faded=False):
    draw.rectangle((48, y - 55, W - 48, y + 73), fill="#fffdf8" if not faded else "#f2ede2")
    draw.text((61, y - 18), f"{int(record['period']):03d}期", font=font(29, True), fill="#b78934")
    draw.text((61, y + 28), record["lotteryTime"].replace("年", "/").replace("月", "/").replace("日", ""), font=font(15, True), fill="#817868")
    for position, item in enumerate(record["numberList"]):
        x = XS[position + 1]
        draw.ellipse((x - 30, y - 30, x + 30, y + 30), fill="#faf6ed", outline="#cfc6b5", width=3)
        center(draw, (x, y), item["number"], font(27, True), "#5f594f")
        center(draw, (x, y + 43), item["shengXiao"], font(18, True), "#817b70")


def mark_sources(draw, record, y, formula_name, panel_top, panel_height):
    positions = source_positions(formula_name, record)
    merge_y = (y - 35 + panel_top + panel_height) / 2
    for position in positions:
        x = XS[position + 1]
        draw.ellipse((x - 36, y - 36, x + 36, y + 36), outline="#bd851f", width=6)
        draw.ellipse((x - 35, y - 49, x - 7, y - 21), fill="#bd851f")
        center(draw, (x - 21, y - 35), "取", font(15, True), "white")
        draw.line((x, y - 37, x, merge_y), fill="#bd851f", width=5)
    left_x = min(XS[position + 1] for position in positions)
    draw.line((left_x, merge_y, 305, merge_y, 305, panel_top + panel_height), fill="#bd851f", width=5, joint="curve")


def render(bundle, label, required, kind, issue, records, formulas, output_dir=OUT, filename=None):
    result_key = "animal" if kind == "animal" else "number"
    branches = sorted(bundle["branches"], key=lambda item: str(item[result_key]))
    branch_count = len(branches)
    panel_h, _ = box_height(branch_count)
    prediction_columns = 8 if kind == "number" else 6
    prediction_rows = math.ceil(branch_count / prediction_columns)
    current_panel_top = 350 + prediction_rows * 66
    first_y = current_panel_top + panel_h + 125
    gap = panel_h + 190
    row_ys = [first_y + index * gap for index in range(4)]
    H = row_ys[-1] + 135
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 215), radius=28, fill="#11100d")
    draw.rectangle((28, 160, W - 28, 215), fill="#11100d")
    draw.rectangle((28, 26, 38, 215), fill="#c59b43")
    draw.text((70, 56), "六合公式库", font=font(21, True), fill="#c59b43")
    center(draw, (W / 2, 112), f"2026-{issue:03d}期 · {label}", font(45, True), "#efd58e")
    center(draw, (W / 2, 174), f"{bundle['sourceKey']} · 只算六个平码", font(22, True), "#9a875d")
    for x, text in zip(XS, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 248), text, font(21, True), "#8b6726")

    draw.text((60, 292), f"{issue:03d}期预测", font=font(24, True), fill="#c62f31")
    predictions = bundle["animals"] if kind == "animal" else bundle["numbers"]
    for index, result in enumerate(predictions):
        row, column = divmod(index, prediction_columns)
        x = 355 + column * (610 / max(1, prediction_columns - 1))
        y = 310 + row * 66
        draw.ellipse((x - 27, y - 27, x + 27, y + 27), fill=COLORS[index % len(COLORS)], outline="white", width=4)
        text = result if kind == "animal" else f"{result:02d}"
        center(draw, (x, y), text, font(24, True), "white")
    current_height, _ = formula_box(draw, current_panel_top, branches, records[-1], formulas, required, kind)
    draw.line((960, current_panel_top, 960, 310 + (prediction_rows - 1) * 66 + 32), fill="#c59b43", width=5)

    shown = list(reversed(records[-4:]))
    for index, (record, y) in enumerate(zip(shown, row_ys)):
        record_row(draw, record, y, index % 2 == 1)
    mark_sources(draw, records[-1], row_ys[0], branches[0]["name"], current_panel_top, current_height)

    chronological = records[-4:]
    ys = list(reversed(row_ys))
    for index, (source, target) in enumerate(zip(chronological, chronological[1:])):
        source_y, target_y = ys[index], ys[index + 1]
        panel_top = target_y + 82
        height, matches = formula_box(draw, panel_top, branches, source, formulas, required, kind, target)
        mark_sources(draw, source, source_y, branches[0]["name"], panel_top, height)
        for branch_index, position, cell_x, cell_y in matches:
            target_x = XS[position + 1]
            color = COLORS[branch_index % len(COLORS)]
            draw.ellipse((target_x - 36, target_y - 36, target_x + 36, target_y + 36), outline=color, width=6)
        if len(matches) >= required:
            draw.text((66, panel_top + height / 2 - 14), f"命中{label}", font=font(24, True), fill="#c62f31")
            draw.line((1005, panel_top + height / 2, 1020, panel_top + height / 2, 1020, target_y + 38), fill="#c62f31", width=5, joint="curve")
            draw.polygon([(1020, target_y + 30), (1009, target_y + 48), (1031, target_y + 48)], fill="#c62f31")

    draw.text((68, H - 64), f"预测池开出任意{required}{'肖' if kind == 'animal' else '个号码'}即中 · 只算六个平码 · 仅供娱乐参考", font=font(20, True), fill="#8d6a2e")
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / (filename or f"type-5-{issue:03d}-{label}-sample.png")
    image.save(path, quality=94)
    return path


def main():
    number_payload = json.loads((ROOT / "data" / "fushi" / "pools-type-5-2026.json").read_text(encoding="utf-8"))
    animal_payload = json.loads((ROOT / "data" / "fushi" / "lianxiao-type-5-2026.json").read_text(encoding="utf-8"))
    records = fetch_year(5, 2026)
    formulas = candidate_map()
    for key, label in (("2", "二中二"), ("3", "三中三")):
        bundle = max(number_payload["groups"][key], key=lambda item: (item["recent30Hits"], item["recentStreak"], item["totalRate"]))
        print(render(bundle, label, int(key), "number", number_payload["nextPeriod"], records, formulas))
    for key, label in (("2", "二连肖"), ("3", "三连肖")):
        bundle = max(animal_payload["groups"][key], key=lambda item: (item["recent30Hits"], item["recentStreak"], item["totalRate"]))
        print(render(bundle, label, int(key), "animal", animal_payload["nextPeriod"], records, formulas))


if __name__ == "__main__":
    main()
