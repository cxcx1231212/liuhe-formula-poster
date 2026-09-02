import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError


ROOT = Path(__file__).resolve().parents[1]
API = "https://6htv70.com/gallerynew/h5/lottery/search"
ANIMALS = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"]
POSITION_NAMES = ["平1码", "平2码", "平3码", "平4码", "平5码", "平6码", "特码"]




def fetch_page(lottery_type, year, page, attempts=4):
    query = urlencode({"pageNum": page, "year": year, "sort": 1, "lotteryType": lottery_type})
    request = Request(f"{API}?{query}", headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            with urlopen(request, timeout=45) as response:
                payload = json.load(response)
            if not payload.get("success"):
                raise RuntimeError(payload.get("msg") or "开奖接口请求失败")
            return payload["data"]
        except (OSError, TimeoutError, URLError) as error:
            last_error = error
            if attempt < attempts:
                time.sleep(attempt * 3)
    raise RuntimeError(f"开奖记录第{page}页请求失败，已重试{attempts}次：{last_error}")



def fetch_year(lottery_type, year):
    cache_path = ROOT / "data" / "lottery-cache" / f"type-{lottery_type}-{year}.json"
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    if cache_path.exists() and time.time() - cache_path.stat().st_mtime < 1800:
        return json.loads(cache_path.read_text(encoding="utf-8"))
    try:
        first = fetch_page(lottery_type, year, 1)
        total_pages = first["pager"]["totalPageCount"]
        pages = {1: first["recordList"]}
        if total_pages > 1:
            with ThreadPoolExecutor(max_workers=6) as pool:
                futures = {page: pool.submit(fetch_page, lottery_type, year, page) for page in range(2, total_pages + 1)}
                for page, future in futures.items():
                    pages[page] = future.result()["recordList"]
        records = [record for page in range(1, total_pages + 1) for record in pages[page]]
        records = sorted(records, key=lambda record: (record["year"], record["period"]))
        temporary = cache_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
        temporary.replace(cache_path)
        return records
    except Exception as error:
        if cache_path.exists():
            print(f"警告：开奖记录更新失败，使用已有缓存：{error}", file=sys.stderr)
            return json.loads(cache_path.read_text(encoding="utf-8"))
        raise



def digit_sum(number):
    return sum(int(char) for char in str(abs(number)))




def offset_for(mode, parameter, period):
    if mode == "固定":
        return parameter
    if mode == "固定减":
        return -parameter
    if mode == "递增":
        return ((period + parameter - 1) % 12) + 1
    if mode == "递减":
        return ((-period + parameter - 1) % 12) + 1
    if mode == "期合":
        return ((digit_sum(period) + parameter - 1) % 12) + 1
    raise ValueError(mode)




def wrap(number):
    while number > 49:
        number -= 12
    while number < 1:
        number += 12
    return number




def evaluate(records, position, mode, parameter):
    checks = []
    for source, target in zip(records, records[1:]):
        source_number = int(source["numberList"][position]["number"])
        add = offset_for(mode, parameter, int(source["period"]))
        result_number = wrap(source_number + add)
        result_animal = ANIMALS[(result_number - 1) % 12]
        target_numbers = target["numberList"]
        matches = [index for index, item in enumerate(target_numbers) if item["shengXiao"] == result_animal]
        checks.append({
            "sourcePeriod": int(source["period"]),
            "targetPeriod": int(target["period"]),
            "sourcePosition": position + 1,
            "sourceNumber": source_number,
