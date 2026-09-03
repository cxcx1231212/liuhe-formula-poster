#!/usr/bin/env python3
"""Report lottery types whose next prediction issue is not generated yet."""

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public" / "generated" / "lottery-catalog.json"
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--types", nargs="+", type=int, default=[1, 5, 8])
    parser.add_argument("--github-output")
    args = parser.parse_args()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    generated = {int(row["lotteryType"]): int(row["nextPeriod"]) for row in catalog}
    stale = []
    for lottery_type in args.types:
        opened = latest_period(lottery_type)
        expected = opened + 1
        current = generated.get(lottery_type, 0)
        print(f"彩种 {lottery_type}: CF已保存开奖 {opened}，网站预测 {current}")
        if expected > current:
            stale.append(lottery_type)
    values = " ".join(map(str, stale))
    if args.github_output:
        with open(args.github_output, "a", encoding="utf-8") as output:
            output.write(f"types={values}\n")
            output.write(f"changed={'true' if stale else 'false'}\n")
    print(f"需要更新：{values or '无'}")


if __name__ == "__main__":
    main()
