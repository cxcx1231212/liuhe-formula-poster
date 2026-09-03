import json
from itertools import combinations

from search_pingte_all_patterns import animal_for, build_candidates, is_renderable_name
from search_pingte_methods import ROOT, fetch_year


def evaluate_candidate(candidate, records):
    animals = []
    numbers = []
    hits = []
    for source, target in zip(records, records[1:]):
        number, animal = animal_for(candidate["calculate"](source))
        target_animals = {item["shengXiao"] for item in target["numberList"]}
        animals.append(animal)
        numbers.append(number)
        hits.append(animal in target_animals)
    return {"family": candidate["family"], "name": candidate["name"], "animals": animals, "numbers": numbers, "hits": hits}


def recent_streak(values):
    streak = 0
    for value in reversed(values):
        if not value:
            break
        streak += 1
    return streak


def run(lottery_type=5, year=2026):
    records = fetch_year(lottery_type, year)
    candidates = build_candidates()
    evaluated = [evaluate_candidate(candidate, records) for candidate in candidates]
    eligible = [item for item in evaluated if recent_streak(item["hits"]) >= 1]
    candidate_map = {item["name"]: item for item in candidates}
    evaluated_map = {item["name"]: item for item in evaluated}
    animal_codes = {
        animal: index
        for index, animal in enumerate(sorted({
            item["shengXiao"]
            for record in records
            for item in record["numberList"]
        }))
    }

    # A full history for every possible pair consumes several GB of memory.
    # Keep only the best compact entry for each trajectory; histories are built
    # later for the small set that is actually published.
    best_by_trajectory = {}
    raw_pair_count = 0
    for left, right in combinations(eligible, 2):
        pair_hits = []
        trajectory_codes = bytearray()
        for index, (left_animal, right_animal) in enumerate(zip(left["animals"], right["animals"])):
            duplicate = left_animal == right_animal
            both = not duplicate and left["hits"][index] and right["hits"][index]
            pair_hits.append(both)
            left_code = animal_codes[left_animal]
            right_code = animal_codes[right_animal]
            trajectory_codes.append(min(left_code, right_code) * 12 + max(left_code, right_code))
        streak = recent_streak(pair_hits)
        if streak < 1:
            continue
        raw_pair_count += 1
        recent30 = pair_hits[-30:]
        pair = {
            "leftFamily": left["family"], "leftName": left["name"],
            "rightFamily": right["family"], "rightName": right["name"],
            "recentStreak": streak,
            "recent30Rate": sum(recent30) / len(recent30),
            "totalRate": sum(pair_hits) / len(pair_hits),
            "predictionAnimals": [],
            "predictionNumbers": [],
        }
        signature = bytes(trajectory_codes)
        score = (pair["recentStreak"], pair["recent30Rate"], pair["totalRate"])
        previous = best_by_trajectory.get(signature)
        if previous is None or score > (
            previous["recentStreak"], previous["recent30Rate"], previous["totalRate"]
        ):
            best_by_trajectory[signature] = pair

    unique = sorted(
        best_by_trajectory.values(),
        key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]),
        reverse=True,
    )
    for pair in unique:
        left_number, left_animal = animal_for(candidate_map[pair["leftName"]]["calculate"](records[-1]))
        right_number, right_animal = animal_for(candidate_map[pair["rightName"]]["calculate"](records[-1]))
        pair["predictionAnimals"] = [left_animal, right_animal]
        pair["predictionNumbers"] = [left_number, right_number]
        pair["duplicatePrediction"] = left_animal == right_animal

    selected, predicted_pairs = [], set()
    for pair in unique:
        prediction_signature = tuple(sorted(pair["predictionAnimals"]))
        if prediction_signature in predicted_pairs:
            continue
        predicted_pairs.add(prediction_signature)
        selected.append(pair)
        if len(selected) == 10:
            break
    published, published_pairs = [], set()
    for pair in unique:
        prediction_signature = tuple(sorted(pair["predictionAnimals"]))
        if prediction_signature in published_pairs:
            continue
        if not is_renderable_name(pair["leftName"]) or not is_renderable_name(pair["rightName"]):
            continue
        published_pairs.add(prediction_signature)
        published.append(pair)

    # Only published/selected pairs need full per-draw history in the JSON.
    history_attached = set()
    for pair in [*published, *selected]:
        identity = id(pair)
        if identity in history_attached:
            continue
        history_attached.add(identity)
        left = evaluated_map[pair["leftName"]]
        right = evaluated_map[pair["rightName"]]
        pair["history"] = [
            {
                "sourcePeriod": int(source["period"]),
                "targetPeriod": int(target["period"]),
                "animals": [left["animals"][index], right["animals"][index]],
                "numbers": [left["numbers"][index], right["numbers"][index]],
                "hit": (
                    left["animals"][index] != right["animals"][index]
                    and left["hits"][index]
                    and right["hits"][index]
                ),
                "duplicateAnimal": left["animals"][index] == right["animals"][index],
            }
            for index, (source, target) in enumerate(zip(records, records[1:]))
        ]

    output = {
        "lotteryType": lottery_type,
        "year": year,
        "recordCount": len(records),
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "rawPairCount": raw_pair_count,
        "uniquePairCount": len(unique),
        "publishedCount": len(published),
        "publishedMethods": published,
        "selectedMethods": selected,
    }
    destination = ROOT / "data" / "pingte" / f"two-animals-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"双肖当前命中：{raw_pair_count}组；轨迹去重后：{len(unique)}组")
    for index, item in enumerate(unique[:20], 1):
        print(f"{index:02d}. 连中{item['recentStreak']}期｜{item['leftName']} + {item['rightName']}｜预测{'、'.join(item['predictionAnimals'])}｜近30期{item['recent30Rate']:.0%}")
    print(destination)
    return output

if __name__ == "__main__":
    run()
