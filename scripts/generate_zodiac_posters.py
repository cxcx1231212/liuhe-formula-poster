import json
import math
import re

from PIL import Image, ImageDraw

from generate_pingte_all_pattern_images import center, font
from search_pingte_methods import ANIMALS, ROOT, fetch_year, wrap
from search_pingte_all_patterns import numbers
from search_zodiac_bundles import animal, make_series


W = 1080
OUT = ROOT / "public" / "generated" / "zodiac"
COLORS = ["#c62f31", "#287eb7", "#2b914f", "#bd7925", "#7652a2", "#bd4776", "#27747a", "#8d5b2b", "#536db0"]
XS = [112, 272, 392, 512, 632, 752, 872, 992]


def candidate_map():
    result = {}
    for _, definitions in make_series():
        for name, calculate in definitions:
            result[name] = calculate
    return result


def branch_sort(branch):
    match = re.search(r"(\d+)(?:取整|余数)?$", branch["name"])
    return int(match.group(1)) if match else 0


def source_positions(name, record):
    found = [int(value) - 1 for value in re.findall(r"平(\d)", name)]
    if "特码" in name:
        found.append(6)
    if name.startswith("最小平码"):
        found.append(numbers(record)[:6].index(min(numbers(record)[:6])))
    if name.startswith("最大平码"):
        found.append(numbers(record)[:6].index(max(numbers(record)[:6])))
    if "总分" in name:
        found.extend(range(7 if name.startswith("七码") else 6))
    return sorted(set(found)) or [0]


def mark_sources(draw, record, y, formula_name, panel_y, panel_height):
    positions = source_positions(formula_name, record)
    merge_y = (y - 34 + panel_y + panel_height) / 2
    for position in positions:
        x = XS[position + 1]
        draw.ellipse((x - 36, y - 36, x + 36, y + 36), outline="#bd851f", width=6)
        draw.ellipse((x - 35, y - 49, x - 7, y - 21), fill="#bd851f")
        center(draw, (x - 21, y - 35), "取", font(15, True), "white")
        draw.line((x, y - 37, x, merge_y), fill="#bd851f", width=5)
    left_x = min(XS[position + 1] for position in positions)
    draw.line((left_x, merge_y, 305, merge_y, 305, panel_y + panel_height), fill="#bd851f", width=5, joint="curve")


def formula_height(count):
    columns = 1 if count <= 3 else 2 if count <= 6 else 3
    return math.ceil(count / columns) * 58 + 20, columns


def value_token(label, kind, record):
    position = 6 if label == "特码" else int(label[-1]) - 1
    value = int(record["numberList"][position]["number"])
    if kind == "尾数":
        return f"{value:02d}尾{value % 10}", value % 10
    if kind == "合数":
        summed = sum(int(char) for char in str(value))
        return f"{value:02d}合{summed}", summed
    return f"{value:02d}", value


def base_expression(base_name, record):
    def normalize(label):
        return "特码" if label == "特码" else label.replace("码", "")
    if match := re.fullmatch(r"(平\d码|特码)(尾数|合数)?([＋－])(平\d码|特码)(尾数|合数)?", base_name):
        left, left_kind, operator, right, right_kind = match.groups()
        left_text, left_value = value_token(normalize(left), left_kind or "", record)
        right_text, right_value = value_token(normalize(right), right_kind or "", record)
        value = left_value + right_value if operator == "＋" else left_value - right_value
        return f"{left_text}{operator}{right_text}", value
    if match := re.fullmatch(r"(平\d码|特码)(尾数|合数)?", base_name):
        return value_token(normalize(match.group(1)), match.group(2) or "", record)
    return base_name, None


def calculation_text(name, record, formulas):
    raw = formulas[name](record)
    result = wrap(raw)
    zodiac = animal(raw)
    if match := re.fullmatch(r"(.+?)(加|减|乘)(\d+)", name):
        base, operation, amount = match.groups()
        expression, _ = base_expression(base, record)
        symbol = {"加": "＋", "减": "－", "乘": "×"}[operation]
        answer = f"{raw}" if 1 <= raw <= 49 else f"{raw}→{result:02d}"
        return f"{expression}{symbol}{amount}＝{answer}＝{zodiac}"
    if match := re.fullmatch(r"(.+?)除(\d+)(取整|余数)", name):
        base, amount, mode = match.groups()
        expression, _ = base_expression(base, record)
        operation = f"÷{amount}取整" if mode == "取整" else f"÷{amount}余"
        answer = f"{raw}" if 1 <= raw <= 49 else f"{raw}→{result:02d}"
        return f"({expression}){operation}＝{answer}＝{zodiac}"
    return f"{name}＝{result:02d}＝{zodiac}"


def formula_box(draw, y, branches, source, formulas, target_animal=None):
    height, columns = formula_height(len(branches))
    left, right = 305, 1005
    draw.rounded_rectangle((left, y, right, y + height), radius=13, fill="#fffaf0", outline="#c59b43", width=3)
    rows = math.ceil(len(branches) / columns)
    cell_w = (right - left - 20) / columns
    hit_index = None
    for index, branch in enumerate(branches):
        row, column = divmod(index, columns)
        x1 = left + 10 + column * cell_w
        y1 = y + 10 + row * 58
        predicted = animal(formulas[branch["name"]](source))
        color = COLORS[index % len(COLORS)]
        draw.rounded_rectangle((x1, y1, x1 + cell_w - 8, y1 + 48), radius=7, fill=color)
        text = calculation_text(branch["name"], source, formulas)
        center(draw, (x1 + (cell_w - 8) / 2, y1 + 24), text, font(15 if columns == 3 else 17, True), "white")
        if target_animal and predicted == target_animal:
            draw.rounded_rectangle((x1 - 2, y1 - 2, x1 + cell_w - 6, y1 + 50), radius=9, outline="#11100d", width=4)
            hit_index = index
    return height, hit_index


def draw_record(draw, record, y, faded=False):
    draw.rectangle((48, y - 55, W - 48, y + 73), fill="#fffdf8" if not faded else "#f2ede2")
    draw.text((61, y - 18), f"{int(record['period']):03d}期", font=font(29, True), fill="#b78934")
    date = record["lotteryTime"].replace("年", "/").replace("月", "/").replace("日", "")
    draw.text((61, y + 28), date, font=font(15, True), fill="#817868")
    for position, item in enumerate(record["numberList"]):
        x = XS[position + 1]
        outline = "#c82f31" if position == 6 else "#cfc6b5"
        width = 5 if position == 6 else 3
        draw.ellipse((x - 30, y - 30, x + 30, y + 30), fill="#faf6ed", outline=outline, width=width)
        center(draw, (x, y), item["number"], font(27, True), "#5f594f")
        center(draw, (x, y + 43), item["shengXiao"], font(18, True), "#817b70")


def render(item, size, rank, issue, records, formulas):
    branches = ([{"name": item["name"], "animal": item["nextAnimal"]}] if size == 1 else item["branches"])
    branches = sorted(branches, key=branch_sort)
    panel_h, _ = formula_height(len(branches))
    current_y = 380
    first_record_y = current_y + panel_h + 125
    gap = panel_h + 190
    record_ys = [first_record_y + index * gap for index in range(4)]
    H = record_ys[-1] + 135
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 215), radius=28, fill="#11100d")
    draw.rectangle((28, 160, W - 28, 215), fill="#11100d")
    draw.rectangle((28, 26, 38, 215), fill="#c59b43")
    draw.text((70, 56), "六合公式库", font=font(21, True), fill="#c59b43")
    label = {1: "肖中特", 3: "肖中特", 6: "肖中特", 9: "肖中特"}[size]
    center(draw, (W / 2, 112), f"2026-{issue:03d}期 · {size}{label}", font(45, True), "#efd58e")
    source_key = item["name"] if size == 1 else item["sourceKey"]
    center(draw, (W / 2, 174), f"{source_key} · 特码生肖回测", font(22, True), "#9a875d")
    for x, text in zip(XS, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 248), text, font(21, True), "#8b6726")

    draw.text((60, 292), f"{issue:03d}期预测", font=font(24, True), fill="#c62f31")
    prediction = [branch["animal"] for branch in branches]
    columns = min(len(prediction), 6)
    for index, zodiac in enumerate(prediction):
        row, column = divmod(index, columns)
        x = 360 + column * (580 / max(1, columns - 1))
        y = 320 + row * 62
        draw.ellipse((x - 25, y - 25, x + 25, y + 25), fill=COLORS[index % len(COLORS)], outline="white", width=3)
        center(draw, (x, y), zodiac, font(23, True), "white")
    current_panel_y = current_y + (62 if len(prediction) > 6 else 0)
    current_height, _ = formula_box(draw, current_panel_y, branches, records[-1], formulas)
    draw.line((960, current_panel_y, 960, 345), fill="#c59b43", width=5)
    draw.polygon([(960, 335), (948, 353), (972, 353)], fill="#c59b43")

    shown = list(reversed(records[-4:]))
    for index, (record, y) in enumerate(zip(shown, record_ys)):
        draw_record(draw, record, y, faded=index % 2 == 1)
    mark_sources(draw, records[-1], record_ys[0], branches[0]["name"], current_panel_y, current_height)

    chronological = records[-4:]
    chronological_ys = list(reversed(record_ys))
    for source_index, (source, target) in enumerate(zip(chronological, chronological[1:])):
        source_y = chronological_ys[source_index]
        target_y = chronological_ys[source_index + 1]
        panel_y = target_y + 82
        target_animal = target["numberList"][6]["shengXiao"]
        height, hit_index = formula_box(draw, panel_y, branches, source, formulas, target_animal)
        mark_sources(draw, source, source_y, branches[0]["name"], panel_y, height)
        draw.line((992, panel_y, 992, target_y + 31), fill="#c62f31", width=5)
        draw.polygon([(992, target_y + 28), (980, target_y + 47), (1004, target_y + 47)], fill="#c62f31")
        if hit_index is not None:
            draw.text((70, panel_y + height / 2 - 14), "命中特肖", font=font(25, True), fill="#c62f31")

    draw.text((68, H - 64), "按前期开奖推算下期特肖 · 历史轨迹自动回测 · 仅供娱乐参考", font=font(20, True), fill="#8d6a2e")
    watermark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wm = ImageDraw.Draw(watermark)
    for y in range(310, H - 100, 210):
        for x in range(130 if (y // 210) % 2 else 410, W, 480):
            wm.text((x, y), "六合公式库", font=font(23, True), fill=(118, 86, 36, 25))
    image = Image.alpha_composite(image.convert("RGBA"), watermark).convert("RGB")
    path = OUT / f"type-5-{issue:03d}-{size:02d}-{rank:03d}.png"
    image.save(path, quality=94)
    return path


def main():
    payload = json.loads((ROOT / "data" / "zodiac" / "bundles-type-5-2026.json").read_text(encoding="utf-8"))
    records = fetch_year(5, 2026)
    formulas = candidate_map()
    OUT.mkdir(parents=True, exist_ok=True)
    groups = {}
    for size_text, methods in payload["publishedGroups"].items():
        size = int(size_text)
        paths = [render(item, size, rank, payload["nextPeriod"], records, formulas) for rank, item in enumerate(methods, 1)]
        groups[size_text] = {"methods": methods, "images": [str(path.relative_to(ROOT / "public")) for path in paths]}
    manifest = OUT / f"type-5-{payload['nextPeriod']:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue": payload["nextPeriod"], "groups": groups}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {sum(len(group['methods']) for group in groups.values())} 张生肖公式图片")
    print(manifest)


if __name__ == "__main__":
    main()
