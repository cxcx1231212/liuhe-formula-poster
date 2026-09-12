"""Backtest existing formulas for list ordering; never select or rewrite formulas."""
import re
from functools import lru_cache
from repair_history_integrity import base_value, prediction_for, digit, wave

ANIMALS = '马蛇龙兔虎牛鼠猪狗鸡猴羊'
def wrap(n):
    while n > 49: n -= 12
    while n < 1: n += 12
    return n

def extended_base(name, draw):
    name = name.replace('特码码','特码')
    if name.endswith('原码'): name = name[:-2]
    for suffix, convert in (('尾数',lambda n:n%10),('合数',digit)):
        if name in ('六个平码总分'+suffix,'七码总分'+suffix):
            return convert(base_value(name[:-2],draw))
    name = re.sub(r'平([1-6])(合数|尾数)',r'平\1码\2',name)
    if '加' in name or '减' in name:
        parts=re.split('(加|减)',name)
        if len(parts)==3:
            return extended_base(parts[0],draw)+(1 if parts[1]=='加' else -1)*extended_base(parts[2],draw)
    return base_value(name,draw)

def calculate(branch, draw):
    name=branch['name']
    neighbor=re.fullmatch(r'邻码【(.+)】偏移([+-]\d+)',name)
    if neighbor: return wrap(extended_base(neighbor[1],draw)+int(neighbor[2]))
    alternating=re.fullmatch(r'(.+?)(?:固定)?(双期|三期)?交替加减(\d+)',name)
    if alternating:
        base,cycle,amount=alternating.groups();n=extended_base(base,draw);period=int(draw['period'])
        plus=period%2==1 if not cycle else ((period-1)//(2 if cycle=='双期' else 3))%2==0
        return wrap(n+(int(amount) if plus else -int(amount)))
    special=re.fullmatch(r'(.+?)(?:固定)?不对称交替加(\d+)减(\d+)',name)
    if special:
        base,plus,minus=special.groups();period=int(draw['period'])
        return wrap(extended_base(base,draw)+(int(plus) if period%2 else -int(minus)))
    cycle=re.fullmatch(r'(.+?)(?:固定)?循环步长(\d+)',name)
    if cycle:
        base,amount=cycle.groups();period=int(draw['period'])
        return wrap(extended_base(base,draw)+((period-1)%3+1)*int(amount))
    if all(k in branch for k in ('baseName','operation','amount')):
        base,op,amount=branch['baseName'],branch['operation'],int(branch['amount'])
    else:
        match=re.fullmatch(r'(.+?)(?:固定)?(加|减|乘|除)(\d+)(取整|余数)?',name)
        if not match: raise ValueError('Unknown formula: '+name)
        base,action,amount,suffix=match.groups();amount=int(amount)
        op={'加':'add','减':'subtract','乘':'multiply','除':'modulo' if suffix=='余数' else 'divide_floor'}[action]
    n=extended_base(base,draw)
    period=int(draw['period']);result={'add':lambda:n+amount,'subtract':lambda:n-amount,'alternate_add_subtract':lambda:n+(amount if period%2 else -amount),'double_alternate_add_subtract':lambda:n+(amount if ((period-1)//2)%2==0 else -amount),'triple_alternate_add_subtract':lambda:n+(amount if ((period-1)//3)%2==0 else -amount),'asymmetric_alternate':lambda:n+(amount//100 if period%2 else -(amount%100)),'cyclic_step':lambda:n+((period-1)%3+1)*amount,'multiply':lambda:n*amount,'divide_floor':lambda:int(n/amount),'modulo':lambda:n%amount}[op]()
    return wrap(result)

def summarize(rows):
    if not rows: raise ValueError('No completed history available for sorting')
    streak=0
    for hit in reversed(rows):
        if not hit: break
        streak+=1
    return {'recentStreak':streak,'streak':streak,'totalRate':sum(rows)/len(rows),'recent30Rate':sum(rows[-30:])/len(rows[-30:]),'recent30Hits':sum(rows[-30:]),'scoredPeriods':len(rows)}

class Scorer:
    def __init__(self, draws):
        self.draws={int(d['period']):d for d in draws if len(d.get('numbers',[]))==7}
        self.pairs=[(self.draws[p-1],self.draws[p]) for p in sorted(self.draws) if p-1 in self.draws]
        if not self.pairs: raise ValueError('Missing consecutive draw history')
        self.elements={int(b['number']):b['element'] for d in self.draws.values() for b in d['numbers']}
        self.numeric=lru_cache(maxsize=None)(self._numeric)
    def _numeric(self,name,base,op,amount):
        branch={'name':name}
        if base is not None: branch.update(baseName=base,operation=op,amount=amount)
        return tuple(calculate(branch,source) for source,_ in self.pairs)
    def score(self,board,group,item):
        if board=='tema' and item.get('algorithmFamily') and item.get('advancedSpecs'):
            from generate_advanced_formulas import value
            rows=[]
            for source,target in self.pairs:
                previous=self.draws.get(int(source['period'])-1)
                predictions={value(spec,source,previous) for spec in item['advancedSpecs']}
                rows.append(int(target['numbers'][6]['number']) in predictions)
            return summarize(rows)
        if board=='fushi' and group in ('22','33') and item.get('expansionActive'):
            from fushi_expansion import score_expanded
            return score_expanded(item,self.pairs,3 if group=='33' else 2)
        if board in ('pingte','pingte2','jiaye'):
            rows=[]
            by_period={int(r['targetPeriod']):r for r in item.get('history',[]) if isinstance(r,dict) and 'targetPeriod' in r}
            for source,target in self.pairs:
                row=by_period.get(int(target['period']))
                if row is None: continue
                if board=='jiaye':
                    if isinstance(row.get('hit'),bool): rows.append(row['hit'])
                else:
                    pool=[row.get('resultAnimal')] if board=='pingte' else row.get('animals',[])
                    if not pool or None in pool: raise ValueError('Missing animal prediction')
                    actual={b['animal'] for b in target['numbers']}
                    rows.append((len(set(pool))==2 if board=='pingte2' else True) and set(pool)<=actual)
            return summarize(rows)
        if board in ('danshuang','wave','size','tail','head'):
            rows=[]
            for source,target in self.pairs:
                p=prediction_for(item,board,group,source)
                n=int(target['numbers'][6]['number'])
                predicted=(p.get('next') or p.get('values'))[0]
                if board=='wave': actual=wave(n)
                elif board=='danshuang':
                    hs='合数' in item.get('label','');actual=('合' if hs else '')+('单' if (digit(n) if hs else n)%2 else '双')
                elif board=='size': actual='大' if n>=25 else '小'
                else: actual=n%10 if board=='tail' else n//10
                rows.append(str(predicted)==str(actual))
            return summarize(rows)
        branches=item.get('branches') or [item]
        predictions=[self.numeric(b['name'],b.get('baseName'),b.get('operation'),b.get('amount')) for b in branches]
        elements=self.elements
        rows=[]
        for i,(_,target) in enumerate(self.pairs):
            ns={p[i] for p in predictions};balls=target['numbers'];special=balls[6];n=int(special['number'])
            animals={ANIMALS[(x-1)%12] for x in ns}
            if board=='tema': hit=n in ns
            elif board=='zodiac': hit=special['animal'] in animals
            elif board=='wuxing': hit=special['element'] in {elements[x] for x in ns}
            elif board=='fushi':
                required=3 if group in ('33','3x') else 2
                hit=len(animals & {b['animal'] for b in balls[:6]})>=required if group.endswith('x') else len(ns & {int(b['number']) for b in balls[:6]})>=required
            elif board=='kill':
                hit=n not in ns if group=='code' else special['animal'] not in animals if group=='animal' else n%10 not in {x%10 for x in ns} if group=='tail' else n//10 not in {x//10 for x in ns} if group=='head' else wave(n) not in {wave(x) for x in ns}
            else: raise ValueError('Unknown board '+board)
            rows.append(hit)
        return summarize(rows)
