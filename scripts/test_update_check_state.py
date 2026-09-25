import json
import tempfile
from pathlib import Path

from check_lottery_updates import deployed_periods, generated_periods


with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    catalog = root / "lottery-catalog.json"
    pointers = root / "formula-manifests.ts"
    results = root / "results"
    results.mkdir()
    catalog.write_text(json.dumps([
        {"lotteryType": 1, "nextPeriod": 98},
        {"lotteryType": 5, "nextPeriod": 253},
        {"lotteryType": 8, "nextPeriod": 253},
    ]), encoding="utf-8")
    pointers.write_text("type-1-100-manifest.json type-5-256-manifest.json type-8-256-manifest.json", encoding="utf-8")
    (results / "two-animals-type-5-2026.json").write_text(json.dumps({"nextPeriod": 257}), encoding="utf-8")
    (results / "two-animals-type-8-2026.json").write_text(json.dumps({"nextPeriod": 257}), encoding="utf-8")
    assert generated_periods(catalog, pointers, results) == {1: 100, 5: 257, 8: 257}
    deployed = root / "deployed-issues.json"
    deployed.write_text('{"1":100,"5":256,"8":256}', encoding="utf-8")
    assert deployed_periods(deployed) == {1: 100, 5: 256, 8: 256}
    assert generated_periods(catalog, pointers, results)[5] > deployed_periods(deployed)[5]

print("PASS update check distinguishes generated data from published issues")
