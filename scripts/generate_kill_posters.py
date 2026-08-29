import json, math
from PIL import Image,ImageDraw
from generate_fushi_samples import calculation_text,mark_sources,record_row
from generate_pingte_all_pattern_images import center,font
from generate_zodiac_posters import XS
from search_pingte_methods import ROOT,fetch_year,wrap,ANIMALS
from search_zodiac_bundles import make_series
W=1080; RED={1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46};BLUE={3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48}
CFG={'code':('杀六码','码',6,85),'animal':('杀三肖','肖',3,24),'tail':('杀一尾','尾',1,50),'head':('杀一头','头',1,22),'wave':('杀一波','波',1,12)}
def wave(n):return '红波' if n in RED else '蓝波' if n in BLUE else '绿波'
def prop(k,v):
 n=wrap(v);return n if k=='码' else ANIMALS[(n-1)%12] if k=='肖' else n%10 if k=='尾' else n//10 if k=='头' else wave(n)
def streak(h):
 s=0
 for x in reversed(h):
  if not x:break
  s+=1
 return s
def stats(ms,k,R):
 h=[prop(k,int(t['numberList'][6]['number'])) not in {m['preds'][i] for m in ms} for i,t in enumerate(R[1:])]
 return streak(h),sum(h[-30:]),sum(h),tuple(h)
def pool(ms,size,k,R):
 reps=[]
 for v in {m['next'] for m in ms}:reps.append(max([m for m in ms if m['next']==v],key=lambda m:stats([m],k,R)[:3]))
 if len(reps)<size:return None
 sel=[max(reps,key=lambda m:stats([m],k,R)[:3])]
 while len(sel)<size:
  used={m['next'] for m in sel};sel.append(max([m for m in reps if m['next'] not in used],key=lambda m:stats(sel+[m],k,R)[:3]))
 a=stats(sel,k,R);return {'branches':sel,'values':sorted([m['next'] for m in sel],key=str),'recentStreak':a[0],'recent30Hits':a[1],'total':a[2],'hits':a[3]}
def select(R,k,size,threshold):
 items=[]
 for source,defs in make_series():
  defs=[(n,c) for n,c in defs if not any(x in n for x in ('除','合数','尾数','总分','乘')) and ('加' in n or '减' in n)]
  ms=[{'name':n,'calculate':c,'preds':[prop(k,c(a)) for a in R[:-1]],'next':prop(k,c(R[-1]))} for n,c in defs];q=pool(ms,size,k,R)
  if q and q['recentStreak']>=threshold:q['sourceKey']=source;items.append(q)
 u={}
 for x in items:
  key=(x['hits'],tuple(x['values']));o=u.get(key)
  if o is None or (x['recentStreak'],x['recent30Hits'],x['total'])>(o['recentStreak'],o['recent30Hits'],o['total']):u[key]=x
 return sorted(u.values(),key=lambda x:(x['recentStreak'],x['recent30Hits'],x['total']),reverse=True)
def panel(draw,top,item,source,k,target=None):
 cols=2 if len(item['branches'])>1 else 1;rows=math.ceil(len(item['branches'])/cols);h=rows*66+18;results=[]
 draw.rounded_rectangle((305,top,1005,top+h),radius=14,fill='#fffaf0',outline='#c59b43',width=3)
 for i,b in enumerate(item['branches']):
  r,c=divmod(i,cols);x=318+c*340;y=top+10+r*66;v=prop(k,b['calculate'](source));results.append(v);text=f"{calculation_text(b['name'],source,{b['name']:b['calculate']})}→杀{v}"
  draw.rounded_rectangle((x,y,x+326,y+55),radius=8,fill='#b92d31');center(draw,(x+163,y+28),text,font(18 if cols==2 else 22,True),'white')
 actual=prop(k,int(target['numberList'][6]['number'])) if target else None
 return h,target is not None and actual not in set(results)
def render(item,label,k,issue,R,out):
 ph,_=panel(ImageDraw.Draw(Image.new('RGB',(1,1))),0,item,R[-1],k);step=ph+190;rowys=[430+ph+i*step for i in range(5)];H=rowys[-1]+150;im=Image.new('RGB',(W,H),'#e7dfd0');d=ImageDraw.Draw(im);d.rounded_rectangle((28,26,W-28,H-26),radius=28,fill='#f8f4ea',outline='#8d6a2e',width=2);d.rounded_rectangle((28,26,W-28,215),radius=28,fill='#11100d');d.rectangle((28,160,W-28,215),fill='#11100d');d.text((70,55),'六合公式库',font=font(21,True),fill='#c59b43');center(d,(W/2,112),f'2026-{issue:03d}期 · {label}',font(45,True),'#efd58e');center(d,(W/2,174),f"{item['sourceKey']} · 连准{item['recentStreak']}期",font(22,True),'#9a875d')
 for x,t in zip(XS,['期号','平1码','平2码','平3码','平4码','平5码','平6码','特码']):center(d,(x,248),t,font(21,True),'#8b6726')
 d.text((60,295),f'{issue:03d}期绝杀',font=font(25,True),fill='#c62f31');center(d,(650,315),'、'.join(map(str,item['values'])),font(28,True),'#c62f31');cur=350;panel(d,cur,item,R[-1],k);shown=R[-5:]
 for i,(r,y) in enumerate(zip(reversed(shown),rowys)):record_row(d,r,y,i%2==1)
 mark_sources(d,R[-1],rowys[0],item['branches'][0]['name'],cur,ph);ys=list(reversed(rowys))
 for i,(s,t) in enumerate(zip(shown,shown[1:])):
  pt=ys[i+1]+82;hh,hit=panel(d,pt,item,s,k,t);mark_sources(d,s,ys[i],item['branches'][0]['name'],pt,hh)
  if hit:d.text((65,pt+hh/2-14),f'命中{label}',font=font(23,True),fill='#c62f31');d.line((1005,pt+hh/2,1020,pt+hh/2,1020,ys[i+1]+38),fill='#c62f31',width=5);d.polygon([(1020,ys[i+1]+30),(1009,ys[i+1]+48),(1031,ys[i+1]+48)],fill='#c62f31')
 d.text((68,H-64),'所杀结果全部避开下期特号即中 · 仅供娱乐参考',font=font(20,True),fill='#8d6a2e');im.save(out,quality=95)
def main():
 R=fetch_year(5,2026);issue=int(R[-1]['period'])+1;od=ROOT/'public'/'generated'/'kill';od.mkdir(parents=True,exist_ok=True);groups={}
 for key,(label,k,size,threshold) in CFG.items():
  methods=[]
  for i,item in enumerate(select(R,k,size,threshold),1):
   rank=f'{i:03d}';fn=f'type-5-{issue}-{key}-{rank}.png';render(item,label,k,issue,R,od/fn);methods.append({'rank':rank,'sourceKey':item['sourceKey'],'branchNames':[b['name'] for b in item['branches']],'values':item['values'],'recentStreak':item['recentStreak'],'image':f'/generated/kill/{fn}'})
  groups[key]={'label':label,'methods':methods};print(label,len(methods))
 (od/f'type-5-{issue}-manifest.json').write_text(json.dumps({'issue':issue,'groups':groups},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
