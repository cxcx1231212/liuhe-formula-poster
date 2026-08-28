import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

from search_pingte_methods import ROOT, fetch_year, search

FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")
W, H = 1080, 1400
OUT_DIR = ROOT / "public" / "generated" / "pingte"
COLOR = {1: "#df3540", 2: "#2f82bc", 3: "#38a251"}


def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)


def center(draw, point, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((point[0] - (box[2] - box[0]) / 2, point[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)


def render(method, records, rank, lottery_type=5):
    record_map = {int(record["period"]): record for record in records}
    checks = method["history"][-min(4, method["recentStreak"]):]
    periods = [checks[0]["sourcePeriod"]] + [check["targetPeriod"] for check in checks]
    rows = [record_map[period] for period in reversed(periods)]
    row_index = {int(record["period"]): index for index, record in enumerate(rows)}
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 240), radius=28, fill="#11100d")
    draw.rectangle((28, 180, W - 28, 240), fill="#11100d")
    draw.rectangle((28, 26, 38, 240), fill="#c59b43")
    draw.text((70, 59), "六合公式库", font=font(21, True), fill="#c59b43")
    draw.text((70, 101), "澳门六合彩 · 平特公式", font=font(16), fill="#9a875d")
    center(draw, (W / 2, 165), f"2026-{method['nextPeriod']:03d}期规律预测", font(40, True), "#efd58e")
    center(draw, (W / 2, 215), f"平特一肖 / 5期公式 · 方法{rank:02d}", font(18, True), "#8a7c60")

    xs = [105, 270, 390, 510, 630, 750, 870, 990]
    labels = ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]
    for x, label in zip(xs, labels):
        center(draw, (x, 282), label, font(16, True), "#9a865f")
    draw.line((48, 312, W - 48, 312), fill="#cfc3ae", width=2)

    draw.rounded_rectangle((48, 322, W - 48, 458), radius=12, fill="#fffaf0", outline="#b88c3c", width=2)
    draw.text((70, 345), f"{method['nextPeriod']:03d}期", font=font(22, True), fill="#c59b43")
    draw.text((70, 380), "下期预测", font=font(13, True), fill="#9a8050")
    draw.text((70, 407), "仅供参考", font=font(11), fill="#6e6452")
    center(draw, (620, 382), f"{method['positionName']} · {method['mode']}推算", font(23, True), "#a57c31")
    draw.rounded_rectangle((842, 345, 985, 425), radius=40, fill="#d6b45f")
    center(draw, (913, 385), method["predictionAnimal"], font(38, True), "#171208")

    row_start, row_h = 470, 172
    ball_xs = xs[1:]
    centers = {}
    for index, record in enumerate(rows):
        y = row_start + index * row_h
        draw.rectangle((48, y, W - 48, y + row_h), fill="#fffdf8" if index % 2 == 0 else "#f1ecdf")
        draw.line((48, y + row_h, W - 48, y + row_h), fill="#d7cebe")
        issue = int(record["period"])
        draw.text((70, y + 48), f"{issue:03d}期", font=font(21, True), fill="#b78934")
        draw.text((70, y + 85), record["lotteryTime"].replace("年", "/").replace("月", "/").replace("日", ""), font=font(11), fill="#817868")
        for ball_index, item in enumerate(record["numberList"]):
            x, cy = ball_xs[ball_index], y + 76
            centers[(issue, ball_index)] = (x, cy)
            draw.ellipse((x - 29, cy - 29, x + 29, cy + 29), fill="#f7f3ea", outline="#d1c8b8", width=5)
            center(draw, (x, cy), item["number"], font(17, True), "#aaa293")
            center(draw, (x, cy + 48), item["shengXiao"], font(14), "#aaa293")
            if ball_index == 5:
                center(draw, ((x + ball_xs[6]) / 2, cy), "+", font(19, True), "#9c8c70")

    source_position = method["position"] - 1
    highlight_nodes = {(method["currentPeriod"], source_position)}
    for check in checks:
        highlight_nodes.add((check["sourcePeriod"], source_position))
        highlight_nodes.add((check["targetPeriod"], check["targetPositions"][0] - 1))
    for issue, position in highlight_nodes:
        if (issue, position) not in centers:
            continue
        record = record_map[issue]
        item = record["numberList"][position]
        x, y = centers[(issue, position)]
        draw.ellipse((x - 34, y - 34, x + 34, y + 34), fill="#f6f2e9", outline="#c52d31", width=5)
        draw.ellipse((x - 27, y - 27, x + 27, y + 27), outline=COLOR[item["color"]], width=6)
        center(draw, (x, y), item["number"], font(18, True), "#211f1a")
        center(draw, (x, y + 48), item["shengXiao"], font(14, True), "#806e4f")

    def arrow(start, end, label):
        sx, sy = start
        ex, ey = end
        draw.line((sx + 31, sy - 4, ex - 34, ey + 5), fill="#cf2d2d", width=4)
        draw.polygon([(ex - 30, ey + 5), (ex - 47, ey - 5), (ex - 43, ey + 13)], fill="#cf2d2d")
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        text = f"生肖{'加' if label >= 0 else '减'}{abs(label)}"
        box = draw.textbbox((0, 0), text, font=font(15, True))
        bw, bh = box[2] - box[0] + 28, box[3] - box[1] + 16
        draw.rounded_rectangle((mx - bw / 2, my - bh / 2, mx + bw / 2, my + bh / 2), radius=14, fill="#bd1717")
        center(draw, (mx, my), text, font(15, True), "white")

    for check in checks:
        source = centers[(check["sourcePeriod"], source_position)]
        target = centers[(check["targetPeriod"], check["targetPositions"][0] - 1)]
        arrow(source, target, check["add"])
    arrow(centers[(method["currentPeriod"], source_position)], (800, 385), method["nextAdd"])

    draw.text((68, 1350), f"连中{method['recentStreak']}期 · 近30期命中率{method['recent30Rate']:.0%}", font=font(14, True), fill="#8d6a2e")
    draw.text((740, 1350), f"PT-{method['nextPeriod']:03d}-{rank:02d}", font=font(12, True), fill="#806b45")

    watermark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wm = ImageDraw.Draw(watermark)
    for y in range(360, 1320, 155):
        offset = 30 if (y // 155) % 2 else 170
        for x in range(offset, W, 360):
            wm.text((x, y), "六合公式库", font=font(25, True), fill=(118, 86, 36, 30))
    unique = f"澳门{method['nextPeriod']:03d}期 · PT-{method['nextPeriod']:03d}-{rank:02d}"
    for y in (505, 850, 1195):
        wm.text((690, y), unique, font=font(13, True), fill=(132, 44, 38, 44))
    image = Image.alpha_composite(image.convert("RGBA"), watermark).convert("RGB")
    path = OUT_DIR / f"type-{lottery_type}-{method['nextPeriod']:03d}-{rank:02d}.png"
    image.save(path, quality=95)
    return path


if __name__ == "__main__":
    output, json_path = search(5, 2026)
    records = fetch_year(5, 2026)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths = [render(method, records, rank) for rank, method in enumerate(output["methods"], 1)]
    manifest = OUT_DIR / f"type-5-{output['nextPeriod']:03d}-manifest.json"
    manifest.write_text(json.dumps({"source": str(json_path), "images": [str(path) for path in paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {len(paths)} 张图片")
    print(manifest)
