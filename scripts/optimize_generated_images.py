#!/usr/bin/env python3
"""Convert generated PNG posters to compact high-quality WebP files."""

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated"


def convert(path: Path, quality: int) -> tuple[int, int]:
    destination = path.with_suffix(".webp")
    before = path.stat().st_size
    with Image.open(path) as image:
        image.save(destination, "WEBP", quality=quality, method=6)
    after = destination.stat().st_size
    path.unlink()
    return before, after


def update_manifests() -> int:
    changed = 0
    for path in GENERATED.rglob("*.json"):
        source = path.read_text(encoding="utf-8")
        updated = source.replace(".png", ".webp")
        if updated != source:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quality", type=int, default=90)
    args = parser.parse_args()
    paths = sorted(GENERATED.rglob("*.png"))
    before = after = 0
    for index, path in enumerate(paths, 1):
        old_size, new_size = convert(path, args.quality)
        before += old_size
        after += new_size
        if index % 100 == 0:
            print(f"已转换 {index}/{len(paths)}")
    manifests = update_manifests()
    saved = before - after
    print(f"图片：{len(paths)} 张；清单：{manifests} 个")
    print(f"转换前 {before / 1024 / 1024:.1f}MB，转换后 {after / 1024 / 1024:.1f}MB，节省 {saved / 1024 / 1024:.1f}MB")


if __name__ == "__main__":
    main()
