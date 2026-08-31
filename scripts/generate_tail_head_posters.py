"""Generate complete tail/head formula manifests for all lottery types."""
import json

from generate_size_posters import draw_record, methods as base_methods
from search_pingte_methods import ROOT, fetch_year


def methods(kind):
    label = "尾数中特" if kind == "tail" else "头数中特"
    prefix = "TAIL" if kind == "tail" else "HEAD"
    return [{**item, "label": label, "formulaId": f"{prefix}-{item['rank']}"} for item in base_methods()]


def main():
    legacy_names = {1: "095", 5: "241", 8: "241"}
    for lottery_type in (1, 5, 8):
        records = fetch_year(lottery_type, 2026)
        draws = [draw_record(record) for record in records]
        for kind in ("tail", "head"):
            output_dir = ROOT / "public" / "generated" / kind
            output_dir.mkdir(parents=True, exist_ok=True)
            payload = {"lotteryType": lottery_type, "year": 2026,
                       "issue": int(records[-1]["period"]) + 1,
                       "methods": methods(kind), "draws": draws}
            path = output_dir / f"type-{lottery_type}-{legacy_names[lottery_type]}-manifest.json"
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(kind, lottery_type, payload["issue"], len(payload["methods"]))


if __name__ == "__main__":
    main()
