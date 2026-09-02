import json

from PIL import Image, ImageDraw

from generate_danshuang_sample import formula_panel, parity
from generate_fushi_samples import calculation_text, mark_sources, record_row
from generate_pingte_all_pattern_images import center, font
from generate_zodiac_posters import XS
from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series


W = 1080


def heshu_parity(value):
    number = wrap(value)
    return "合单" if (number // 10 + number % 10) % 2 else "合双"


def qualified(records, mode="normal", minimum_streak=3):
    rows = []
    for source_key, definitions in make_series():
        for name, calculate, *_ in definitions:
            if any(word in name for word in ("除", "合数", "尾数", "总分", "乘")) or not ("加" in name or "减" in name):
                continue
            predictions, hits = [], []
            for source, target in zip(records, records[1:]):
                prediction = parity(calculate(source)) if mode == "normal" else heshu_parity(calculate(source))
                target_number = int(target["numberList"][6]["number"])
                actual = parity(target_number) if mode == "normal" else heshu_parity(target_number)
                predictions.append(prediction)
                hits.append(prediction == actual)
            streak = 0
            for hit in reversed(hits):
                if not hit:
                    break
                streak += 1
            if streak >= minimum_streak:
                rows.append({"sourceKey": source_key, "name": name, "calculate": calculate, "predictions": predictions,
                             "next": parity(calculate(records[-1])) if mode == "normal" else heshu_parity(calculate(records[-1])), "recentStreak": streak,
                             "recent30Hits": sum(hits[-30:]), "recent30Rate": sum(hits[-30:]) / 30,
                             "totalRate": sum(hits) / len(hits)})
    unique = {}
    for item in rows:
        key = (tuple(item["predictions"]), item["next"])
        old = unique.get(key)
        if old is None or (item["recent30Hits"], item["recentStreak"], item["totalRate"]) > (old["recent30Hits"], old["recentStreak"], old["totalRate"]):
            unique[key] = item
    return sorted(unique.values(), key=lambda item: (item["recent30Hits"], item["recentStreak"], item["totalRate"]), reverse=True)


def heshu_panel(draw, y, name, calculate, source, target=None):
    number = wrap(calculate(source))
    result = heshu_parity(number)
    expression = calculation_text(name, source, {name: calculate})
    detail = f"{expression}；{number//10}＋{number%10}＝{number//10+number%10}，{result}"
    draw.rounded_rectangle((305, y, 1005, y + 84), radius=14, fill="#fffaf0", outline="#c59b43", width=3)
    draw.rounded_rectangle((325, y + 12, 865, y + 72), radius=10, fill="#c72d31")
    center(draw, (595, y + 42), detail, font(20, True), "white")
    draw.rounded_rectangle((885, y + 12, 985, y + 72), radius=10, fill="#11100d")
    center(draw, (935, y + 42), result, font(25, True), "#efd58e")
    return target is not None and result == heshu_parity(int(target["numberList"][6]["number"]))


def render(item, issue, records, output, mode="normal", title_label=None, custom_panel=None):
    row_ys = [560, 820, 1080, 1340, 1600]
    height = 1760
    image = Image.new("RGB", (W, height), "#e7dfd0")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 26, W - 28, height - 26), radius=28, fill="#f8f4ea", outline="#8d6a2e", width=2)
    draw.rounded_rectangle((28, 26, W - 28, 215), radius=28, fill="#11100d")
    draw.rectangle((28, 160, W - 28, 215), fill="#11100d")
    draw.rectangle((28, 26, 38, 215), fill="#c59b43")
    draw.text((70, 56), "六合公式库", font=font(21, True), fill="#c59b43")
    label = title_label or ("特码单双" if mode == "normal" else "合数单双")
    center(draw, (W / 2, 112), f"2026-{issue:03d}期 · {label}", font(45, True), "#efd58e")
    center(draw, (W / 2, 174), f"{item['sourceKey']} · 当前连准{item['recentStreak']}期", font(22, True), "#9a875d")
    for x, text in zip(XS, ["期号", "平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]):
        center(draw, (x, 248), text, font(21, True), "#8b6726")
    draw.text((60, 300), f"{issue:03d}期预测", font=font(25, True), fill="#c62f31")
    draw.rounded_rectangle((400, 285, 680, 365), radius=18, fill="#c72d31")
    center(draw, (540, 325), f"下期{item['next']}", font(34, True), "white")
    panel = custom_panel or (formula_panel if mode == "normal" else heshu_panel)
    panel(draw, 400, item["name"], item["calculate"], records[-1])
    shown = records[-5:]
    for index, (record, y) in enumerate(zip(reversed(shown), row_ys)):
        record_row(draw, record, y, index % 2 == 1)
    mark_sources(draw, records[-1], row_ys[0], item["name"], 400, 84)
    chronological = shown
    ys = list(reversed(row_ys))
    for index, (source, target) in enumerate(zip(chronological, chronological[1:])):
        panel_y = ys[index + 1] + 82
        hit = panel(draw, panel_y, item["name"], item["calculate"], source, target)
        mark_sources(draw, source, ys[index], item["name"], panel_y, 84)
        if hit:
            tx, ty = XS[7], ys[index + 1]
            draw.ellipse((tx - 37, ty - 37, tx + 37, ty + 37), outline="#c72d31", width=7)
            draw.text((65, panel_y + 24), f"命中{label}", font=font(24, True), fill="#c72d31")
            draw.line((1005, panel_y + 42, 1020, panel_y + 42, 1020, ty + 38), fill="#c72d31", width=5, joint="curve")
            draw.polygon([(1020, ty + 30), (1009, ty + 48), (1031, ty + 48)], fill="#c72d31")
    draw.text((68, height - 64), f"上一期计算下一期{label} · 历史轨迹仅供娱乐参考", font=font(21, True), fill="#8d6a2e")
    image.save(output, quality=95)


def main():
    records = fetch_year(5, 2026)
    issue = int(records[-1]["period"]) + 1
    output_dir = ROOT / "public" / "generated" / "danshuang"
    output_dir.mkdir(parents=True, exist_ok=True)
    methods = []
    for index, item in enumerate(qualified(records), 1):
        rank = f"{index:03d}"
        filename = f"type-5-{issue}-{rank}.png"
        render(item, issue, records, output_dir / filename)
        methods.append({key: value for key, value in item.items() if key not in ("calculate", "predictions")} | {"rank": rank, "label": "特码单双", "image": f"/generated/danshuang/{filename}"})
    for index, item in enumerate(qualified(records, "heshu", 8), 1):
        rank = f"h{index:03d}"
        filename = f"type-5-{issue}-{rank}.png"
        render(item, issue, records, output_dir / filename, "heshu")
        methods.append({key: value for key, value in item.items() if key not in ("calculate", "predictions")} | {"rank": rank, "label": "合数单双", "image": f"/generated/danshuang/{filename}"})
    manifest = {"lotteryType": 5, "year": 2026, "issue": issue, "methods": methods}
    path = output_dir / f"type-5-{issue}-manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(methods)} posts")
    print(path)


if __name__ == "__main__":
    main()
