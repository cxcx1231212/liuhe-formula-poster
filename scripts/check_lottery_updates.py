#!/usr/bin/env python3
"""Report lottery types whose next prediction issue is not generated yet."""

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public" / "generated" / "lottery-catalog.json"
MANIFEST_POINTERS = ROOT / "lib" / "formula-manifests.ts"
SAVED_RESULTS = ROOT / "data" / "pingte"
DEPLOYED_ISSUES = ROOT / "data" / "deployed-issues.json"
CF_API = "https://liuhe-formula-update-checker.xcx8088.workers.dev/latest"


def latest_period(lottery_type: int) -> int:
    query = urlencode({"lotteryType": lottery_type})
    request = Request(
        f"{CF_API}?{query}",
        headers={"Accept": "application/json", "User-Agent": "LiuheFormulaUpdater/2.0"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if not payload.get("ok") or payload.get("period") is None:
        raise RuntimeError(f"彩种 {lottery_type} 的 Cloudflare 开奖数据异常")
    return int(payload["period"])


def generated_periods(catalog_path=CATALOG, pointers_path=MANIFEST_POINTERS, results_path=SAVED_RESULTS):
    """Use every committed progress marker so a deploy failure cannot trigger a recount."""
    generated = {}
    if catalog_path.exists():
        for row in json.loads(catalog_path.read_text(encoding="utf-8")):
            lottery_type = int(row["lotteryType"])
            generated[lottery_type] = max(generated.get(lottery_type, 0), int(row["nextPeriod"]))
    if pointers_path.exists():
        source = pointers_path.read_text(encoding="utf-8")
        for lottery_type, issue in re.findall(r"type-([158])-(\d+)-manifest\.json", source):
            lottery_type, issue = int(lottery_type), int(issue)
            generated[lottery_type] = max(generated.get(lottery_type, 0), issue)
    # Search output is committed immediately after each lottery finishes. It is
    # the most reliable marker when a later build/deploy step fails.
    if results_path.exists():
        for path in results_path.glob("two-animals-type-*-*.json"):
            match = re.fullmatch(r"two-animals-type-([158])-(\d{4})\.json", path.name)
            if not match:
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            lottery_type = int(match.group(1))
            issue = int(payload.get("nextPeriod", 0))
            generated[lottery_type] = max(generated.get(lottery_type, 0), issue)
    return generated


def deployed_periods(path=DEPLOYED_ISSUES):
    if not path.exists():
        return {}
    return {int(key): int(value) for key, value in json.loads(path.read_text(encoding="utf-8")).items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--types", nargs="+", type=int, default=[1, 5, 8])
    parser.add_argument("--github-output")
    args = parser.parse_args()
    generated = generated_periods()
    deployed = deployed_periods()
    stale = []
    unpublished = []
    for lottery_type in args.types:
        opened = latest_period(lottery_type)
        expected = opened + 1
        current = generated.get(lottery_type, 0)
        print(f"彩种 {lottery_type}: CF已保存开奖 {opened}，网站预测 {current}")
        if expected > current:
            stale.append(lottery_type)
        if current > deployed.get(lottery_type, 0):
            unpublished.append(lottery_type)
    values = " ".join(map(str, stale))
    if args.github_output:
        with open(args.github_output, "a", encoding="utf-8") as output:
            output.write(f"types={values}\n")
            output.write(f"changed={'true' if stale else 'false'}\n")
            output.write(f"deploy_needed={'true' if unpublished else 'false'}\n")
    print(f"需要更新：{values or '无'}")
    print(f"已计算但尚未发布：{' '.join(map(str, unpublished)) or '无'}")


if __name__ == "__main__":
    main()
