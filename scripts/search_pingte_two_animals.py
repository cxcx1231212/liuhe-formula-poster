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
    evaluated = [evaluate_candidate(candidate, records) for candidate in build_candidates()]
    eligible = [item for item in evaluated if recent_streak(item["hits"]) >= 1]
    pairs = []
    for left, right in combinations(eligible, 2):
        pair_hits = []
        pair_trajectory = []
        for index, (left_animal, right_animal) in enumerate(zip(left["animals"], right["animals"])):
            both = left_animal != right_animal and left["hits"][index] and right["hits"][index]
            pair_hits.append(both)
            pair_trajectory.append(tuple(sorted((left_animal, right_animal))))
        streak = recent_streak(pair_hits)
        if streak < 1:
            continue
        recent30 = pair_hits[-30:]
        pairs.append({
            "leftFamily": left["family"], "leftName": left["name"],
            "rightFamily": right["family"], "rightName": right["name"],
            "recentStreak": streak,
            "recent30Rate": sum(recent30) / len(recent30),
            "totalRate": sum(pair_hits) / len(pair_hits),
            "predictionAnimals": [],
            "predictionNumbers": [],
            "trajectory": pair_trajectory,
            "history": [
                {
                    "sourcePeriod": int(source["period"]),
                    "targetPeriod": int(target["period"]),
                    "animals": [left["animals"][index], right["animals"][index]],
                    "numbers": [left["numbers"][index], right["numbers"][index]],
                    "hit": pair_hits[index],
                }
                for index, (source, target) in enumerate(zip(records, records[1:]))
            ][-6:],
        })
    candidate_map = {item["name"]: item for item in build_candidates()}
    for pair in pairs:
        left_number, left_animal = animal_for(candidate_map[pair["leftName"]]["calculate"](records[-1]))
        right_number, right_animal = animal_for(candidate_map[pair["rightName"]]["calculate"](records[-1]))
        pair["predictionAnimals"] = [left_animal, right_animal]
        pair["predictionNumbers"] = [left_number, right_number]
    pairs.sort(key=lambda item: (item["recentStreak"], item["recent30Rate"], item["totalRate"]), reverse=True)
    unique, seen = [], set()
    for pair in pairs:
        signature = tuple(pair.pop("trajectory"))
        if signature in seen or pair["predictionAnimals"][0] == pair["predictionAnimals"][1]:
            continue
        seen.add(signature)
        unique.append(pair)
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
    output = {
        "lotteryType": lottery_type,
        "year": year,
        "recordCount": len(records),
        "currentPeriod": int(records[-1]["period"]),
        "nextPeriod": int(records[-1]["period"]) + 1,
        "rawPairCount": len(pairs),
        "uniquePairCount": len(unique),
        "publishedCount": len(published),
        "publishedMethods": published,
        "selectedMethods": selected,
    }
    destination = ROOT / "data" / "pingte" / f"two-animals-type-{lottery_type}-{year}.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"双肖当前命中：{len(pairs)}组；轨迹去重后：{len(unique)}组")
    for index, item in enumerate(unique[:20], 1):
        print(f"{index:02d}. 连中{item['recentStreak']}期｜{item['leftName']} + {item['rightName']}｜预测{'、'.join(item['predictionAnimals'])}｜近30期{item['recent30Rate']:.0%}")
    print(destination)
    return output


if __name__ == "__main__":
    run()
