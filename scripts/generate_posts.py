from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "posts"
OUT.mkdir(parents=True, exist_ok=True)
FONT = os.environ.get("LIUHE_FONT", "/System/Library/Fonts/Hiragino Sans GB.ttc")

ANIMALS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"]
COLORS = ["#df2f38", "#df2f38", "#247ec0", "#247ec0", "#39a54b", "#39a54b",
          "#df2f38", "#df2f38", "#247ec0", "#247ec0", "#39a54b", "#df2f38"]

DATA = {
    90: ([39, 41, 8, 9, 7, 14], 49, 14, "2026/08/18"),
    91: ([10, 15, 24, 9, 46, 7], 34, 49, "2026/08/20"),
    92: ([12, 9, 34, 25, 40, 7], 29, 34, "2026/08/22"),
    93: ([34, 1, 25, 19, 18, 38], 7, 29, "2026/08/25"),
}

def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=1 if bold else 0)

def animal(n):
    return ANIMALS[(n - 1) % 12]

def dsum(n):
    return sum(int(x) for x in str(abs(n)))

def wrap(n):
    while n > 49: n -= 12
    while n < 1: n += 12
    return n

def formulas(issue, balls, special, previous):
    nxt = issue + 1
    total = sum(balls) + special
    reduced = total
    while reduced > 49: reduced -= 49
    issue_pos = (nxt - 1) % 49 + 1
    t_age = (special - 1) % 12 + 1
    raw = [
        ("①", "期数合数＋11", f"{'＋'.join(str(nxt))}＋11", dsum(nxt) + 11),
        ("②", "期数位＋T岁＋7", f"{issue_pos}＋{t_age}＋7", issue_pos + t_age + 7),
        ("④", "本期T码＋5", f"{special:02d}＋5", special + 5),
        ("⑤", "最小平码＋47－T", f"{min(balls):02d}＋47－{special:02d}", min(balls) + 47 - special),
        ("⑥", "两期T码合数", f"{dsum(special)}＋{dsum(previous)}", dsum(special) + dsum(previous)),
        ("⑦", "T码＋上期T合数", f"{special:02d}＋{dsum(previous)}", special + dsum(previous)),
        ("⑧", "七码总分个位", f"{total}取个位", total % 10 or 10),
        ("⑨", "七码总分生肖", f"{total}减49循环", reduced),
        ("⑩", "本期T码＋2", f"{special:02d}＋2", special + 2),
    ]
    return [(a, b, f"{c}＝{wrap(v):02d}", wrap(v), animal(v)) for a, b, c, v in raw]

def centered(draw, xy, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((xy[0] - (box[2]-box[0])/2, xy[1] - (box[3]-box[1])/2), text, font=fnt, fill=fill)

def generate(issue, balls, special, previous, date):
    W, H = 720, 1050
    im = Image.new("RGB", (W, H), "#c82331")
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((18, 52, W-18, H-18), radius=46, fill="#f2f2f0", outline="#c6c6c3", width=2)
    for x in range(72, W-40, 48):
        d.rounded_rectangle((x, 26, x+14, 80), radius=7, fill="#5d6062")
        d.rounded_rectangle((x+4, 29, x+9, 72), radius=3, fill="#eef0f0")
    centered(d, (W/2, 117), f"2026-{issue+1:03d}期公式杀肖", font(34, True), "#c82331")
    centered(d, (W/2, 154), f"依据第{issue:03d}期 · {date}", font(16), "#555555")
    for i, n in enumerate([*balls, special]):
        x = 99 + i * 86
        d.ellipse((x-25, 180, x+25, 230), fill=COLORS[(n-1)%12])
        d.ellipse((x-18, 187, x+18, 223), fill="white", outline="#dddddd")
        centered(d, (x, 205), f"{n:02d}", font(18, True), "#222222")
        centered(d, (x, 244), animal(n), font(16), "#444444")
        if i == 5: centered(d, (x+43, 205), "+", font(24, True), "#666666")
    d.rectangle((36, 264, W-36, 302), fill="#dededc")
    d.text((58, 273), "公式", font=font(16, True), fill="#333333")
    d.text((196, 273), "计算过程", font=font(16, True), fill="#333333")
    centered(d, (625, 283), "杀肖", font(16, True), "#333333")
    rows = formulas(issue, balls, special, previous)
    for i, (idx, name, calc, value, sx) in enumerate(rows):
        y = 303 + i * 74
        d.rectangle((36, y, W-36, y+74), fill="#ffffff" if i%2==0 else "#f7f7f6")
        d.line((36, y+74, W-36, y+74), fill="#dddddd")
        d.text((56, y+25), idx, font=font(22, True), fill="#c82331")
        d.text((92, y+13), name, font=font(18, True), fill="#282828")
        d.text((196, y+42), calc, font=font(15), fill="#777777")
        d.ellipse((600, y+12, 650, y+62), fill=COLORS[(value-1)%12])
        d.ellipse((607, y+19, 643, y+55), fill="white")
        centered(d, (625, y+37), sx, font(20, True), "#222222")
    counts = {}
    for *_, sx in rows: counts[sx] = counts.get(sx, 0) + 1
    summary = " · ".join(f"{a}×{n}" if n > 1 else a for a, n in sorted(counts.items(), key=lambda x: -x[1]))
    centered(d, (W/2, 1002), f"综合：{summary}", font(23, True), "#c82331")
    centered(d, (W/2, 1030), "历史公式机械计算 · 仅供内容展示与娱乐参考", font(13), "#888888")
    im.save(OUT / f"2026-{issue+1:03d}.png", quality=95)

for issue, (balls, special, previous, date) in DATA.items():
    generate(issue, balls, special, previous, date)
