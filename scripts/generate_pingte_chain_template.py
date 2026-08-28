from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "template-pingte-preview.png"
FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")
W, H = 1080, 1400
BG, PANEL, GOLD, GOLD_DARK = "#e7dfd0", "#f8f4ea", "#c59b43", "#8d6a2e"
TEXT, MUTED, DIM = "#30281d", "#817868", "#d1c8b8"
RED, BLUE, GREEN = "#df3540", "#2f82bc", "#38a251"

def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)

def center(draw, point, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((point[0] - (box[2] - box[0]) / 2, point[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)

records = [
    {"issue": 93, "date": "2026/08/25", "nums": [1, 18, 19, 25, 34, 38, 7], "sx": ["马", "牛", "鼠", "马", "鸡", "蛇", "鼠"], "colors": [RED, RED, RED, BLUE, RED, GREEN, RED]},
    {"issue": 92, "date": "2026/08/22", "nums": [7, 9, 12, 25, 34, 40, 29], "sx": ["鼠", "狗", "羊", "马", "鸡", "兔", "虎"], "colors": [RED, BLUE, RED, BLUE, RED, RED, RED]},
    {"issue": 91, "date": "2026/08/20", "nums": [7, 9, 10, 15, 24, 46, 34], "sx": ["鼠", "狗", "鸡", "龙", "羊", "鸡", "鸡"], "colors": [RED, BLUE, BLUE, BLUE, RED, RED, RED]},
    {"issue": 90, "date": "2026/08/18", "nums": [7, 8, 9, 14, 39, 41, 49], "sx": ["鼠", "猪", "狗", "蛇", "龙", "虎", "马"], "colors": [RED, RED, BLUE, BLUE, GREEN, BLUE, GREEN]},
    {"issue": 89, "date": "2026/08/15", "nums": [4, 16, 25, 27, 28, 33, 14], "sx": ["兔", "兔", "马", "龙", "兔", "狗", "蛇"], "colors": [BLUE, GREEN, BLUE, GREEN, GREEN, GREEN, BLUE]},
]

image = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill=PANEL, outline=GOLD_DARK, width=2)
draw.rounded_rectangle((28, 26, W - 28, 240), radius=28, fill="#11100d")
draw.rectangle((28, 180, W - 28, 240), fill="#11100d")
draw.rectangle((28, 26, 38, 240), fill=GOLD)
draw.text((70, 59), "六合公式库", font=font(21, True), fill=GOLD)
draw.text((70, 101), "香港六合彩 · 平特公式", font=font(16), fill="#9a875d")
center(draw, (W / 2, 165), "2026-094期规律预测", font(41, True), "#efd58e")
center(draw, (W / 2, 215), "平特一肖 / 5期公式", font(19, True), MUTED)

columns_y = 282
labels = ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]
xs = [105, 270, 390, 510, 630, 750, 870, 990]
for x, label in zip(xs, labels):
    center(draw, (x, columns_y), label, font(16, True), "#b8a77e")
draw.line((48, 312, W - 48, 312), fill="#cfc3ae", width=2)

prediction_top, prediction_bottom = 322, 458
draw.rounded_rectangle((48, prediction_top, W - 48, prediction_bottom), radius=12, fill="#fffaf0", outline="#b88c3c", width=2)
draw.text((70, 345), "094期", font=font(22, True), fill=GOLD)
draw.text((70, 380), "下期预测", font=font(13, True), fill="#9a8050")
draw.text((70, 407), "仅供参考", font=font(11), fill="#6e6452")
center(draw, (650, 382), "可参考平特一肖", font(26, True), "#d8b663")
draw.rounded_rectangle((842, 345, 985, 425), radius=40, fill=GOLD)
center(draw, (913, 385), "狗", font(38, True), "#171208")

row_start, row_h = 470, 172
ball_xs = xs[1:]
centers = {}
for row_index, record in enumerate(records):
    y = row_start + row_index * row_h
    draw.rectangle((48, y, W - 48, y + row_h), fill="#fffdf8" if row_index % 2 == 0 else "#f1ecdf")
    draw.line((48, y + row_h, W - 48, y + row_h), fill="#d7cebe")
    draw.text((70, y + 45), f"{record['issue']:03d}期", font=font(21, True), fill=GOLD)
    draw.text((70, y + 82), record["date"], font=font(12), fill=MUTED)
    for index, (number, sx, color) in enumerate(zip(record["nums"], record["sx"], record["colors"])):
        x, cy = ball_xs[index], y + 76
        centers[(record["issue"], index)] = (x, cy)
        draw.ellipse((x - 29, cy - 29, x + 29, cy + 29), fill="#f7f3ea", outline=DIM, width=5)
        center(draw, (x, cy), f"{number:02d}", font(17, True), "#aaa293")
        center(draw, (x, cy + 48), sx, font(14), "#aaa293")
        if index == 5:
            center(draw, ((x + ball_xs[6]) / 2, cy), "+", font(19, True), "#5c4d31")

highlights = [
    ((89, 0), (90, 1), "生肖加4"),
    ((90, 0), (91, 4), "生肖加5"),
    ((91, 0), (92, 3), "生肖加6"),
    ((92, 0), (93, 5), "生肖加7"),
]

record_by_issue = {record["issue"]: record for record in records}
highlight_nodes = {(89, 0), (90, 1), (90, 0), (91, 4), (91, 0), (92, 3), (92, 0), (93, 5), (93, 0)}
for issue, index in highlight_nodes:
    x, y = centers[(issue, index)]
    record = record_by_issue[issue]
    color = record["colors"][index]
    draw.ellipse((x - 34, y - 34, x + 34, y + 34), fill="#f6f2e9", outline="#c52d31", width=5)
    draw.ellipse((x - 27, y - 27, x + 27, y + 27), outline=color, width=6)
    center(draw, (x, y), f"{record['nums'][index]:02d}", font(18, True), "#211f1a")
    center(draw, (x, y + 48), record["sx"][index], font(14, True), "#b4a27c")

def arrow(start, end, label):
    sx, sy = start
    ex, ey = end
    draw.line((sx + 31, sy - 4, ex - 34, ey + 5), fill="#cf2d2d", width=4)
    draw.polygon([(ex - 30, ey + 5), (ex - 47, ey - 5), (ex - 43, ey + 13)], fill="#cf2d2d")
    mx, my = (sx + ex) / 2, (sy + ey) / 2
    box = draw.textbbox((0, 0), label, font=font(16, True))
    bw, bh = box[2] - box[0] + 30, box[3] - box[1] + 18
    draw.rounded_rectangle((mx - bw / 2, my - bh / 2, mx + bw / 2, my + bh / 2), radius=14, fill="#bd1717")
    center(draw, (mx, my), label, font(16, True), "white")

for source, target, label in highlights:
    arrow(centers[source], centers[target], label)

start = centers[(93, 0)]
end = (800, 385)
arrow(start, end, "生肖加8")

draw.text((68, 1350), "上一期平码生肖＋序号 → 对应下一期平码生肖", font=font(14, True), fill=GOLD_DARK)
draw.text((736, 1350), "LIUHE FORMULA", font=font(12, True), fill="#806b45")

# Tiled brand, large diagonal brand, and a unique per-image identity.
watermark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
wm = ImageDraw.Draw(watermark)
for y in range(360, 1320, 155):
    offset = 30 if (y // 155) % 2 else 170
    for x in range(offset, W, 360):
        wm.text((x, y), "六合公式库", font=font(25, True), fill=(118, 86, 36, 30))
large = Image.new("RGBA", (W, H), (0, 0, 0, 0))
large_draw = ImageDraw.Draw(large)
large_draw.text((255, 620), "六合公式库", font=font(72, True), fill=(115, 80, 28, 38))
large = large.rotate(-25, resample=Image.Resampling.BICUBIC, center=(W / 2, H / 2))
watermark = Image.alpha_composite(watermark, large)
wm = ImageDraw.Draw(watermark)
for y in (505, 850, 1195):
    wm.text((690, y), "香港094期 · PT-2026094-001", font=font(13, True), fill=(132, 44, 38, 44))
image = Image.alpha_composite(image.convert("RGBA"), watermark).convert("RGB")
image.save(OUT, quality=95)
print(OUT)
