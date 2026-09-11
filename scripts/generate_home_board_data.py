import json
import hashlib
import re
from pathlib import Path
from board_sort_scores import Scorer

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / 'public' / 'generated'
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
    fields=('rank','label','name','sourceKey','image','next','prediction','predictionNumber','predictionAnimal','predictionNumbers','predictionAnimals','values','numbers','animals','recentStreak','recent30Hits','recent30Rate','totalRate','scoredPeriods')
    return {**{key:method[key] for key in fields if key in method},'sourceIndex':index}

def build(lottery_type):
    boards={};audit=[]
    source_paths={latest(folder,lottery_type) for _,folder,_ in SOURCES}
    loaded={path:json.loads(path.read_text(encoding='utf-8')) for path in source_paths}
    draw_sets=[data.get('draws',[]) for data in loaded.values() if data.get('draws')]
    if not draw_sets: raise RuntimeError(f'missing draw history for type {lottery_type}')
    fallback_draws=max(draw_sets,key=lambda rows:max((int(row['period']) for row in rows),default=0))
    latest_draw=max(int(row['period']) for row in fallback_draws)
    print('Latest scoring draw',lottery_type,latest_draw,flush=True)
    scorers={}
    for key,folder,category in SOURCES:
        path=latest(folder,lottery_type)
        if path not in loaded: loaded[path]=json.loads(path.read_text(encoding='utf-8'))
        data=loaded[path]
        issue=int(data['issue'])
        if issue not in scorers: scorers[issue]=Scorer([d for d in fallback_draws if int(d['period'])<issue])
        scorer=scorers[issue]
        methods=data.get('groups',{}).get(category,{}).get('methods',[]) if category else data.get('methods',[])
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
    return audit

if __name__=='__main__':
    report=[]
    for value in (1,5,8): report.extend(build(value))
    (GENERATED/'home-board-sort-audit.json').write_text(json.dumps({'rule':'recentStreak desc, totalRate desc, original index asc','boards':report},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
