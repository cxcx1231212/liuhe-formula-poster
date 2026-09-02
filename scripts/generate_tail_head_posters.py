"""Generate complete tail/head formula manifests for all lottery types."""
import argparse
import json

from generate_size_posters import draw_record, methods as base_methods
from search_pingte_methods import ROOT, fetch_year


def methods(kind):
    label = "尾数中特" if kind == "tail" else "头数中特"
    prefix = "TAIL" if kind == "tail" else "HEAD"
    return [{**item, "label": label, "formulaId": f"{prefix}-{item['rank']}"} for item in base_methods()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", type=int, choices=(1, 5, 8))
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()
    lottery_types = (args.type,) if args.type else (1, 5, 8)
    for lottery_type in lottery_types:
        records = fetch_year(lottery_type, args.year)
        issue = int(records[-1]["period"]) + 1
        draws = [draw_record(record) for record in records]
        for kind in ("tail", "head"):
            output_dir = ROOT / "public" / "generated" / kind
            output_dir.mkdir(parents=True, exist_ok=True)
            payload = {"lotteryType": lottery_type, "year": args.year, "issue": issue,
                       "methods": methods(kind), "draws": draws}
            path = output_dir / f"type-{lottery_type}-{issue:03d}-manifest.json"
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(kind, lottery_type, issue, len(payload["methods"]), path)


if __name__ == "__main__":
    main()

