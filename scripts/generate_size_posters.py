import json

from search_pingte_methods import ROOT, fetch_year

POSITIONS = ["平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]

def draw_record(record):
    return {"period": int(record["period"]), "date": record.get("lotteryTime", ""), "numbers": [
        {"number": str(value["number"]).zfill(2), "animal": value.get("shengXiao", ""), "element": value.get("wuXing", "")}
        for value in record["numberList"]]}

def methods():
    result = []
    def add(label, spec):
        rank = f"{len(result) + 1:03d}"
        result.append({"rank": rank, "label": "大小中特", "name": label, "sourceKey": label, "formulaId": f"SIZE-{rank}", "spec": spec})
    for pos, label in enumerate(POSITIONS):
        add(label, {"kind": "single", "pos": pos, "feature": "raw"})
        add(f"{label}合数", {"kind": "single", "pos": pos, "feature": "digit"})
        add(f"{label}尾数", {"kind": "single", "pos": pos, "feature": "tail"})
    add("最小平码", {"kind": "global", "op": "min"})
    add("最大平码", {"kind": "global", "op": "max"})
    add("六个平码总分", {"kind": "global", "op": "regular_sum"})
    add("七码总分", {"kind": "global", "op": "all_sum"})
    add("期数合数", {"kind": "global", "op": "period_digit_sum"})
    for a in range(7):
        for b in range(a + 1, 7):
            left, right = POSITIONS[a], POSITIONS[b]
            add(f"{left}＋{right}", {"kind": "pair", "a": a, "b": b, "op": "sum"})
            add(f"{left}－{right}", {"kind": "pair", "a": a, "b": b, "op": "a_minus_b"})
            add(f"{right}－{left}", {"kind": "pair", "a": a, "b": b, "op": "b_minus_a"})
            add(f"{left}合数＋{right}合数", {"kind": "pair", "a": a, "b": b, "op": "digit_sum"})
            add(f"{left}尾数＋{right}尾数", {"kind": "pair", "a": a, "b": b, "op": "tail_sum"})
    return result

def main():
    output_dir = ROOT / "public" / "generated" / "size"
    output_dir.mkdir(parents=True, exist_ok=True)
    legacy_names = {1: "095", 5: "241", 8: "241"}
    all_methods = methods()
    for lottery_type in (1, 5, 8):
        records = fetch_year(lottery_type, 2026)
        payload = {"lotteryType": lottery_type, "year": 2026, "issue": int(records[-1]["period"]) + 1,
                   "methods": all_methods, "draws": [draw_record(record) for record in records]}
        path = output_dir / f"type-{lottery_type}-{legacy_names[lottery_type]}-manifest.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(lottery_type, payload["issue"], len(all_methods), path)

if __name__ == "__main__": main()
