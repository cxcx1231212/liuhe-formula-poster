import argparse
import base64
import gzip
import hashlib
import json
import os
import re
import tempfile
import time
from itertools import combinations

from generate_fushi_samples import calculation_text
from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series


def evaluated(records, element):
    groups = []
    for source_key, definitions in make_series():
        methods = []
        for name, calculate, *_ in definitions:
            if any(word in name for word in ("除", "合数", "尾数", "总分", "乘")) or not ("加" in name or "减" in name):
                continue
            predictions = [element(calculate(record)) for record in records[:-1]]
            methods.append({"name": name, "calculate": calculate, "predictions": predictions, "next": element(calculate(records[-1]))})
        # Preserve the existing candidate set and ordering; no accuracy filter.
        unique_methods = {}
        for method in methods:
            key = (tuple(method["predictions"]), method["next"])
            unique_methods.setdefault(key, method)
        groups.append((source_key, list(unique_methods.values())))
    return groups


def progress(message):
    memory = ""
    try:
        import resource
        memory = f" peak_rss={resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024:.1f}MiB"
    except ImportError:
        pass
    print(f"[wuxing] {message}{memory}", flush=True)


def select(records):
    mapping = {int(item["number"]): item["wuXing"] for record in records for item in record["numberList"]}
    groups = evaluated(records, lambda value: mapping[wrap(value)])
    targets = [record["numberList"][6]["wuXing"] for record in records[1:]]
    # One bit per draw: pair hits are the union of the two branch hit masks.
    for _, methods in groups:
        for method in methods:
            method["hitMask"] = sum(1 << i for i, (prediction, target) in enumerate(zip(method["predictions"], targets)) if prediction == target)
    total_draws = len(targets)
    recent_shift = max(0, total_draws - 30)

    def items(line_count):
        for source_key, methods in groups:
            candidates = ((method,) for method in methods) if line_count == 1 else combinations(methods, 2)
            for branches in candidates:
                if line_count == 2 and branches[0]["next"] == branches[1]["next"]:
                    continue
                mask = branches[0]["hitMask"]
                if line_count == 2:
                    mask |= branches[1]["hitMask"]
                streak = 0
                while streak < total_draws and mask & (1 << (total_draws - streak - 1)):
                    streak += 1
                yield {"sourceKey": source_key, "branches": list(branches), "next": sorted(branch["next"] for branch in branches), "recentStreak": streak, "recent30Hits": (mask >> recent_shift).bit_count(), "total": mask.bit_count(), "lineCount": line_count, "label": "一行中特" if line_count == 1 else "两行中特"}

    progress(f"sources={len(groups)} base_methods={sum(len(methods) for _, methods in groups)}")
    return items(1), items(2)


def manifest_method(rank, item, records, history_records, element_map):
    branches = []
    for branch in item["branches"]:
        result_number = wrap(branch["calculate"](records[-1]))
        expression = calculation_text(branch["name"], records[-1], {branch["name"]: branch["calculate"]})
        source_positions = [6 if label == "特码" else int(label[1]) - 1 for label in re.findall(r"平[1-6]码|特码", branch["name"])]
        branches.append({"name": branch["name"], "next": branch["next"], "calculation": f"{expression}＝{result_number}（{branch['next']}）", "sourcePositions": source_positions})
    history = []
    for source, target in zip(history_records[:-1], history_records[1:]):
        history_branches = []
        predictions = []
        for branch in item["branches"]:
            result_number = wrap(branch["calculate"](source))
            result_element = element_map[result_number]
            predictions.append(result_element)
            expression = calculation_text(branch["name"], source, {branch["name"]: branch["calculate"]})
            history_branches.append({"name": branch["name"], "calculation": f"{expression}＝{result_number}（{result_element}）", "result": result_element})
        actual = target["numberList"][6]
        history.append({"sourcePeriod": int(source["period"]), "targetPeriod": int(target["period"]), "branches": history_branches, "actualNumber": str(actual["number"]).zfill(2), "actualAnimal": actual.get("shengXiao", ""), "actualElement": actual.get("wuXing", ""), "hit": actual.get("wuXing", "") in predictions})
    return {"rank": rank, "label": item["label"], "lineCount": item["lineCount"], "sourceKey": item["sourceKey"], "next": item["next"], "recentStreak": item["recentStreak"], "recent30Hits": item["recent30Hits"], "image": None, "branches": branches, "history": history}


def write_manifest(path, header, method_groups, build_method):
    # Keep the old valid file until the complete replacement has been written.
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    counts = {}
    started = last_log = time.monotonic()
    count = 0
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(json.dumps(header, ensure_ascii=False, separators=(",", ":"))[:-1])
            output.write((', ' if header else '') + '"methods":[')
            for prefix, items in method_groups:
                counts[prefix] = 0
                for index, item in enumerate(items, 1):
                    method = build_method(f"{prefix}{index:03d}", item)
                    if count:
                        output.write(",")
                    output.write(json.dumps(method, ensure_ascii=False, separators=(",", ":")))
                    del method
                    count += 1
                    counts[prefix] = index
                    now = time.monotonic()
                    if now - last_log >= 15:
                        output.flush()
                        progress(f"written={count} rank={prefix}{index:03d} elapsed={now-started:.1f}s bytes={output.tell()}")
                        last_log = now
            output.write("]}")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    progress(f"complete singles={counts.get('s', 0)} pairs={counts.get('d', 0)} total={count} bytes={path.stat().st_size} elapsed={time.monotonic()-started:.1f}s")
    return counts


def compact_history(singles, records, history_records, element_map):
    """Store each branch's exact history once, not once per combination."""
    shared, bases, chunk = [], {}, []
    def flush():
        if chunk:
            shared.append(base64.b64encode(gzip.compress(json.dumps(chunk, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), mtime=0)).decode("ascii"))
            chunk.clear()
    for index, item in enumerate(singles):
        original = manifest_method("", item, records, history_records, element_map)
        rows = original["history"]
        packed = [[row["branches"][0]["calculation"], row["branches"][0]["result"]] for row in rows]
        reference = [len(shared), len(chunk)]
        chunk.append(packed)
        branch = item["branches"][0]
        bases[id(branch)] = (reference, original["branches"][0], sum(1 << i for i, row in enumerate(rows) if row["hit"]))
        if len(chunk) == 32:
            flush()
    flush()
    def build(rank, item):
        selected = [bases[id(branch)] for branch in item["branches"]]
        mask = 0
        for _, _, hits in selected:
            mask |= hits
        method = {key: item[key] for key in ("label", "lineCount", "sourceKey", "next", "recentStreak", "recent30Hits")}
        method.update(rank=rank, image=None, branches=[entry[1] for entry in selected], historyRefs=[entry[0] for entry in selected], totalRate=mask.bit_count() / max(1, len(history_records) - 1))
        # Match archive_formula_history.signature_of and stable_id exactly.
        signature = "|".join([method["sourceKey"], method["label"], str(method["lineCount"]), *sorted(branch["name"] for branch in method["branches"])])
        method["formulaId"] = "WUXING--" + hashlib.sha1(f"wuxing-|{signature}".encode("utf-8")).hexdigest()[:10]
        return method
    return shared, build


def main():
    parser = argparse.ArgumentParser(description="Stream complete wuxing manifests without rendering images")
    parser.add_argument("--type", type=int, choices=(1, 5, 8), default=5)
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()
    progress("starting")
    records = fetch_year(args.type, args.year)
    previous = dict(fetch_year(args.type, args.year - 1)[-1])
    previous["displayPeriod"] = f"{args.year - 1}-{int(previous['period']):03d}期"
    previous["period"] = 0
    history_records = [previous, *records]
    issue = int(records[-1]["period"]) + 1
    output_dir = ROOT / "public" / "generated" / "wuxing"
    output_dir.mkdir(parents=True, exist_ok=True)
    singles, pairs = select(records)
    singles = list(singles)
    element_map = {int(value["number"]): value["wuXing"] for record in records for value in record["numberList"]}
    draws = [{"period": int(record["period"]), "displayPeriod": record.get("displayPeriod"), "date": record.get("lotteryTime") or record.get("openTime") or record.get("date") or "", "numbers": [{"number": str(value["number"]).zfill(2), "animal": value.get("shengXiao", ""), "element": value.get("wuXing", "")} for value in record["numberList"]]} for record in history_records]
    shared, build = compact_history(singles, records, history_records, element_map)
    header = {"lotteryType": args.type, "year": args.year, "issue": issue, "draws": draws, "historyFormat": "branch-gzip-v1", "branchHistory": shared}
    path = output_dir / f"type-{args.type}-{issue:03d}-manifest.json"
    write_manifest(path, header, (("s", singles), ("d", pairs)), build)
    print(path, flush=True)


if __name__ == "__main__":
    main()
