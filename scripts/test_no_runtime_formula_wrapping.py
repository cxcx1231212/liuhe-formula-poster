"""Prevent formula pages from silently rewriting raw arithmetic results."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "lib" / "zodiac-history.ts",
    ROOT / "lib" / "fushi-history.ts",
    ROOT / "lib" / "danshuang-history.ts",
    ROOT / "lib" / "wave-history.ts",
    ROOT / "app" / "TailHeadFormulaPost.tsx",
    ROOT / "app" / "posts" / "size" / "[issue]" / "[method]" / "page.tsx",
    ROOT / "app" / "posts" / "tema" / "[size]" / "[issue]" / "[method]" / "page.tsx",
    ROOT / "app" / "posts" / "pingte" / "[issue]" / "[method]" / "page.tsx",
    ROOT / "app" / "posts" / "pingte2" / "[issue]" / "[method]" / "page.tsx",
]
for path in FILES:
    source = path.read_text(encoding="utf-8")
    assert not re.search(r"\bwrap(?:49)?\s*\(", source), f"formula wrapping returned: {path}"
    assert "expandedWrap" not in source, f"expanded wrapping returned: {path}"
print("PASS raw formula result policy", len(FILES), "runtime modules")

# Formula source and repair scripts must not contain numeric range-normalizing
# loops or modulo-49 rewrites either, or a later scheduled update can restore
# wrapped data even when the live page code is correct.
for path in [ROOT / "scripts" / name for name in (
    "search_pingte_methods.py", "board_sort_scores.py", "repair_history_integrity.py",
    "generate_advanced_formulas.py", "generate_posts.py", "generate_pingte_template.py",
    "generate_template_preview.py", "prepare_content_manifests.py", "fushi_expansion.py",
)]:
    source = path.read_text(encoding="utf-8")
    assert not re.search(r"while\s+\w+\s*[<>]\s*(?:1|49)", source), f"range wrapping returned: {path}"
    assert not re.search(r"%\s*49\s*\+", source), f"modulo-49 wrapping returned: {path}"
print("PASS raw formula result policy", 9, "generation modules")

from board_sort_scores import Scorer
def draw(period, first, special, element):
    numbers = [first, 2, 3, 4, 5, 6, special]
    return {"period": period, "numbers": [
        {"number": str(number), "animal": "马", "element": element}
        for number in numbers
    ]}
scorer = Scorer([draw(1, 49, 7, "金"), draw(2, 1, 8, "木")])
metrics = scorer.score("wuxing", "", {"branches": [{
    "name": "平1码加1", "baseName": "平1码", "operation": "add", "amount": 1,
}]})
assert metrics["recentStreak"] == 0
print("PASS out-of-range classification remains unclassified")
