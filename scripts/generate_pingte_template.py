from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "template-pingte-preview.png"
FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")
W, H = 1080, 1350
BG, PANEL, GOLD, LINE = "#090908", "#11100d", "#d6b45f", "#5d4724"
MUTED, LIGHT = "#82765d", "#f3efe5"
ANIMALS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"]
COLOR_MAP = {"r": "#df3540", "b": "#2f82bc", "g": "#38a251"}

def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)

def center(draw, point, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((point[0] - (box[2] - box[0]) / 2, point[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)

def animal(number):
    return ANIMALS[(number - 1) % 12]

def wrap(number):
    while number > 49:
        number -= 12
    return number

records = [
    (234, "2026/08/22", [25, 30, 37, 19, 7, 17, 39], ["b", "r", "b", "r", "r", "g", "g"], 0, 32),
    (235, "2026/08/23", [27, 26, 35, 17, 44, 21, 32], ["g", "b", "r", "g", "g", "g", "g"], 0, 11),
    (236, "2026/08/24", [26, 35, 42, 9, 14, 17, 11], ["b", "r", "b", "b", "b", "g", "g"], 1, 12),
    (237, "2026/08/25", [47, 36, 14, 6, 41, 25, 12], ["b", "b", "b", "g", "b", "b", "r"], 2, 17),
    (238, "2026/08/26", [35, 44, 23, 4, 7, 21, 17], ["r", "g", "r", "b", "r", "g", "g"], 3, None),
]

image = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((32, 30, W - 32, H - 30), radius=28, fill=PANEL, outline=LINE, width=2)
draw.rectangle((32, 30, 42, 226), fill=GOLD)
draw.text((76, 66), "六合公式库", font=font(22, True), fill=GOLD)
draw.text((76, 108), "澳门六合彩 · 平特公式", font=font(17), fill="#99865e")
draw.text((76, 151), "上期平码加2 · 推算下期特肖", font=font(37, True), fill="#efd58d")
draw.text((822, 70), "PING TE", font=font(14, True), fill="#72592c")
draw.text((850, 111), "＋02", font=font(44, True), fill="#463619")

draw.rounded_rectangle((55, 246, W - 55, 356), radius=16, fill="#181207", outline="#6e5428", width=2)
draw.text((80, 269), "第239期参考", font=font(16, True), fill="#9b875d")
draw.text((80, 307), "第238期 · 平4码 04 ＋ 2 ＝ 06", font=font(23, True), fill="#e1c579")
draw.rounded_rectangle((844, 265, 990, 338), radius=36, fill="#d5b25a")
center(draw, (917, 301), "牛", font(35, True), "#171208")

row_top, row_h = 382, 170
for row_index, (issue, date, numbers, colors, selected, next_special) in enumerate(records):
    y = row_top + row_index * row_h
    fill = "#0d0d0b" if row_index % 2 == 0 else "#12110e"
    draw.rounded_rectangle((55, y, W - 55, y + 150), radius=14, fill=fill, outline="#2f281b", width=2)
    draw.text((76, y + 20), f"依据第{issue}期", font=font(18, True), fill="#d4b76e")
    draw.text((76, y + 50), f"推算第{issue + 1}期", font=font(13, True), fill="#8e7a50")
    draw.text((76, y + 78), date, font=font(11), fill=MUTED)
    draw.text((76, y + 111), f"取平{selected + 1}码", font=font(12, True), fill="#776544")
    ball_y = y + 64
    start_x, gap = 274, 87
    for index, number in enumerate(numbers):
        x = start_x + index * gap
        if index == 6:
            center(draw, (x - 44, ball_y), "+", font(21, True), "#6d5933")
        draw.ellipse((x - 29, ball_y - 29, x + 29, ball_y + 29), fill=COLOR_MAP[colors[index]])
        draw.ellipse((x - 23, ball_y - 23, x + 23, ball_y + 23), fill=LIGHT)
        center(draw, (x, ball_y), f"{number:02d}", font(17, True), "#211f1a")
        center(draw, (x, ball_y + 46), animal(number), font(13), "#9f906f")
        if index == selected:
            draw.rounded_rectangle((x - 25, ball_y - 57, x + 35, ball_y - 33), radius=8, fill=GOLD)
            center(draw, (x + 5, ball_y - 45), "+2", font(12, True), "#171208")
            draw.ellipse((x - 34, ball_y - 34, x + 34, ball_y + 34), outline=GOLD, width=3)
    selected_number = numbers[selected]
    result = wrap(selected_number + 2)
    result_x = 947
    draw.line((start_x + selected * gap + 34, ball_y, result_x - 44, ball_y), fill=GOLD, width=3)
    draw.polygon([(result_x - 44, ball_y), (result_x - 58, ball_y - 7), (result_x - 58, ball_y + 7)], fill=GOLD)
    draw.ellipse((result_x - 34, ball_y - 34, result_x + 34, ball_y + 34), fill="#1a150a", outline=GOLD, width=3)
    center(draw, (result_x, ball_y - 7), f"{result:02d}", font(15, True), GOLD)
    center(draw, (result_x, ball_y + 14), animal(result), font(17, True), "#ead18b")
    center(draw, (result_x, ball_y - 48), f"算{issue + 1}期", font(10, True), "#8b7750")
    if next_special is not None:
        center(draw, (result_x, ball_y + 55), f"当期T {next_special:02d}{animal(next_special)}", font(10, True), "#756b56")
    else:
        center(draw, (result_x, ball_y + 55), "待开奖验证", font(10, True), "#756b56")

draw.text((70, 1258), "图示规则：标记号码 ＋ 固定数 ＝ 下期特肖", font=font(16, True), fill=GOLD)
draw.text((70, 1296), "自动读取开奖记录 · 自动标记计算位置 · 自动生成公式图", font=font(13), fill="#756b57")
draw.text((796, 1281), "LIUHE FORMULA", font=font(13, True), fill="#49391d")

image.save(OUT, quality=95)
print(OUT)
