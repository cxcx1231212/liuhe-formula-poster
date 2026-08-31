import json

from search_pingte_methods import ROOT, fetch_year
from search_zodiac_bundles import make_series


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    issue = int(records[-1]["period"]) + 1
    methods = []
    index = 0
    for source_key, definitions in make_series():
        if "加法" not in source_key and "减法" not in source_key:
            continue
        for name, _calculate, base_name, operation, amount in definitions:
            index += 1
            methods.append({"rank": f"w{index:04d}", "label": "特码波色", "sourceKey": source_key,
                            "name": name, "baseName": base_name, "operation": operation, "amount": amount})
    output = {"lotteryType": lottery_type, "year": year, "issue": issue, "methods": methods}
    destination = ROOT / "public" / "generated" / "wave" / f"type-{lottery_type}-{issue:03d}-manifest.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"波色全公式 type={lottery_type}: {len(methods)} posts -> {destination}")
    return output


if __name__ == "__main__":
    for current_type in (1, 5, 8):
        run(current_type)
