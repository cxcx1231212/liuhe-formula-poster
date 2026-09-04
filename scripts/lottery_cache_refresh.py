"""Refresh committed draw caches against CF's actual period, never Git file mtime."""
import json
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CF_API = 'https://liuhe-formula-update-checker.xcx8088.workers.dev/latest'


def refresh(lottery_type, year):
    # Import inside the function to keep validation helpers independently testable.
    from search_pingte_methods import fetch_page
    request = Request(f'{CF_API}?lotteryType={lottery_type}', headers={'Accept': 'application/json', 'User-Agent': 'LiuheFormulaUpdater/3.0'})
    with urlopen(request, timeout=30) as response:
        latest = json.load(response)
    if not latest.get('ok') or latest.get('period') is None:
        raise RuntimeError('CF latest draw unavailable')
    expected = int(latest['period'])
    path = ROOT / 'data/lottery-cache' / f'type-{lottery_type}-{year}.json'
    existing = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    records = {int(row['period']): row for row in existing if int(row['year']) == year}
    # Fill missing periods from paginated history, rather than discard saved draws.
    if not records or max(records) < expected or any(p not in records for p in range(1, expected + 1)):
        first = fetch_page(lottery_type, year, 1)
        pages = [first]
        pages += [fetch_page(lottery_type, year, page) for page in range(2, int(first['pager']['totalPageCount']) + 1)]
        for page in pages:
            for row in page['recordList']:
                if int(row['year']) == year:
                    records[int(row['period'])] = row
    # CF latest and history endpoints may update at slightly different times.
    current = latest.get('data') or {}
    balls = current.get('numberList')
    if isinstance(balls, list) and len(balls) == 7 and all(isinstance(ball, dict) and ball.get('number') is not None and ball.get('wuXing') for ball in balls):
        date = str(current.get('lotteryTime', ''))
        record_year = int(current.get('year') or (date[:4] if date[:4].isdigit() else 0))
        if record_year == year:
            records[expected] = {**current, 'year': year, 'period': expected, 'numberList': balls}
    if not records or max(records) < expected:
        raise RuntimeError(f'彩种 {lottery_type}: CF已开奖{expected}，历史仅到{max(records, default=0)}；拒绝把旧数据当成更新成功。CF字段={sorted(current)}')
    missing = [p for p in range(1, expected + 1) if p not in records]
    if missing:
        raise RuntimeError(f'彩种 {lottery_type}: 缺少历史期数 {missing}')
    ordered = [records[p] for p in sorted(records)]
    for row in ordered:
        balls = row.get('numberList') or []
        if len(balls) != 7 or any(not 1 <= int(ball['number']) <= 49 for ball in balls):
            raise RuntimeError(f'Incomplete draw {row.get("period")}')
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(ordered, ensure_ascii=False), encoding='utf-8')
    temporary.replace(path)
    print(f'CF核对并保存：type={lottery_type} year={year} last={max(records)} records={len(ordered)}', flush=True)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', type=int, required=True, choices=(1, 5, 8))
    parser.add_argument('--year', type=int, default=datetime.now().year)
    args = parser.parse_args()
    refresh(args.type, args.year)
