import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import os

from search_pingte_all_patterns import numbers, tail
from search_pingte_methods import ROOT, fetch_year, digit_sum, wrap

FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")
W, H = 1080, 1400
OUT_DIR = ROOT / "public" / "generated" / "pingte-all"
BALL_COLORS = {1: "#df3540", 2: "#2f82bc", 3: "#38a251"}


def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)


def center(draw, point, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((point[0] - (box[2] - box[0]) / 2, point[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)


def parse_formula(name):
    if match := re.fullmatch(r"平(\d)合数＋平(\d)合数", name):
        positions = [int(match.group(1)) - 1, int(match.group(2)) - 1]
        return positions, lambda record: digit_sum(numbers(record)[positions[0]]) + digit_sum(numbers(record)[positions[1]])
    if match := re.fullmatch(r"平(\d)尾数＋平(\d)尾数", name):
        positions = [int(match.group(1)) - 1, int(match.group(2)) - 1]
        return positions, lambda record: tail(numbers(record)[positions[0]]) + tail(numbers(record)[positions[1]])
    if match := re.fullmatch(r"平(\d)码尾数(加|减)(\d+)", name):
        position, sign, amount = int(match.group(1)) - 1, match.group(2), int(match.group(3))
        return [position], lambda record: tail(numbers(record)[position]) + (amount if sign == "加" else -amount)
    if match := re.fullmatch(r"平(\d)码固定(加|减)(\d+)", name):
        position, sign, amount = int(match.group(1)) - 1, match.group(2), int(match.group(3))
        return [position], lambda record: numbers(record)[position] + (amount if sign == "加" else -amount)
    if match := re.fullmatch(r"七码总分加(\d+)", name):
        amount = int(match.group(1))
        return list(range(7)), lambda record: sum(numbers(record)) + amount
    raise ValueError(f"暂不支持的公式：{name}")


def calculation(name, record, raw_result):
    values = numbers(record)
    if match := re.fullmatch(r"平(\d)合数＋平(\d)合数", name):
        a, b = int(match.group(1)) - 1, int(match.group(2)) - 1
        return f"{values[a]:02d}合{digit_sum(values[a])}＋{values[b]:02d}合{digit_sum(values[b])}＝{wrap(raw_result):02d}"
    if match := re.fullmatch(r"平(\d)尾数＋平(\d)尾数", name):
        a, b = int(match.group(1)) - 1, int(match.group(2)) - 1
        return f"{values[a]:02d}尾{tail(values[a])}＋{values[b]:02d}尾{tail(values[b])}＝{wrap(raw_result):02d}"
    if match := re.fullmatch(r"平(\d)码尾数(加|减)(\d+)", name):
        p, sign, amount = int(match.group(1)) - 1, match.group(2), int(match.group(3))
        return f"{values[p]:02d}尾{tail(values[p])}{'＋' if sign == '加' else '－'}{amount}＝{wrap(raw_result):02d}"
    if match := re.fullmatch(r"平(\d)码固定(加|减)(\d+)", name):
        p, sign, amount = int(match.group(1)) - 1, match.group(2), int(match.group(3))
        return f"{values[p]:02d}{'＋' if sign == '加' else '－'}{amount}＝{wrap(raw_result):02d}"
    total = sum(values)
    amount = int(re.search(r"加(\d+)$", name).group(1))
    return f"七码总分{total}＋{amount}＝{wrap(raw_result):02d}"


def render(method, records, rank, next_period, lottery_type=5, out_dir=OUT_DIR):
    positions, calculate = parse_formula(method["name"])
    record_map = {int(record["period"]): record for record in records}
    checks = method["history"][-min(4, method["recentStreak"]):]
    periods = [checks[0]["sourcePeriod"]] + [check["targetPeriod"] for check in checks]
    rows = [record_map[period] for period in reversed(periods)]
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 240), radius=28, fill="#11100d")
    draw.rectangle((28, 180, W - 28, 240), fill="#11100d")
    draw.rectangle((28, 26, 38, 240), fill="#c59b43")
    draw.text((70, 58), "六合公式库", font=font(21, True), fill="#c59b43")
    draw.text((70, 101), "澳门六合彩 · 平特公式", font=font(16), fill="#9a875d")
    center(draw, (W / 2, 164), f"2026-{next_period:03d}期规律预测", font(46, True), "#efd58e")
    center(draw, (W / 2, 216), "平特一肖规律图", font(24, True), "#8a7c60")

    xs = [105, 270, 390, 510, 630, 750, 870, 990]
    for x, label in zip(xs, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 282), label, font(22, True), "#9a865f")
    draw.line((48, 312, W - 48, 312), fill="#cfc3ae", width=2)

    draw.rounded_rectangle((48, 322, W - 48, 458), radius=12, fill="#fffaf0", outline="#b88c3c", width=2)
    draw.text((70, 345), f"{next_period:03d}期", font=font(22, True), fill="#c59b43")
    draw.text((70, 380), "下期预测", font=font(13, True), fill="#9a8050")
    draw.text((70, 407), "仅供参考", font=font(11), fill="#6e6452")
    center(draw, (590, 362), method["name"], font(28, True), "#8b6726")
    center(draw, (590, 400), f"参考平特一肖：{method['predictionAnimal']}", font(24, True), "#287b43")
    draw.rounded_rectangle((348, 416, 500, 449), radius=16, fill="#c28a22")
    draw.rounded_rectangle((514, 416, 680, 449), radius=16, fill="#cf2d2d")
    draw.rounded_rectangle((694, 416, 850, 449), radius=16, fill="#31904f")
    center(draw, (424, 432), "取 · 公式取数", font(16, True), "white")
    center(draw, (597, 432), "中 · 下期命中", font(16, True), "white")
    center(draw, (772, 432), "绿 · 下期预测", font(16, True), "white")
    draw.rounded_rectangle((866, 345, 984, 425), radius=38, fill="#3d9b5a", outline="#226c3b", width=3)
    center(draw, (925, 385), method["predictionAnimal"], font(46, True), "white")

    row_start, row_h = 470, 172
    ball_xs, centers = xs[1:], {}
    for index, record in enumerate(rows):
        y = row_start + index * row_h
        draw.rectangle((48, y, W - 48, y + row_h), fill="#fffdf8" if index % 2 == 0 else "#f1ecdf")
        draw.line((48, y + row_h, W - 48, y + row_h), fill="#d7cebe")
        issue = int(record["period"])
        draw.text((57, y + 33), f"{issue:03d}期", font=font(38, True), fill="#b78934")
        draw.text((57, y + 93), record["lotteryTime"].replace("年", "/").replace("月", "/").replace("日", ""), font=font(22, True), fill="#817868")
        for ball_index, item in enumerate(record["numberList"]):
            x, cy = ball_xs[ball_index], y + 76
            centers[(issue, ball_index)] = (x, cy)
            draw.ellipse((x - 37, cy - 37, x + 37, cy + 37), fill="#f7f3ea", outline="#d1c8b8", width=6)
            center(draw, (x, cy), item["number"], font(38, True), "#817b70")
            center(draw, (x, cy + 55), item["shengXiao"], font(28, True), "#817b70")
            if ball_index == 5:
                center(draw, ((x + ball_xs[6]) / 2, cy), "+", font(19, True), "#9c8c70")

    source_nodes, target_nodes = set(), set()
    for check in checks:
        source_nodes.update((check["sourcePeriod"], p) for p in positions)
        target_nodes.add((check["targetPeriod"], check["targetPositions"][0] - 1))
    source_nodes.update((int(rows[0]["period"]), p) for p in positions)
    for issue, position in source_nodes | target_nodes:
        if (issue, position) not in centers:
            continue
        item = record_map[issue]["numberList"][position]
        x, y = centers[(issue, position)]
        is_source = (issue, position) in source_nodes
        is_target = (issue, position) in target_nodes
        outer = "#cf2d2d" if is_target else "#c28a22"
        draw.ellipse((x - 44, y - 44, x + 44, y + 44), fill="#f6f2e9", outline=outer, width=6)
        draw.ellipse((x - 36, y - 36, x + 36, y + 36), outline=BALL_COLORS[item["color"]], width=7)
        center(draw, (x, y), item["number"], font(39, True), "#211f1a")
        center(draw, (x, y + 55), item["shengXiao"], font(28, True), "#806e4f")
        if is_source:
            draw.ellipse((x - 39, y - 42, x - 17, y - 20), fill="#c28a22", outline="#fff7e5", width=2)
            center(draw, (x - 28, y - 31), "取", font(16, True), "white")
        if is_target:
            draw.ellipse((x + 17, y - 42, x + 39, y - 20), fill="#cf2d2d", outline="#fff7e5", width=2)
            center(draw, (x + 28, y - 31), "中", font(16, True), "white")

    def arrow(start, end, label):
        sx, sy = start
        ex, ey = end
        upward = ey < sy
        start_y = sy - 46 if upward else sy + 46
        end_y = ey + 46 if upward else ey - 46
        route_y = (start_y + end_y) / 2
        points = [(sx, start_y), (sx, route_y), (ex, route_y), (ex, end_y)]
        draw.line(points, fill="#cf2d2d", width=6, joint="curve")
        if upward:
            draw.polygon([(ex, end_y - 8), (ex - 13, end_y + 14), (ex + 13, end_y + 14)], fill="#cf2d2d")
        else:
            draw.polygon([(ex, end_y + 8), (ex - 13, end_y - 14), (ex + 13, end_y - 14)], fill="#cf2d2d")
        mx, my = (sx + ex) / 2, route_y
        fnt = font(30, True)
        box = draw.textbbox((0, 0), label, font=fnt)
        bw, bh = min(460, box[2] - box[0] + 38), box[3] - box[1] + 22
        draw.rounded_rectangle((mx - bw / 2, my - bh / 2, mx + bw / 2, my + bh / 2), radius=13, fill="#bd1717")
        center(draw, (mx, my), label, fnt, "white")

    anchor_position = positions[-1]
    for check in checks:
        source_record = record_map[check["sourcePeriod"]]
        arrow(centers[(check["sourcePeriod"], anchor_position)], centers[(check["targetPeriod"], check["targetPositions"][0] - 1)], calculation(method["name"], source_record, calculate(source_record)))
    newest = rows[0]
    arrow(centers[(int(newest["period"]), anchor_position)], (925, 385), calculation(method["name"], newest, calculate(newest)))

    draw.text((68, 1343), "历史轨迹整理 · 仅供娱乐参考", font=font(22, True), fill="#8d6a2e")
    watermark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wm = ImageDraw.Draw(watermark)
    for y in range(350, 1320, 145):
        for x in range(25 if (y // 145) % 2 else 190, W, 350):
            wm.text((x, y), "六合公式库", font=font(24, True), fill=(118, 86, 36, 32))
    unique = f"澳门{next_period:03d}期 · PT-{next_period:03d}-{rank:02d}"
    for y in (540, 860, 1180):
        wm.text((680, y), unique, font=font(13, True), fill=(132, 44, 38, 48))
    image = Image.alpha_composite(image.convert("RGBA"), watermark).convert("RGB")
    path = out_dir / f"type-{lottery_type}-{next_period:03d}-{rank:03d}.png"
    image.save(path, quality=95)
    return path


if __name__ == "__main__":
    source = ROOT / "data" / "pingte" / "all-patterns-type-5-2026.json"
    output = json.loads(source.read_text(encoding="utf-8"))
    records = fetch_year(5, 2026)
    next_period = int(records[-1]["period"]) + 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    methods = output["publishedMethods"]
    # Current and historical posters are rendered dynamically by the website.
    # Avoid generating hundreds of duplicate raster files every draw.
    paths = []
    manifest = OUT_DIR / f"type-5-{next_period:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue": next_period, "methods": methods, "images": [str(path.relative_to(ROOT / 'public')) for path in paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {len(paths)} 张图片：{manifest}")
