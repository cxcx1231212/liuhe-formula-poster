"""Publish bounded history shards; original archive sources stay in Git."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/generated/formula-history'

READER = '''
  // history-shards-v1: fetch only the selected formula's bounded history shard.
  const safeType=['1','5','8'].includes(type)?type:'5';
  const prefix='generated/formula-history/type-'+safeType+'-2026/';
  const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,2);
  const index=await loadJson(prefix+'paths/'+await hash(path)+'.json');
  if(index){
    const id=index[path];
    if(!id)return null;
    const shard=await loadJson(prefix+'formulas/'+await hash(id)+'.json');
    const record=shard?.[id];
    if(!record)throw new Error('Formula history shard is missing: '+id);
    const current=record.entries.find((row:FormulaHistoryRow)=>row.href===path);
    if(!current)return null;
    const fallback=current.prediction?null:await livePrediction(safeType,current.issue,current);
    return {...record,label:current.label||current.signature,signature:current.signature,entries:record.entries.map((row:FormulaHistoryRow)=>row.href===path&&!row.prediction?{...row,prediction:fallback}:row)};
  }
'''

ARCHIVE_FUNCTION = '''def archive(lottery_type: int, year: int, issue: int) -> Path:
    legacy = GENERATED / "formula-history" / f"type-{lottery_type}-{year}.json"
    destination = GENERATED / "formula-history" / f"type-{lottery_type}-{year}" / "snapshots"
    destination.mkdir(parents=True, exist_ok=True)
    # history-snapshots-v1: retain legacy backup; append only per-issue files.
    if legacy.exists():
        for row in json.loads(legacy.read_text(encoding="utf-8")).get("snapshots", []):
            path = destination / f"{int(row['issue']):03d}.json"
            if not path.exists():
                path.write_text(json.dumps(row, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    current = snapshot(lottery_type, year, issue)
    current_path = destination / f"{issue:03d}.json"
    current_path.write_text(json.dumps(current, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    from search_pingte_methods import fetch_year
    draws = {int(row["period"]): row for row in fetch_year(lottery_type, year)}
    for path in destination.glob("*.json"):
        draw = draws.get(int(path.stem))
        if draw:
            row = json.loads(path.read_text(encoding="utf-8"))
            settle(row, draw)
            path.write_text(json.dumps(row, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"-- Per-issue history: {current_path} ({current['formulaCount']} formulas)")
    return current_path


'''


def migrate_sources():
    reader = ROOT / 'lib/formula-history.ts'
    source = reader.read_text(encoding='utf-8')
    anchor = 'export async function formulaHistory(type:string,path:string){'
    if 'history-shards-v1' not in source:
        if source.count(anchor) != 1:
            raise RuntimeError('Unexpected formula history reader; refusing unsafe rewrite')
        reader.write_text(source.replace(anchor, anchor + READER), encoding='utf-8')
    archiver = ROOT / 'scripts/archive_formula_history.py'
    source = archiver.read_text(encoding='utf-8')
    if 'history-snapshots-v1' not in source:
        start = source.index('def archive(')
        end = source.index('\nif __name__', start)
        archiver.write_text(source[:start] + ARCHIVE_FUNCTION + source[end:], encoding='utf-8')


def bucket(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()[:2]


def build():
    for lottery_type in (1, 5, 8):
        stem = f'type-{lottery_type}-2026'
        legacy = BASE / (stem + '.json')
        snapshot_dir = BASE / stem / 'snapshots'
        if snapshot_dir.exists():
            snapshots = (json.loads(p.read_text(encoding='utf-8')) for p in sorted(snapshot_dir.glob('*.json')))
        elif legacy.exists():
            snapshots = iter(json.loads(legacy.read_text(encoding='utf-8'))['snapshots'])
        else:
            continue
        paths, formulas = {}, {}
        for snapshot in snapshots:
            for row in snapshot.get('formulas', []):
                formula_id = row['formulaId']
                if row.get('href'):
                    paths.setdefault(bucket(row['href']), {})[row['href']] = formula_id
                group = formulas.setdefault(bucket(formula_id), {})
                item = group.setdefault(formula_id, {'lotteryType': lottery_type, 'year': 2026, 'formulaId': formula_id, 'entries': []})
                item.update(label=row.get('label') or row.get('signature'), signature=row.get('signature'))
                item['entries'].append({'issue': snapshot['issue'], **row})
        for family, groups in (('paths', paths), ('formulas', formulas)):
            directory = BASE / stem / family
            directory.mkdir(parents=True, exist_ok=True)
            for key, payload in groups.items():
                if family == 'formulas':
                    for item in payload.values():
                        item['entries'].sort(key=lambda row: row['issue'], reverse=True)
                output = directory / (key + '.json')
                output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
                if output.stat().st_size > 24 * 1024 * 1024:
                    raise RuntimeError(f'History shard needs repartitioning: {output}')
        print(f'History shards: type={lottery_type} files={len(paths)+len(formulas)}', flush=True)


def prune_build():
    # Remove ONLY redundant generated deployment copies, never source archives.
    target = ROOT / 'dist/client/generated/formula-history'
    if not target.is_dir():
        raise RuntimeError('Expected static build directory is absent')
    for legacy in target.glob('type-*-2026.json'):
        stem = legacy.stem
        if not (target / stem / 'paths').is_dir() or not (target / stem / 'formulas').is_dir():
            raise RuntimeError(f'Refusing to omit archive without history shards: {stem}')
        legacy.unlink()
    # Per-issue source snapshots also stay in Git, not duplicated in deployment.
    for directory in target.glob('type-*-2026/snapshots'):
        if not (directory.parent / 'formulas').is_dir():
            raise RuntimeError('Missing published history shards')
        for snapshot in directory.glob('*.json'):
            snapshot.unlink()
    print('Deployment uses history shards; source archives preserved', flush=True)


if __name__ == '__main__':
    if '--prune-build' in sys.argv:
        prune_build()
    else:
        migrate_sources()
        build()
