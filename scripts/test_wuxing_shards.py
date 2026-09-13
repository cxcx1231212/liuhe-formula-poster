import json
import tempfile
from pathlib import Path
from shard_wuxing_manifests import oversized_assets, shard_manifest

with tempfile.TemporaryDirectory() as folder:
    path = Path(folder) / "type-5-256-manifest.json"
    methods = ([{"rank": f"s{index:03d}", "value": index} for index in range(1, 5)]
               + [{"rank": f"d{index:03d}", "value": index} for index in range(1, 4)])
    path.write_text(json.dumps({"issue": 256, "draws": [1], "branchHistory": ["x"], "methods": methods}), encoding="utf-8")
    shards = shard_manifest(path, 3)
    main = json.loads(path.read_text(encoding="utf-8"))
    assert main["methods"] == []
    assert main["methodCount"] == 7
    assert len(main["methodShards"]) == 3
    assert [(item["prefix"], item["first"], item["last"]) for item in main["methodShards"]] == [("s", 1, 3), ("s", 4, 4), ("d", 1, 3)]
    restored = []
    for shard in shards:
        restored.extend(json.loads(shard.read_text(encoding="utf-8"))["methods"])
    assert restored == methods
    assert main["draws"] == [1] and main["branchHistory"] == ["x"]
    history_root = Path(folder) / "history-check"
    source_snapshot = history_root / "formula-history" / "type-5-2026" / "snapshots" / "001.json"
    source_snapshot.parent.mkdir(parents=True)
    source_snapshot.write_bytes(b"x" * 32)
    import shard_wuxing_manifests
    shard_wuxing_manifests.MAX_ASSET_BYTES = 16
    assert oversized_assets(history_root, ignore_source_history=True) == []
    assert oversized_assets(history_root, ignore_source_history=False) == [source_snapshot]
print("PASS Wuxing manifest sharding")
