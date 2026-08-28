import json
from PIL import ImageDraw
import generate_danshuang_posters as base
from generate_fushi_samples import calculation_text
from generate_pingte_all_pattern_images import center,font
from search_pingte_methods import ROOT,fetch_year,wrap
def size(v):return '大' if wrap(v)>=25 else '小'
def panel(draw,y,name,calculate,source,target=None):
 number=wrap(calculate(source));result=size(number);color='#c72d31' if result=='大' else '#2983b8';text=f"{calculation_text(name,source,{name:calculate})}；{number:02d}为{result}"
 draw.rounded_rectangle((305,y,1005,y+84),radius=14,fill='#fffaf0',outline='#c59b43',width=3);draw.rounded_rectangle((325,y+12,865,y+72),radius=10,fill=color);center(draw,(595,y+42),text,font(23,True),'white');draw.rounded_rectangle((885,y+12,985,y+72),radius=10,fill=color);center(draw,(935,y+42),f'特{result}',font(26,True),'white')
 return target is not None and result==target['numberList'][6]['daXiao']
def main():
 R=fetch_year(5,2026);base.parity=size;issue=int(R[-1]['period'])+1;od=ROOT/'public'/'generated'/'size';od.mkdir(parents=True,exist_ok=True);methods=[]
 selected=[];used=7
 for threshold in (7,6,5,4):
  selected=base.qualified(R,'normal',threshold);used=threshold
  if selected:break
 if used<7:selected=selected[:5]
 for i,item in enumerate(selected,1):
  rank=f'{i:03d}';fn=f'type-5-{issue}-{rank}.png';base.render(item,issue,R,od/fn,'normal','特码大小',panel);methods.append({k:v for k,v in item.items() if k not in ('calculate','predictions')}|{'rank':rank,'image':f'/generated/size/{fn}'})
 path=od/f'type-5-{issue}-manifest.json';path.write_text(json.dumps({'issue':issue,'standard':7,'thresholdUsed':used,'methods':methods},ensure_ascii=False,indent=2),encoding='utf-8');print(len(methods),path)
if __name__=='__main__':main()
