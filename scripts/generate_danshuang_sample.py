import re

from PIL import Image, ImageDraw

from generate_fushi_samples import calculation_text, mark_sources, record_row
from generate_pingte_all_pattern_images import center, font
from generate_zodiac_posters import XS, candidate_map
from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series


W = 1080


def parity(value):
    return "单" if wrap(value) % 2 else "双"


def choose(records):
    candidates = []
    for source_key, definitions in make_series():
        for name, calculate in definitions:
            if any(word in name for word in ("除", "合数", "尾数", "总分", "乘")) or not ("加" in name or "减" in name):
                continue
            hits = []
            for source, target in zip(records, records[1:]):
                hits.append(parity(calculate(source)) == ("单" if int(target["numberList"][6]["number"]) % 2 else "双"))
            streak = 0
            for hit in reversed(hits):
                if not hit:
                    break
                streak += 1
            if streak >= 3:
                candidates.append((sum(hits[-30:]), streak, sum(hits), source_key, name, calculate))
    return max(candidates, key=lambda item: (item[0], item[1], item[2], "－" not in item[4], -len(item[4])))


def formula_panel(draw, y, name, calculate, source, target=None):
    raw = calculate(source)
    result = parity(raw)
    explanation = calculation_text(name, source, {name: calculate}).replace("→12", "")
    if match := re.fullmatch(r"\((\d{2})合(\d+)\)(.+)", explanation):
        number, digit_sum, operation = match.groups()
        explanation = f"{number}合数＝{number[0]}＋{number[1]}＝{digit_sum}；{digit_sum}{operation}"
    explanation = f"{explanation}；{raw}为{result}"
    draw.rounded_rectangle((305, y, 1005, y + 84), radius=14, fill="#fffaf0", outline="#c59b43", width=3)
    draw.rounded_rectangle((325, y + 12, 865, y + 72), radius=10, fill="#c72d31")
    center(draw, (595, y + 42), explanation, font(22, True), "white")
    draw.rounded_rectangle((885, y + 12, 985, y + 72), radius=10, fill="#11100d")
    center(draw, (935, y + 42), f"特{result}", font(27, True), "#efd58e")
    hit = target is not None and result == ("单" if int(target["numberList"][6]["number"]) % 2 else "双")
    return hitfor name, calculate in definitionsfor name, calculate, *_ in definitions


def main():
    records = fetch_year(5, 2026)
    recent30, streak, total, source_key, name, calculate = choose(records)
    issue = int(records[-1]["period"]) + 1
    row_ys = [560, 820, 1080, 1340, 1600]
    H = 1760
    image = Image.new("RGB", (W, H), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, H - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 215), radius=28, fill="#11100d")
    draw.rectangle((28, 160, W - 28, 215), fill="#11100d")
    draw.rectangle((28, 26, 38, 215), fill="#c59b43")
    draw.text((70, 56), "六合公式库", font=font(21, True), fill="#c59b43")
    center(draw, (W / 2, 112), f"2026-{issue:03d}期 · 特码单双", font(45, True), "#efd58e")
    center(draw, (W / 2, 174), f"{source_key} · 当前连准{streak}期", font(22, True), "#9a875d")
    for x, text in zip(XS, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 248), text, font(21, True), "#8b6726")
    draw.text((60, 300), f"{issue:03d}期预测", font=font(25, True), fill="#c62f31")
    next_result = parity(calculate(records[-1]))
    draw.rounded_rectangle((400, 285, 680, 365), radius=18, fill="#c72d31")
    center(draw, (540, 325), f"下期特{next_result}", font(34, True), "white")
    formula_panel(draw, 400, name, calculate, records[-1])
    shown = records[-5:]
    for index, (record, y) in enumerate(zip(reversed(shown), row_ys)):
        record_row(draw, record, y, index % 2 == 1)
    mark_sources(draw, records[-1], row_ys[0], name, 400, 84)
    chronological = shown
    ys = list(reversed(row_ys))
    for index, (source, target) in enumerate(zip(chronological, chronological[1:])):
        panel_y = ys[index + 1] + 82
        hit = formula_panel(draw, panel_y, name, calculate, source, target)
        mark_sources(draw, source, ys[index], name, panel_y, 84)
        if hit:
            tx, ty = XS[7], ys[index + 1]
            draw.ellipse((tx - 37, ty - 37, tx + 37, ty + 37), outline="#c72d31", width=7)
            draw.text((65, panel_y + 24), "命中特单双", font=font(24, True), fill="#c72d31")
            draw.line((1005, panel_y + 42, 1020, panel_y + 42, 1020, ty + 38), fill="#c72d31", width=5, joint="curve")
            draw.polygon([(1020, ty + 30), (1009, ty + 48), (1031, ty + 48)], fill="#c72d31")
    draw.text((68, H - 64), "上一期计算下一期特码单双 · 历史轨迹仅供娱乐参考", font=font(21, True), fill="#8d6a2e")
    destination = ROOT / "previews" / "danshuang" / f"type-5-{issue:03d}-simple-sample.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, quality=95)
    print(destination)
    print({"recent30": recent30, "streak": streak, "total": total, "sourceKey": source_key, "name": name, "next": next_result})


if __name__ == "__main__":
    main()
