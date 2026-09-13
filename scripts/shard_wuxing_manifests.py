"""Shard large formula assets and enforce Cloudflare's file limit site-wide."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_METHODS_PER_SHARD = 1000
MAX_ASSET_BYTES = 24 * 1024 * 1024


def shard_manifest(path, methods_per_shard=DEFAULT_METHODS_PER_SHARD):
    data = json.loads(path.read_text(encoding="utf-8"))
    methods = data.get("methods")
    if not isinstance(methods, list) or not methods:
        return []
    stem = path.name.removesuffix("-manifest.json")
    descriptors = []
    written = []
    for stale in path.parent.glob(f"{stem}-methods-*.json"):
        stale.unlink()
    rank_groups = {}
    for method in methods:
        rank = str(method["rank"])
        match = re.fullmatch(r"(\D*)(\d+)", rank)
        if not match:
            raise RuntimeError(f"Unsupported Wuxing rank {rank!r} in {path}")
        rank_groups.setdefault(match.group(1), []).append(method)
    shard_number = 0
    for prefix, ranked_methods in rank_groups.items():
        for offset in range(0, len(ranked_methods), methods_per_shard):
            group = ranked_methods[offset:offset + methods_per_shard]
            shard_number += 1
            shard_name = f"{stem}-methods-{shard_number:03d}.json"
            shard_path = path.with_name(shard_name)
            shard_path.write_text(json.dumps({"methods": group}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            numbers = [int(re.fullmatch(r"\D*(\d+)", str(item["rank"])).group(1)) for item in group]
            descriptors.append({"path": f"/generated/wuxing/{shard_name}", "prefix": prefix, "first": numbers[0], "last": numbers[-1]})
            written.append(shard_path)
    data["methods"] = []
    data["methodCount"] = len(methods)
    data["methodShards"] = descriptors
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for asset in [path, *written]:
        if asset.stat().st_size > MAX_ASSET_BYTES:
            raise RuntimeError(f"Formula shard still exceeds 24 MiB: {asset} ({asset.stat().st_size} bytes)")
    print(f"Wuxing shards: {path.name} methods={len(methods)} files={len(written)} main={path.stat().st_size}", flush=True)
    return written


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--methods-per-shard", type=int, default=DEFAULT_METHODS_PER_SHARD)
    args = parser.parse_args()
    folder = ROOT / "public" / "generated" / "wuxing"
    for path in folder.glob("type-*-*-manifest.json"):
        if re.fullmatch(r"type-\d+-\d+-manifest\.json", path.name):
            shard_manifest(path, args.methods_per_shard)
    oversized = [path for path in (ROOT / "public" / "generated").rglob("*") if path.is_file() and path.stat().st_size > MAX_ASSET_BYTES]
    if oversized:
        details = "\n".join(f"- {path.relative_to(ROOT)}: {path.stat().st_size} bytes" for path in oversized)
        raise RuntimeError(f"Generated assets exceed the site-wide 24 MiB safety limit:\n{details}")


if __name__ == "__main__":
    main()
