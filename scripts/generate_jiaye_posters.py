import json

from search_pingte_methods import ROOT, fetch_year, wrap

POSITIONS = ["平码1", "平码2", "平码3", "平码4", "平码5", "平码6", "特码"]
DOMESTIC = {"牛", "马", "羊", "鸡", "狗", "猪"}


def digit_sum(value):
    return sum(int(char) for char in str(abs(int(value))))


def formula_specs():
    rows = []

    def add(name, spec):
        rows.append({"rank": f"{len(rows) + 1:03d}", "name": name, "spec": spec})

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
    return rows


def evaluate(record, spec):
    numbers = [int(item["number"]) for item in record["numberList"]]
    if spec["kind"] == "single":
        value = numbers[spec["pos"]]
        if spec["feature"] == "digit":
            value = digit_sum(value)
        elif spec["feature"] == "tail":
            value %= 10
        return value
    if spec["kind"] == "global":
        return {"min": min(numbers[:6]), "max": max(numbers[:6]), "regular_sum": sum(numbers[:6]),
                "all_sum": sum(numbers), "period_digit_sum": digit_sum(record.get("calcPeriod", record["period"]))}[spec["op"]]
    a, b = numbers[spec["a"]], numbers[spec["b"]]
    return {"sum": a + b, "a_minus_b": a - b, "b_minus_a": b - a,
            "digit_sum": digit_sum(a) + digit_sum(b), "tail_sum": a % 10 + b % 10}[spec["op"]]


def source_positions(spec, record):
    numbers = [int(item["number"]) for item in record["numberList"]]
    if spec["kind"] == "single": return [spec["pos"] + 1]
    if spec["kind"] == "pair": return [spec["a"] + 1, spec["b"] + 1]
    if spec["op"] == "min": return [numbers[:6].index(min(numbers[:6])) + 1]
    if spec["op"] == "max": return [numbers[:6].index(max(numbers[:6])) + 1]
    if spec["op"] == "regular_sum": return [1, 2, 3, 4, 5, 6]
    if spec["op"] == "all_sum": return [1, 2, 3, 4, 5, 6, 7]
    return []


def expression(record, spec, raw_value, animal):
    numbers = [int(item["number"]) for item in record["numberList"]]
    shown = raw_value if raw_value > 0 else wrap(raw_value)
    if spec["kind"] == "single":
        source = numbers[spec["pos"]]
        if spec["feature"] == "raw": text = f"取{POSITIONS[spec['pos']]}：{source:02d}"
        elif spec["feature"] == "digit": text = f"取{POSITIONS[spec['pos']]}合数：{source:02d}合{digit_sum(source)}"
        else: text = f"取{POSITIONS[spec['pos']]}尾数：{source:02d}尾{source % 10}"
    elif spec["kind"] == "global":
        label = {"min": "最小平码", "max": "最大平码", "regular_sum": "六个平码总分",
                 "all_sum": "七码总分", "period_digit_sum": "期数合数"}[spec["op"]]
        text = f"{label}={shown}"
    else:
        a, b = numbers[spec["a"]], numbers[spec["b"]]
        if spec["op"] == "sum": text = f"{a:02d}+{b:02d}={shown}"
        elif spec["op"] == "a_minus_b": text = f"{a:02d}-{b:02d}={shown}"
        elif spec["op"] == "b_minus_a": text = f"{b:02d}-{a:02d}={shown}"
        elif spec["op"] == "digit_sum": text = f"{a:02d}合{digit_sum(a)}+{b:02d}合{digit_sum(b)}={shown}"
        else: text = f"{a:02d}尾{a % 10}+{b:02d}尾{b % 10}={shown}"
    return f"{text}属{animal}"


def draw_record(record):
    return {"period": int(record["period"]), "displayPeriod": record.get("displayPeriod"),
            "date": record.get("lotteryTime") or record.get("openTime") or record.get("date") or "",
            "numbers": [{"number": str(item["number"]).zfill(2), "animal": item.get("shengXiao", ""),
                         "element": "家" if item.get("shengXiao", "") in DOMESTIC else "野"}
                        for item in record["numberList"]]}


def build_method(row, records, animal_map):
    spec = row["spec"]

    def prediction(record):
        raw = evaluate(record, spec); animal = animal_map[wrap(raw)]
        return raw, animal, "家肖" if animal in DOMESTIC else "野肖"

    raw, animal, result = prediction(records[-1]); positions = source_positions(spec, records[-1]); history = []
    for source, target in zip(records[:-1], records[1:]):
        source_raw, source_animal, source_result = prediction(source); actual = target["numberList"][6]
        actual_result = "家肖" if actual["shengXiao"] in DOMESTIC else "野肖"
        history.append({"sourcePeriod": int(source["period"]), "targetPeriod": int(target["period"]),
                        "branches": [{"name": row["name"], "calculation": expression(source, spec, source_raw, source_animal),
                                      "result": source_result, "sourcePositions": source_positions(spec, source)}],
                        "actualNumber": str(actual["number"]).zfill(2), "actualAnimal": actual["shengXiao"],
                        "actualElement": actual_result, "hit": source_result == actual_result})
    return {"rank": row["rank"], "label": "家野中特", "name": row["name"], "sourceKey": row["name"],
            "formulaId": f"JIAYE-{row['rank']}", "next": [result], "image": None,
            "branches": [{"name": row["name"], "next": result,
                          "calculation": expression(records[-1], spec, raw, animal), "sourcePositions": positions}],
            "history": history}


def main():
    output_dir = ROOT / "public" / "generated" / "jiaye"; output_dir.mkdir(parents=True, exist_ok=True)
    legacy_names = {1: "095", 5: "241", 8: "241"}; specs = formula_specs()
    for lottery_type in (1, 5, 8):
        current = fetch_year(lottery_type, 2026); previous = dict(fetch_year(lottery_type, 2025)[-1])
        previous["displayPeriod"] = f"2025-{int(previous['period']):03d}期"
        previous["calcPeriod"] = int(previous["period"]); previous["period"] = 0
        records = [previous, *current]
        animal_map = {int(item["number"]): item["shengXiao"] for record in current for item in record["numberList"]}
        payload = {"lotteryType": lottery_type, "year": 2026, "issue": int(current[-1]["period"]) + 1,
                   "draws": [draw_record(record) for record in records],
                   "methods": [build_method(row, records, animal_map) for row in specs]}
        path = output_dir / f"type-{lottery_type}-{legacy_names[lottery_type]}-manifest.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(lottery_type, payload["issue"], len(payload["methods"]), path)


if __name__ == "__main__": main()
