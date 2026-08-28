import json
import re

from PIL import Image, ImageDraw

from generate_pingte_all_pattern_images import BALL_COLORS, center, font
from search_pingte_all_patterns import build_candidates, numbers
from search_pingte_methods import ROOT, digit_sum, fetch_year, wrap

W, H = 1080, 900
OUT_DIR = ROOT / "public" / "generated" / "tema"


def tail(value):
    return value % 10


def source_positions(name, record):
    found = [int(value) - 1 for value in re.findall(r"平(\d)", name)]
    if name.startswith("特码"):
        found.append(6)
    if name.startswith("最小平码"):
        found.append(numbers(record)[:6].index(min(numbers(record)[:6])))
    if name.startswith("最大平码"):
        found.append(numbers(record)[:6].index(max(numbers(record)[:6])))
    if "总分" in name:
        found.extend(range(7 if name.startswith("七码") else 6))
    return sorted(set(found)) or [0]


def calculation(name, record, result):
    values = numbers(record)
    if match := re.fullmatch(r"(平\d|特码)码(合数|尾数|固定)(加|减)(\d+)", name):
        label, kind, sign, amount = match.groups()
        position = int(label[-1]) - 1 if label.startswith("平") else 6
        value = values[position]
        base = digit_sum(value) if kind == "合数" else tail(value) if kind == "尾数" else value
        detail = f"{value:02d}合{base}" if kind == "合数" else f"{value:02d}尾{base}" if kind == "尾数" else f"{value:02d}"
        return f"{detail}{'＋' if sign == '加' else '－'}{amount}＝{result:02d}"
    if match := re.fullmatch(r"平(\d)合数＋平(\d)合数", name):
        a, b = int(match.group(1)) - 1, int(match.group(2)) - 1
        return f"{values[a]:02d}合{digit_sum(values[a])}＋{values[b]:02d}合{digit_sum(values[b])}＝{result:02d}"
    if match := re.fullmatch(r"(最小|最大)平码加(\d+)", name):
        value = min(values[:6]) if match.group(1) == "最小" else max(values[:6])
        return f"{value:02d}＋{match.group(2)}＝{result:02d}"
    return f"{name}＝{result:02d}"


def render(method, records, rank, issue, candidate_map):
    record_map = {int(record["period"]): record for record in records}
    source_period = method["history"][-1]["sourcePeriod"]
    target_period = method["history"][-1]["targetPeriod"]
    rows = [record_map[target_period], record_map[source_period]]
    calculate = candidate_map[method["name"]]["calculate"]
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 220), radius=28, fill="#11100d")
    draw.rectangle((28, 165, W - 28, 220), fill="#11100d")
    draw.rectangle((28, 26, 38, 220), fill="#c59b43")
    draw.text((70, 58), "六合公式库", font=font(21, True), fill="#c59b43")
    center(draw, (W / 2, 120), f"2026-{issue:03d}期特码规律预测", font(44, True), "#efd58e")
    center(draw, (W / 2, 180), "前一期计算 · 下一期特码", font(24, True), "#9a875d")
    xs = [105, 270, 390, 510, 630, 750, 870, 990]
    for x, label in zip(xs, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 258), label, font(22, True), "#9a865f")
    draw.rounded_rectangle((48, 285, W - 48, 405), radius=12, fill="#fffaf0", outline="#b88c3c", width=2)
    draw.text((68, 310), f"{issue:03d}期", font=font(30, True), fill="#c59b43")
    center(draw, (560, 325), method["name"], font(28, True), "#8b6726")
    center(draw, (560, 370), "下期参考特码", font(21, True), "#287b43")
    draw.ellipse((878, 298, 970, 390), fill="#31904f", outline="#226c3b", width=4)
    center(draw, (924, 344), f"{method['predictionNumber']:02d}", font(40, True), "white")

    centers = {}
    row_start, row_h = 420, 205
    for row_index, record in enumerate(rows):
        y = row_start + row_index * row_h
        draw.rectangle((48, y, W - 48, y + row_h), fill="#fffdf8" if row_index == 0 else "#f1ecdf")
        issue_number = int(record["period"])
        draw.text((57, y + 43), f"{issue_number:03d}期", font=font(38, True), fill="#b78934")
        draw.text((57, y + 105), record["lotteryTime"].replace("年", "/").replace("月", "/").replace("日", ""), font=font(21, True), fill="#817868")
        for position, item in enumerate(record["numberList"]):
            x, cy = xs[position + 1], y + 84
            centers[(issue_number, position)] = (x, cy)
            draw.ellipse((x - 37, cy - 37, x + 37, cy + 37), fill="#f7f3ea", outline="#d1c8b8", width=6)
            center(draw, (x, cy), item["number"], font(38, True), "#817b70")
            center(draw, (x, cy + 59), item["shengXiao"], font(27, True), "#817b70")
    source_nodes = {(source_period, p) for p in source_positions(method["name"], record_map[source_period])}
    source_nodes.update((target_period, p) for p in source_positions(method["name"], record_map[target_period]))
    target_node = (target_period, 6)
    for issue_number, position in source_nodes | {target_node}:
        item = record_map[issue_number]["numberList"][position]
        x, y = centers[(issue_number, position)]
        is_target = (issue_number, position) == target_node
        draw.ellipse((x - 44, y - 44, x + 44, y + 44), fill="#f6f2e9", outline="#cf2d2d" if is_target else "#c28a22", width=6)
        draw.ellipse((x - 36, y - 36, x + 36, y + 36), outline=BALL_COLORS[item["color"]], width=7)
        center(draw, (x, y), item["number"], font(39, True), "#211f1a")
        if (issue_number, position) in source_nodes:
            draw.ellipse((x - 40, y - 48, x - 14, y - 22), fill="#c28a22")
            center(draw, (x - 27, y - 35), "取", font(15, True), "white")
        if is_target:
            draw.ellipse((x + 14, y - 48, x + 40, y - 22), fill="#cf2d2d")
            center(draw, (x + 27, y - 35), "中", font(15, True), "white")

    def arrow(start, end, label):
        sx, sy = start; ex, ey = end
        route_y = (sy - 46 + ey + 46) / 2
        draw.line([(sx, sy - 46), (sx, route_y), (ex, route_y), (ex, ey + 46)], fill="#cf2d2d", width=6, joint="curve")
        draw.polygon([(ex, ey + 38), (ex - 13, ey + 60), (ex + 13, ey + 60)], fill="#cf2d2d")
        fnt = font(29, True); box = draw.textbbox((0, 0), label, font=fnt)
        bw, bh = box[2] - box[0] + 36, box[3] - box[1] + 20
        mx = (sx + ex) / 2
        draw.rounded_rectangle((mx - bw / 2, route_y - bh / 2, mx + bw / 2, route_y + bh / 2), radius=14, fill="#bd1717")
        center(draw, (mx, route_y), label, fnt, "white")
    old_record, current_record = record_map[source_period], record_map[target_period]
    old_anchor = centers[(source_period, source_positions(method["name"], old_record)[-1])]
    current_anchor = centers[(target_period, source_positions(method["name"], current_record)[-1])]
    arrow(old_anchor, centers[target_node], calculation(method["name"], old_record, wrap(calculate(old_record))))
    arrow(current_anchor, (924, 344), calculation(method["name"], current_record, wrap(calculate(current_record))))
    draw.text((68, 848), "必须命中下期特码号码 · 历史规律仅供娱乐参考", font=font(21, True), fill="#8d6a2e")
    path = OUT_DIR / f"type-5-{issue:03d}-{rank:03d}.png"
    image.save(path, quality=95)
    return path


if __name__ == "__main__":
    output = json.loads((ROOT / "data" / "tema" / "type-5-2026.json").read_text(encoding="utf-8"))
    records = fetch_year(5, 2026)
    candidate_map = {candidate["name"]: candidate for candidate in build_candidates()}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    methods = output["publishedMethods"]
    paths = [render(method, records, rank, output["nextPeriod"], candidate_map) for rank, method in enumerate(methods, 1)]
    manifest = OUT_DIR / f"type-5-{output['nextPeriod']:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue": output["nextPeriod"], "methods": methods, "images": [str(path.relative_to(ROOT / 'public')) for path in paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {len(paths)} 张特码图片：{manifest}")
