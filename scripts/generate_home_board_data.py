import json
import hashlib
import re
from pathlib import Path
from board_sort_scores import Scorer

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / 'public' / 'generated'
AUTHOR_MAP_PATH = ROOT / 'data' / 'formula-author-map.json'
AUTHOR_SEEDS_PATH = ROOT / 'data' / 'stable-author-seeds.json'
AUTHOR_SLOT_LIMIT = 137323
STABLE_SOURCE_BOARDS = {
    'zodiac:3', 'zodiac:6', 'zodiac:9',
    'fushi:22', 'fushi:33', 'fushi:2x', 'fushi:3x',
    'kill:code', 'kill:animal', 'kill:tail', 'kill:head', 'kill:wave',
}
SOURCES = [
    ('pingte:one','pingte-all',None),('pingte:two','pingte-two',None),
    *((f'tema:{c}','tema-bundles',c) for c in ('3','8','10','18')),
    *((f'zodiac:{c}','zodiac',c) for c in ('1','3','6','9')),
    *((f'fushi:{c}','fushi',c) for c in ('22','33','2x','3x')),
    ('danshuang:','danshuang',None),('wave:','wave',None),('wuxing:','wuxing',None),('jiaye:','jiaye',None),
    *((f'kill:{c}','kill',c) for c in ('code','animal','tail','head','wave')),
    ('size:','size',None),('tail:','tail',None),('head:','head',None),
]

def latest(folder,lottery_type):
    found=[]
    for path in (GENERATED/folder).glob(f'type-{lottery_type}-*-manifest.json'):
        match=re.fullmatch(r'type-\d+-(\d+)-manifest.json',path.name)
        if match: found.append((int(match[1]),path))
    if not found: raise FileNotFoundError(f'missing {folder} for type {lottery_type}')
    return max(found)[1]

def compact(method,index):
    fields=('rank','label','name','sourceKey','authorIndex','image','next','nextNumber','nextAnimal','prediction','predictionNumber','predictionAnimal','predictionNumbers','predictionAnimals','values','numbers','animals','algorithmFamily','advancedSpecs','recentStreak','recent30Hits','recent30Rate','totalRate','scoredPeriods')
    return {**{key:method[key] for key in fields if key in method},'sourceIndex':index}

def author_identity(method):
    formula_id=method.get('formulaId')
    if formula_id: return f'id:{formula_id}'
    # Ranking changes every period, so it must never be part of a permanent
    # author identity. Formula structure and labels are stable across sorting.
    stable={key:method.get(key) for key in ('name','sourceKey','label','branchNames','branches','advancedSpecs') if method.get(key) is not None}
    if 'branches' in stable:
        stable['branches']=[branch.get('name',branch) if isinstance(branch,dict) else branch for branch in stable['branches']]
    payload=json.dumps(stable,ensure_ascii=False,sort_keys=True,separators=(',',':'))
    return 'sig:'+hashlib.sha1(payload.encode('utf-8')).hexdigest()

def load_author_map():
    if not AUTHOR_MAP_PATH.exists(): return {'version':1,'boards':{}}
    data=json.loads(AUTHOR_MAP_PATH.read_text(encoding='utf-8'))
    return data if isinstance(data.get('boards'),dict) else {'version':1,'boards':{}}

def load_author_seeds():
    if not AUTHOR_SEEDS_PATH.exists(): return {}
    seeds=json.loads(AUTHOR_SEEDS_PATH.read_text(encoding='utf-8'))
    return seeds.get('boards',{})

def assign_authors(author_map,lottery_type,key,methods,author_seeds=None):
    board_key=f'{lottery_type}:{key}'
    registry=author_map['boards'].setdefault(board_key,{})
    seeds=(author_seeds or {}).get(board_key,{})
    used=[slot for name,board in author_map['boards'].items() if name.startswith(f'{lottery_type}:') for slot in board.values()]
    next_index=max(used,default=-1)+1
    seen={}
    for method in methods:
        legacy_identity=author_identity(method)
        if key in STABLE_SOURCE_BOARDS:
            source=method.get('sourceKey')
            if not isinstance(source,str) or not source.strip():
                raise RuntimeError(f'Missing stable author source for {board_key}')
            base='source:'+source
            if base in seen: raise RuntimeError(f'Duplicate stable author source for {board_key}: {source}')
            seen[base]=1
            identity=base
        else:
            base=legacy_identity;occurrence=seen.get(base,0);seen[base]=occurrence+1
            identity=base if occurrence==0 else f'{base}#{occurrence+1}'
        if identity not in registry:
            previous=method.get('authorIndex')
            seeded=seeds.get(method.get('sourceKey')) if key in STABLE_SOURCE_BOARDS else None
            if isinstance(seeded,int) and 0<=seeded<AUTHOR_SLOT_LIMIT:
                registry[identity]=seeded
            elif key in STABLE_SOURCE_BOARDS and legacy_identity in registry:
                registry[identity]=registry[legacy_identity]
            elif isinstance(previous,int) and 0<=previous<AUTHOR_SLOT_LIMIT:
                registry[identity]=previous
            else:
                if next_index>=AUTHOR_SLOT_LIMIT: raise RuntimeError(f'Author slots exhausted for lottery type {lottery_type}')
                registry[identity]=next_index;next_index+=1
        method['authorIndex']=registry[identity]

def build(lottery_type):
    boards={};audit=[]
    source_paths={latest(folder,lottery_type) for _,folder,_ in SOURCES}
    loaded={path:json.loads(path.read_text(encoding='utf-8')) for path in source_paths}
    draw_sets=[data.get('draws',[]) for data in loaded.values() if data.get('draws')]
    if not draw_sets: raise RuntimeError(f'missing draw history for type {lottery_type}')
    # Several current manifests can end at the same issue. Prefer the complete
    # history instead of a compact five-row poster payload, otherwise scoring
    # categories such as wuxing may miss number-to-element mappings.
    fallback_draws=max(draw_sets,key=lambda rows:(max((int(row['period']) for row in rows),default=0),len(rows)))
    latest_draw=max(int(row['period']) for row in fallback_draws)
    print('Latest scoring draw',lottery_type,latest_draw,flush=True)
    scorers={}
    author_map=load_author_map()
    author_seeds=load_author_seeds()
    for key,folder,category in SOURCES:
        path=latest(folder,lottery_type)
        if path not in loaded: loaded[path]=json.loads(path.read_text(encoding='utf-8'))
        data=loaded[path]
        issue=int(data['issue'])
        if issue not in scorers: scorers[issue]=Scorer([d for d in fallback_draws if int(d['period'])<issue])
        scorer=scorers[issue]
        methods=data.get('groups',{}).get(category,{}).get('methods',[]) if category else data.get('methods',[])
        assign_authors(author_map,lottery_type,key,methods,author_seeds)
        board=key.split(':')[0]
        if key=='pingte:two': board='pingte2'
        scored=[]
        for index,method in enumerate(methods):
            try: metrics=scorer.score(board,category or '',method)
            except Exception as error: raise RuntimeError(f'Cannot score {lottery_type}/{key}/{index+1}: {error}') from error
            method.update(metrics)
            scored.append((index,method,metrics))
        if folder=='zodiac' and category:
            split=GENERATED/'zodiac'/f'type-{lottery_type}-{issue:03d}-{category}-manifest.json'
            split.write_text(json.dumps({'issue':issue,'group':data.get('groups',{}).get(category,{}),'draws':data.get('draws') or fallback_draws},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        # Stable tie break keeps original formula identities; missing scores never become zero.
        scored.sort(key=lambda row:(-row[2]['recentStreak'],-row[2]['totalRate'],row[0]))
        compacted=[compact(m,i) for i,m,_ in scored]
        if compacted and scored[0][1].get('history'):
            compacted[0]['recentHistory']=scored[0][1]['history'][-5:]
        boards[key]={'issue':issue,'sortVersion':'verified-streak-total-v1','draws':fallback_draws[-5:],'methods':compacted}
        audit.append({'type':lottery_type,'board':key,'issue':issue,'count':len(methods),'scored':len(scored),'top':[{'sourceIndex':i,'rank':m.get('rank',str(i+1).zfill(3)),'name':m.get('name',m.get('sourceKey','')),**score} for i,m,score in scored[:3]]})
        audit[-1]['statisticsHash']=hashlib.sha256(json.dumps([(i,s) for i,_,s in scored],sort_keys=True,separators=(',',':')).encode()).hexdigest()
        print('Verified sort',lottery_type,key,len(scored),flush=True)
    # Update statistics only; retain all formula identities, predictions and histories in source order.
    for path,data in loaded.items():
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    output_dir=GENERATED/'home-board';output_dir.mkdir(parents=True,exist_ok=True)
    for key,payload in boards.items():
        output=output_dir/f"type-{lottery_type}-{key.replace(':','-')}.json"
        output.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    for scorer in scorers.values(): scorer.numeric.cache_clear()
    AUTHOR_MAP_PATH.parent.mkdir(parents=True,exist_ok=True)
    AUTHOR_MAP_PATH.write_text(json.dumps(author_map,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    return audit

if __name__=='__main__':
    report=[]
    for value in (1,5,8): report.extend(build(value))
    (GENERATED/'home-board-sort-audit.json').write_text(json.dumps({'rule':'recentStreak desc, totalRate desc, original index asc','boards':report},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
