from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "template-preview.png"
FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")

W, H = 1080, 1440
BG, PANEL, GOLD, GOLD_2 = "#090908", "#11100d", "#d6b45f", "#8c6b2e"
PAPER, PAPER_2, INK, MUTED = "#f4f0e6", "#ebe5d8", "#211f1a", "#777063"
COLORS = {1: "#df3540", 2: "#2f82bc", 3: "#38a251"}
ANIMALS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"]

def f(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)

def center(draw, point, text, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((point[0] - (box[2] - box[0]) / 2, point[1] - (box[3] - box[1]) / 2), text, font=font, fill=fill)

def animal(number):
    return ANIMALS[(number - 1) % 12]

def digit_sum(number):
    return sum(int(x) for x in str(abs(number)))

def wrap(number):
    while number > 49:
        number -= 12
    while number < 1:
        number += 12
    return number

balls, special, previous = [35, 44, 23, 4, 7, 21], 17, 12
colors = [1, 3, 1, 2, 1, 3, 3]
total = sum(balls) + special
rows_raw = [
    ("01", "期数合数＋11", "2＋3＋9＋11", digit_sum(239) + 11),
    ("02", "期数位＋T岁＋7", "43＋5＋7", 43 + 5 + 7),
    ("04", "本期T码＋5", "17＋5", 17 + 5),
    ("05", "最小平码＋47－T", "04＋47－17", 4 + 47 - 17),
    ("06", "两期T码合数", f"{digit_sum(special)}＋{digit_sum(previous)}", digit_sum(special) + digit_sum(previous)),
    ("07", "T码＋上期T合数", f"17＋{digit_sum(previous)}", 17 + digit_sum(previous)),
    ("08", "七码总分个位", f"{total}取个位", total % 10 or 10),
    ("09", "七码总分生肖", f"{total}循环换算", total),
    ("10", "本期T码＋2", "17＋2", 19),
]

image = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(image)

draw.rounded_rectangle((34, 34, W - 34, H - 34), radius=28, fill=PANEL, outline=GOLD_2, width=2)
draw.rectangle((34, 34, W - 34, 235), fill="#151106")
draw.rectangle((34, 34, 44, 235), fill=GOLD)
draw.text((78, 69), "六合公式库", font=f(22, True), fill=GOLD)
draw.text((78, 111), "澳门六合彩 · 绝杀公式", font=f(18), fill="#9a8659")
draw.text((78, 153), "2026-239期十大杀肖公式", font=f(42, True), fill="#f0d58d")
draw.text((850, 72), "FORMULA", font=f(15, True), fill="#6f5a2e")
draw.text((886, 110), "239", font=f(54, True), fill="#403117")

draw.rounded_rectangle((58, 256, W - 58, 410), radius=18, fill="#0c0c0a", outline="#3b301d", width=2)
draw.text((78, 274), "依据第238期  ·  2026/08/26", font=f(16), fill="#8d8065")
numbers = balls + [special]
for index, number in enumerate(numbers):
    x = 137 + index * 132
    y = 342
    draw.ellipse((x - 37, y - 37, x + 37, y + 37), fill=COLORS[colors[index]])
    draw.ellipse((x - 29, y - 29, x + 29, y + 29), fill="#f5f1e8")
    center(draw, (x, y), f"{number:02d}", f(24, True), INK)
    center(draw, (x, 393), animal(number), f(17, True), "#ad9870")
    if index == 5:
        center(draw, (x + 66, y), "+", f(28, True), GOLD_2)
    if index == 6:
        draw.rounded_rectangle((x + 20, y - 50, x + 68, y - 23), radius=7, fill=GOLD)
        center(draw, (x + 44, y - 37), "特码", f(12, True), "#171208")

table_left, table_right, table_top = 58, W - 58, 436
draw.rounded_rectangle((table_left, table_top, table_right, 1298), radius=18, fill=PAPER)
draw.rectangle((table_left, table_top, table_right, table_top + 58), fill="#d9cfb9")
draw.text((86, table_top + 16), "序号", font=f(17, True), fill=INK)
draw.text((184, table_top + 16), "公式与计算过程", font=f(17, True), fill=INK)
center(draw, (927, table_top + 29), "结果", f(17, True), INK)

row_h = 89
for index, (code, name, calc, result) in enumerate(rows_raw):
    y = table_top + 58 + index * row_h
    result = wrap(result)
    draw.rectangle((table_left, y, table_right, y + row_h), fill=PAPER if index % 2 == 0 else PAPER_2)
    draw.line((table_left, y + row_h, table_right, y + row_h), fill="#d4ccbd", width=1)
    center(draw, (111, y + 44), code, f(16, True), GOLD_2)
    draw.text((184, y + 13), name, font=f(19, True), fill=INK)
    draw.text((184, y + 48), f"{calc} ＝ {result:02d}", font=f(16), fill=MUTED)
    color = colors[result % len(colors)]
    draw.ellipse((891, y + 18, 951, y + 78), fill=COLORS[color])
    draw.ellipse((898, y + 25, 944, y + 71), fill="#fffdf7")
    center(draw, (921, y + 48), animal(result), f(21, True), INK)

draw.text((72, 1331), "自动计算 · 自动生成 · 按期归档", font=f(17, True), fill=GOLD)
draw.text((72, 1368), "公式机械计算，仅供内容展示与娱乐参考", font=f(14), fill="#6f6654")
draw.text((786, 1352), "LIUHE FORMULA", font=f(14, True), fill="#49391d")

watermark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
wm_draw = ImageDraw.Draw(watermark)
for y in range(500, 1250, 230):
    wm_draw.text((300, y), "六合公式库", font=f(52, True), fill=(128, 100, 45, 18))
watermark = watermark.rotate(-24, resample=Image.Resampling.BICUBIC, center=(W / 2, H / 2))
image = Image.alpha_composite(image.convert("RGBA"), watermark).convert("RGB")
image.save(OUT, quality=95)
print(OUT)
