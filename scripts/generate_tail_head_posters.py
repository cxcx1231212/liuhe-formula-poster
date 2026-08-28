import json,math
from itertools import combinations
from PIL import Image,ImageDraw
from generate_fushi_samples import calculation_text,mark_sources,record_row
from generate_pingte_all_pattern_images import center,font
from generate_zodiac_posters import XS
from search_pingte_methods import ROOT,fetch_year,wrap
from search_zodiac_bundles import make_series
W=1080
def val(kind,v):n=wrap(v);return n%10 if kind=='tail' else n//10
def candidates(R,kind,size,min_streak,recent=None):
 targets=[val(kind,int(r['numberList'][6]['number'])) for r in R[1:]];items=[]
 for source,defs in make_series():
  ms=[]
  for name,c in defs:
   if any(x in name for x in ('除','合数','尾数','总分','乘')) or not ('加' in name or '减' in name):continue
   ms.append({'name':name,'calculate':c,'preds':[val(kind,c(a)) for a in R[:-1]],'next':val(kind,c(R[-1]))})
  for co in combinations(ms,size):
   if len({m['next'] for m in co})<size:continue
   pat=tuple(tuple(sorted(m['preds'][i] for m in co)) for i in range(len(targets)));h=[t in p for p,t in zip(pat,targets)];st=0
   for z in reversed(h):
    if not z:break
    st+=1
   r30=sum(h[-30:])
   if st>=min_streak and (recent is None or r30>=recent):items.append({'sourceKey':source,'branches':co,'values':sorted(m['next'] for m in co),'streak':st,'recent':r30,'total':sum(h),'pattern':pat})
 u={}
 for x in items:
  k=(x['pattern'],tuple(x['values']));o=u.get(k)
  if o is None or (x['recent'],x['streak'],x['total'])>(o['recent'],o['streak'],o['total']):u[k]=x
 return sorted(u.values(),key=lambda x:(x['recent'],x['streak'],x['total']),reverse=True)
def group_panel(d,top,item,source,kind,target=None):
 n=len(item['branches']);h=n*72+16;results=[];d.rounded_rectangle((305,top,1005,top+h),radius=14,fill='#fffaf0',outline='#c59b43',width=3)
 for i,b in enumerate(item['branches']):
  number=wrap(b['calculate'](source));result=val(kind,number);results.append(result);y=top+10+i*72;text=f"{calculation_text(b['name'],source,{b['name']:b['calculate']})}；{number:02d}{'尾' if kind=='tail' else '头'}＝{result}"
  d.rounded_rectangle((325,y,985,y+60),radius=9,fill='#c72d31');center(d,(655,y+30),text,font(22,True),'white')
 actual=val(kind,int(target['numberList'][6]['number'])) if target else None
 return h,target is not None and actual in set(results)
def render(item,label,kind,issue,R,out):
 ph=len(item['branches'])*72+16;step=ph+190;rowys=[430+ph+i*step for i in range(5)];H=rowys[-1]+150;im=Image.new('RGB',(W,H),'#e7dfd0');d=ImageDraw.Draw(im);d.rounded_rectangle((28,26,W-28,H-26),radius=28,fill='#f8f4ea',outline='#8d6a2e',width=2);d.rounded_rectangle((28,26,W-28,215),radius=28,fill='#11100d');d.rectangle((28,160,W-28,215),fill='#11100d');d.text((70,55),'六合公式库',font=font(21,True),fill='#c59b43');center(d,(W/2,112),f'2026-{issue:03d}期 · {label}',font(45,True),'#efd58e');center(d,(W/2,174),f"{item['sourceKey']} · 当前连准{item['streak']}期",font(22,True),'#9a875d')
 for x,t in zip(XS,['期号','平1码','平2码','平3码','平4码','平5码','平6码','特码']):center(d,(x,248),t,font(21,True),'#8b6726')
 d.text((60,295),f'{issue:03d}期预测',font=font(25,True),fill='#c62f31');center(d,(650,315),'、'.join(str(x) for x in item['values']),font(34,True),'#c62f31');cur=350;group_panel(d,cur,item,R[-1],kind);shown=R[-5:]
 for i,(r,y) in enumerate(zip(reversed(shown),rowys)):record_row(d,r,y,i%2==1)
 mark_sources(d,R[-1],rowys[0],item['branches'][0]['name'],cur,ph);ys=list(reversed(rowys))
 for i,(s,t) in enumerate(zip(shown,shown[1:])):
  pt=ys[i+1]+82;hh,hit=group_panel(d,pt,item,s,kind,t);mark_sources(d,s,ys[i],item['branches'][0]['name'],pt,hh)
  if hit:d.text((65,pt+hh/2-14),f'命中{label}',font=font(23,True),fill='#c62f31');d.line((1005,pt+hh/2,1020,pt+hh/2,1020,ys[i+1]+38),fill='#c62f31',width=5);d.polygon([(1020,ys[i+1]+30),(1009,ys[i+1]+48),(1031,ys[i+1]+48)],fill='#c62f31')
 d.text((68,H-64),'上一期计算下一期特码尾头 · 历史轨迹仅供娱乐参考',font=font(20,True),fill='#8d6a2e');im.save(out,quality=95)
def main():
 R=fetch_year(5,2026);issue=int(R[-1]['period'])+1
 specs={'tail':[(1,3,None,'一尾中特'),(2,5,None,'两尾中特')],'head':[(1,4,None,'一头中特'),(2,7,None,'二头中特'),(3,7,15,'三头中特')]}
 for kind,groups in specs.items():
  od=ROOT/'public'/'generated'/kind;od.mkdir(parents=True,exist_ok=True);methods=[]
  for size,st,recent,label in groups:
   selected=[];used=st
   for threshold in range(st,max(1,st-3)-1,-1):
    adjusted_recent=recent if threshold==st else (max(12,recent-3) if recent is not None else None)
    selected=candidates(R,kind,size,threshold,adjusted_recent);used=threshold
    if selected:break
   if used<st:selected=selected[:5]
   for i,item in enumerate(selected,1):
    rank=f'{size}-{i:03d}';fn=f'type-5-{issue}-{rank}.png';render(item,label,kind,issue,R,od/fn);methods.append({'rank':rank,'label':label,'values':item['values'],'streak':item['streak'],'image':f'/generated/{kind}/{fn}'})
  (od/f'type-5-{issue}-manifest.json').write_text(json.dumps({'issue':issue,'methods':methods},ensure_ascii=False,indent=2),encoding='utf-8');print(kind,len(methods))
if __name__=='__main__':main()
