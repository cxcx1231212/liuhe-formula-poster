import json
from collections import Counter
from itertools import combinations

from search_fushi_bundles import evaluate
from search_pingte_methods import ROOT, fetch_year
from search_zodiac_bundles import make_series


def mask_from_hits(hits):
    mask = 0
    for index, hit in enumerate(hits):
        if hit:
            mask |= 1 << index
    return mask


def recent_streak(mask, length):
    count = 0
    for index in range(length - 1, -1, -1):
        if not mask & (1 << index):
            break
        count += 1
    return count


def bit_count(value):
    return bin(value).count("1")


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    length = len(records) - 1
    recent_start = max(0, length - 30)
    recent_mask = ((1 << length) - 1) ^ ((1 << recent_start) - 1)
    groups = {}
    summaries = {}

    for size in (2, 3, 4):
        distribution = Counter()
        streak_distribution = Counter()
        retained = []
        retained_floor = -1
        seen = set()
        raw_combinations = 0

        for source_key, definitions in make_series():
            methods = [evaluate(name, calculate, records) for name, calculate in definitions]
            for method in methods:
                method["hitMask"] = mask_from_hits(method["hits"])
            unequal = {}
            for left, right in combinations(range(len(methods)), 2):
                mask = 0
                for index, (a, b) in enumerate(zip(methods[left]["predictions"], methods[right]["predictions"])):
                    if a != b:
                        mask |= 1 << index
                unequal[(left, right)] = mask

            for indexes in combinations(range(len(methods)), size):
                raw_combinations += 1
                selected = [methods[index] for index in indexes]
                next_numbers = tuple(sorted(method["nextNumber"] for method in selected))
                if len(set(next_numbers)) != size:
                    continue
                mask = (1 << length) - 1
                for method in selected:
                    mask &= method["hitMask"]
                for left, right in combinations(indexes, 2):
                    mask &= unequal[(left, right)]
                signature = (mask, next_numbers)
                if signature in seen:
                    continue
                seen.add(signature)
                recent_hits = bit_count(mask & recent_mask)
                streak = recent_streak(mask, length)
                distribution[recent_hits] += 1
                streak_distribution[streak] += 1

                if recent_hits > retained_floor:
                    retained_floor = recent_hits - 1
                    retained = [item for item in retained if item["recent30Hits"] >= retained_floor]
                if recent_hits >= retained_floor:
                    retained.append({
                        "sourceKey": source_key,
                        "numbers": list(next_numbers),
                        "branches": [{"name": method["name"], "number": method["nextNumber"]} for method in selected],
                        "recentStreak": streak,
                        "recent30Hits": recent_hits,
                        "recent30Rate": recent_hits / min(30, length),
                        "totalHits": bit_count(mask),
                        "historyMask": str(mask),
                    })

        retained.sort(key=lambda item: (item["recent30Hits"], item["recentStreak"], item["totalHits"]), reverse=True)
        groups[str(size)] = retained
        summaries[str(size)] = {
            "rawCombinationCount": raw_combinations,
            "uniqueTrajectoryCount": len(seen),
            "recent30Distribution": dict(sorted(distribution.items(), reverse=True)),
            "recentStreakDistribution": dict(sorted(streak_distribution.items(), reverse=True)),
            "highestRecent30Hits": max(distribution, default=0),
            "highestRecentStreak": max(streak_distribution, default=0),
            "retainedTopTwoTiers": len(retained),
        }
        print(f"{size}中{size}：原始组合{raw_combinations}；去重轨迹{len(seen)}；近30期最高{summaries[str(size)]['highestRecent30Hits']}次；最近最高连中{summaries[str(size)]['highestRecentStreak']}期")
        print("  准确率：" + "、".join(f"{hits}次={count}" for hits, count in list(sorted(distribution.items(), reverse=True))[:10]))
        print("  连中：" + "、".join(f"{streak}期={count}" for streak, count in list(sorted(streak_distribution.items(), reverse=True))[:10]))

    output = {
        "lotteryType": lottery_type,
        "year": year,
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "summaries": summaries,
        "groups": groups,
    }
    destination = ROOT / "data" / "fushi" / f"exhaustive-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(destination)
    return output


if __name__ == "__main__":
    run()
