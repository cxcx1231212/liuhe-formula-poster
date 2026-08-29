import json
import re
from itertools import combinations

from PIL import Image, ImageDraw

from generate_fushi_samples import calculation_text, mark_sources, record_row
from generate_pingte_all_pattern_images import center, font
from generate_zodiac_posters import XS
from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series

W = 1080
COLORS = {"金":"#b78934", "木":"#2d9153", "水":"#2983b8", "火":"#c93436", "土":"#8b5b37"}


def evaluated(records, element):
    groups=[]
    for source_key, definitions in make_series():
        methods=[]
        for name, calculate in definitions:
            if any(word in name for word in ("除","合数","尾数","总分","乘")) or not ("加" in name or "减" in name): continue
            predictions=[element(calculate(record)) for record in records[:-1]]
            methods.append({"name":name,"calculate":calculate,"predictions":predictions,"next":element(calculate(records[-1]))})
        groups.append((source_key,methods))
    return groups


def hit_stats(prediction_sets, targets):
    hits=[target in predictions for predictions,target in zip(prediction_sets,targets)]
    streak=0
    for hit in reversed(hits):
        if not hit: break
        streak+=1
    return streak,sum(hits[-30:]),sum(hits),hits


def select(records):
    mapping={int(item["number"]):item["wuXing"] for record in records for item in record["numberList"]}
    element=lambda value:mapping[wrap(value)]
    targets=[record["numberList"][6]["wuXing"] for record in records[1:]]
    groups=evaluated(records,element)
    singles=[]
    for source_key,methods in groups:
        for method in methods:
            sets=[(value,) for value in method["predictions"]]; streak,recent,total,_=hit_stats(sets,targets)
            if streak>=4: singles.append({"sourceKey":source_key,"branches":[method],"next":[method["next"]],"recentStreak":streak,"recent30Hits":recent,"total":total,"pattern":tuple(sets),"lineCount":1,"label":"一行中特"})
    pairs=[]
    for source_key,methods in groups:
        for first,second in combinations(methods,2):
            if first["next"]==second["next"]: continue
            sets=[tuple(sorted((a,b))) for a,b in zip(first["predictions"],second["predictions"])]
            streak,recent,total,_=hit_stats(sets,targets)
            if streak>=8: pairs.append({"sourceKey":source_key,"branches":[first,second],"next":list(sorted((first["next"],second["next"]))),"recentStreak":streak,"recent30Hits":recent,"total":total,"pattern":tuple(sets),"lineCount":2,"label":"两行中特"})
    def dedupe(items):
        unique={}
        for item in items:
            key=(item["pattern"],tuple(item["next"])); old=unique.get(key)
            if old is None or (item["recent30Hits"],item["recentStreak"],item["total"])>(old["recent30Hits"],old["recentStreak"],old["total"]): unique[key]=item
        return sorted(unique.values(),key=lambda item:(item["recent30Hits"],item["recentStreak"],item["total"]),reverse=True)
    return dedupe(singles),dedupe(pairs)


def formula_group(draw,top,item,source,target=None):
    results=[]
    for index,branch in enumerate(item["branches"]):
        result=branch["next"] if target is None and source is None else None
        if source is not None:
            number=wrap(branch["calculate"](source)); result=next_value(number)
            text=f"{calculation_text(branch['name'],source,{branch['name']:branch['calculate']})}＝{result}"
        else: text=f"下期参考＝{result}"
        y=top+index*92; color=COLORS[result]; results.append(result)
        draw.rounded_rectangle((305,y,1005,y+84),radius=14,fill="#fffaf0",outline="#c59b43",width=3)
        draw.rounded_rectangle((325,y+12,865,y+72),radius=10,fill=color); center(draw,(595,y+42),text,font(22,True),"white")
        draw.rounded_rectangle((885,y+12,985,y+72),radius=10,fill=color); center(draw,(935,y+42),result,font(28,True),"white")
    return target is not None and target["numberList"][6]["wuXing"] in set(results)


_ELEMENT_MAP={}
def next_value(number): return _ELEMENT_MAP[number]


def render(item,issue,records,output):
    global _ELEMENT_MAP
    _ELEMENT_MAP={int(x["number"]):x["wuXing"] for r in records for x in r["numberList"]}
    lines=item["lineCount"]; group_h=84+(lines-1)*92; step=260+(lines-1)*100
    row_ys=[560+(lines-1)*100+i*step for i in range(5)]; height=row_ys[-1]+160
    image=Image.new("RGB",(W,height),"#e7dfd0"); draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((28,26,W-28,height-26),radius=28,fill="#f8f4ea",outline="#8d6a2e",width=2); draw.rounded_rectangle((28,26,W-28,215),radius=28,fill="#11100d"); draw.rectangle((28,160,W-28,215),fill="#11100d"); draw.rectangle((28,26,38,215),fill="#c59b43")
    draw.text((70,56),"六合公式库",font=font(21,True),fill="#c59b43"); center(draw,(W/2,112),f"2026-{issue:03d}期 · {item['label']}",font(45,True),"#efd58e"); center(draw,(W/2,174),f"{item['sourceKey']} · 当前连准{item['recentStreak']}期",font(22,True),"#9a875d")
    for x,text in zip(XS,["期号","平1码","平2码","平3码","平4码","平5码","平6码","特码"]): center(draw,(x,248),text,font(21,True),"#8b6726")
    draw.text((60,300),f"{issue:03d}期预测",font=font(25,True),fill="#c62f31")
    box_w=180*len(item["next"]); start=(W-box_w)/2
    for i,result in enumerate(item["next"]): draw.rounded_rectangle((start+i*180,285,start+i*180+160,365),radius=18,fill=COLORS[result]); center(draw,(start+i*180+80,325),f"特{result}",font(32,True),"white")
    current_top=400
    formula_group(draw,current_top,item,records[-1]); shown=records[-5:]
    for index,(record,y) in enumerate(zip(reversed(shown),row_ys)): record_row(draw,record,y,index%2==1)
    mark_sources(draw,records[-1],row_ys[0],item["branches"][0]["name"],current_top,group_h)
    ys=list(reversed(row_ys))
    for index,(source,target) in enumerate(zip(shown,shown[1:])):
        panel_y=ys[index+1]+82; hit=formula_group(draw,panel_y,item,source,target); mark_sources(draw,source,ys[index],item["branches"][0]["name"],panel_y,group_h)
        if hit:
            tx,ty=XS[7],ys[index+1]; color=COLORS[target["numberList"][6]["wuXing"]]; draw.ellipse((tx-37,ty-37,tx+37,ty+37),outline=color,width=7); draw.text((65,panel_y+group_h/2-14),f"命中{item['label']}",font=font(24,True),fill=color); draw.line((1005,panel_y+group_h/2,1020,panel_y+group_h/2,1020,ty+38),fill=color,width=5,joint="curve"); draw.polygon([(1020,ty+30),(1009,ty+48),(1031,ty+48)],fill=color)
    draw.text((68,height-64),"上一期计算下一期特五行 · 历史轨迹仅供娱乐参考",font=font(21,True),fill="#8d6a2e"); image.save(output,quality=95)


def main():
    global _ELEMENT_MAP
    records=fetch_year(5,2026); previous=dict(fetch_year(5,2025)[-1]); previous["displayPeriod"]=f"2025-{int(previous['period']):03d}期"; previous["period"]=0; history_records=[previous,*records]; issue=int(records[-1]["period"])+1; output_dir=ROOT/"public"/"generated"/"wuxing"; output_dir.mkdir(parents=True,exist_ok=True); singles,pairs=select(records); methods=[]
    _ELEMENT_MAP={int(value["number"]):value["wuXing"] for record in records for value in record["numberList"]}
    for prefix,items in (("s",singles),("d",pairs)):
        for index,item in enumerate(items,1):
            rank=f"{prefix}{index:03d}"
            branches=[]
            for branch in item["branches"]:
                result_number=wrap(branch["calculate"](records[-1]))
                expression=calculation_text(branch["name"],records[-1],{branch["name"]:branch["calculate"]})
                source_positions=[6 if label=="特码" else int(label[1])-1 for label in re.findall(r"平[1-6]码|特码",branch["name"])]
                branches.append({"name":branch["name"],"next":branch["next"],"calculation":f"{expression}＝{result_number}（{branch['next']}）","sourcePositions":source_positions})
            history=[]
            for source,target in zip(history_records[:-1],history_records[1:]):
                history_branches=[]
                predictions=[]
                for branch in item["branches"]:
                    result_number=wrap(branch["calculate"](source)); result_element=next_value(result_number); predictions.append(result_element)
                    expression=calculation_text(branch["name"],source,{branch["name"]:branch["calculate"]})
                    history_branches.append({"name":branch["name"],"calculation":f"{expression}＝{result_number}（{result_element}）","result":result_element})
                actual=target["numberList"][6]
                history.append({"sourcePeriod":int(source["period"]),"targetPeriod":int(target["period"]),"branches":history_branches,"actualNumber":str(actual["number"]).zfill(2),"actualAnimal":actual.get("shengXiao", ""),"actualElement":actual.get("wuXing", ""),"hit":actual.get("wuXing", "") in predictions})
            methods.append({"rank":rank,"label":item["label"],"lineCount":item["lineCount"],"sourceKey":item["sourceKey"],"next":item["next"],"recentStreak":item["recentStreak"],"recent30Hits":item["recent30Hits"],"image":None,"branches":branches,"history":history})
    draws=[]
    for record in history_records:
        draws.append({"period":int(record["period"]),"displayPeriod":record.get("displayPeriod"),"date":record.get("lotteryTime") or record.get("openTime") or record.get("date") or "","numbers":[{"number":str(value["number"]).zfill(2),"animal":value.get("shengXiao", ""),"element":value.get("wuXing", "")} for value in record["numberList"]]})
    manifest={"lotteryType":5,"year":2026,"issue":issue,"draws":draws,"methods":methods}; path=output_dir/f"type-5-{issue:03d}-manifest.json"; path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8"); print(f"singles={len(singles)} pairs={len(pairs)} total={len(methods)}"); print(path)

if __name__=="__main__": main()
