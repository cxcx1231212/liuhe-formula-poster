import json
import re

from PIL import Image, ImageDraw

from generate_fushi_samples import calculation_text, mark_sources, record_row
from generate_pingte_all_pattern_images import center, font
from generate_zodiac_posters import XS
from search_pingte_methods import ROOT, fetch_year, wrap
from search_zodiac_bundles import make_series

W=1080
DOMESTIC={"牛","马","羊","鸡","狗","猪"}
COLORS={"家肖":"#c18a2c","野肖":"#2d8d55"}

def source_text(name):
    labels=re.findall(r"平[1-6]码|特码",name)
    return "、".join(f"平码{label[1]}" if label.startswith("平") else "特码" for label in labels)

def age_calculation(name,record,calculate):
    text=calculation_text(name,record,{name:calculate})
    return re.sub(r"＝(\d+)→\d{2}$",r"＝\1",text)

def select(records):
    animal_map={int(x["number"]):x["shengXiao"] for r in records for x in r["numberList"]}
    classify=lambda value:"家肖" if animal_map[wrap(value)] in DOMESTIC else "野肖"
    rows=[]
    for source_key,definitions in make_series():
        for name,calculate in definitions:
            if any(word in name for word in ("除","合数","尾数","总分","乘")) or not ("加" in name or "减" in name):continue
            predictions=[classify(calculate(r)) for r in records[:-1]]; hits=[p==("家肖" if t["numberList"][6]["shengXiao"] in DOMESTIC else "野肖") for p,t in zip(predictions,records[1:])]; streak=0
            for hit in reversed(hits):
                if not hit:break
                streak+=1
            if streak>=7:rows.append({"sourceKey":source_key,"name":name,"calculate":calculate,"predictions":predictions,"next":classify(calculate(records[-1])),"recentStreak":streak,"recent30Hits":sum(hits[-30:]),"total":sum(hits),"kind":"formula"})
    follow_predictions=["家肖" if r["numberList"][2]["shengXiao"] in DOMESTIC else "野肖" for r in records[:-1]]
    follow_hits=[p==("家肖" if t["numberList"][6]["shengXiao"] in DOMESTIC else "野肖") for p,t in zip(follow_predictions,records[1:])]; streak=0
    for hit in reversed(follow_hits):
        if not hit:break
        streak+=1
    if streak>=7:rows.append({"sourceKey":"平3码家野跟随","name":"平3码家野跟随","calculate":lambda r:int(r["numberList"][2]["number"]),"predictions":follow_predictions,"next":"家肖" if records[-1]["numberList"][2]["shengXiao"] in DOMESTIC else "野肖","recentStreak":streak,"recent30Hits":sum(follow_hits[-30:]),"total":sum(follow_hits),"kind":"follow"})
    unique={}
    for item in rows:
        key=(tuple(item["predictions"]),item["next"]);old=unique.get(key)
        if old is None or (item["recent30Hits"],item["recentStreak"],item["total"])>(old["recent30Hits"],old["recentStreak"],old["total"]):unique[key]=item
    return sorted(unique.values(),key=lambda item:(item["recent30Hits"],item["recentStreak"],item["total"]),reverse=True),animal_map

def panel(draw,y,item,source,animal_map,target=None):
    number=wrap(item["calculate"](source));animal=animal_map[number];result="家肖" if animal in DOMESTIC else "野肖";color=COLORS[result]
    if item["kind"]=="follow":text=f"平3码{number:02d}＝{animal}＝{result}"
    else:text=f"{calculation_text(item['name'],source,{item['name']:item['calculate']})}＝{animal}＝{result}"
    draw.rounded_rectangle((305,y,1005,y+84),radius=14,fill="#fffaf0",outline="#c59b43",width=3);draw.rounded_rectangle((325,y+12,865,y+72),radius=10,fill=color);center(draw,(595,y+42),text,font(22,True),"white");draw.rounded_rectangle((885,y+12,985,y+72),radius=10,fill=color);center(draw,(935,y+42),result,font(25,True),"white")
    return target is not None and result==("家肖" if target["numberList"][6]["shengXiao"] in DOMESTIC else "野肖")

def render(item,issue,records,animal_map,output):
    row_ys=[560,820,1080,1340,1600];height=1760;image=Image.new("RGB",(W,height),"#e7dfd0");draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((28,26,W-28,height-26),radius=28,fill="#f8f4ea",outline="#8d6a2e",width=2);draw.rounded_rectangle((28,26,W-28,215),radius=28,fill="#11100d");draw.rectangle((28,160,W-28,215),fill="#11100d");draw.rectangle((28,26,38,215),fill="#c59b43");draw.text((70,56),"六合公式库",font=font(21,True),fill="#c59b43");center(draw,(W/2,112),f"2026-{issue:03d}期 · 家野中特",font(45,True),"#efd58e");center(draw,(W/2,174),f"{item['sourceKey']} · 当前连准{item['recentStreak']}期",font(22,True),"#9a875d")
    for x,text in zip(XS,["期号","平1码","平2码","平3码","平4码","平5码","平6码","特码"]):center(draw,(x,248),text,font(21,True),"#8b6726")
    draw.text((60,300),f"{issue:03d}期预测",font=font(25,True),fill="#c62f31");color=COLORS[item["next"]];draw.rounded_rectangle((400,285,680,365),radius=18,fill=color);center(draw,(540,325),f"下期{item['next']}",font(34,True),"white");panel(draw,400,item,records[-1],animal_map);shown=records[-5:]
    for index,(record,y) in enumerate(zip(reversed(shown),row_ys)):record_row(draw,record,y,index%2==1)
    mark_sources(draw,records[-1],row_ys[0],item["name"],400,84);ys=list(reversed(row_ys))
    for index,(source,target) in enumerate(zip(shown,shown[1:])):
        panel_y=ys[index+1]+82;hit=panel(draw,panel_y,item,source,animal_map,target);mark_sources(draw,source,ys[index],item["name"],panel_y,84)
        if hit:
            tx,ty=XS[7],ys[index+1];actual="家肖" if target["numberList"][6]["shengXiao"] in DOMESTIC else "野肖";color=COLORS[actual];draw.ellipse((tx-37,ty-37,tx+37,ty+37),outline=color,width=7);draw.text((65,panel_y+24),"命中家野",font=font(24,True),fill=color);draw.line((1005,panel_y+42,1020,panel_y+42,1020,ty+38),fill=color,width=5,joint="curve");draw.polygon([(1020,ty+30),(1009,ty+48),(1031,ty+48)],fill=color)
    draw.text((68,height-64),"家肖：牛马羊鸡狗猪 · 野肖：鼠虎兔龙蛇猴 · 仅供娱乐参考",font=font(20,True),fill="#8d6a2e");image.save(output,quality=95)

def main():
    records=fetch_year(5,2026);previous=dict(fetch_year(5,2025)[-1]);previous["displayPeriod"]=f"2025-{int(previous['period']):03d}期";previous["period"]=0;history_records=[previous,*records];issue=int(records[-1]["period"])+1;items,animal_map=select(records);output_dir=ROOT/"public"/"generated"/"jiaye";output_dir.mkdir(parents=True,exist_ok=True);methods=[]
    for index,item in enumerate(items,1):
        rank=f"{index:03d}";source_positions=[6 if label=="特码" else int(label[1])-1 for label in re.findall(r"平[1-6]码|特码",item["name"])]
        number=wrap(item["calculate"](records[-1]));raw_number=item["calculate"](records[-1]);age_number=raw_number if raw_number>0 else number;animal=animal_map[number];calculation=(f"取平码3：{age_number:02d}岁属{animal}＝{item['next']}" if item["kind"]=="follow" else f"取{source_text(item['name'])}：{age_calculation(item['name'],records[-1],item['calculate'])}，{age_number}岁属{animal}＝{item['next']}")
        history=[]
        for source,target in zip(history_records[:-1],history_records[1:]):
            result_number=wrap(item["calculate"](source));result_animal=animal_map[result_number];result="家肖" if result_animal in DOMESTIC else "野肖";actual=target["numberList"][6];actual_result="家肖" if actual["shengXiao"] in DOMESTIC else "野肖"
            raw_result=item["calculate"](source);age_result=raw_result if raw_result>0 else result_number;expression=(f"{age_result:02d}岁属{result_animal}·{result}" if item["kind"]=="follow" else f"{age_calculation(item['name'],source,item['calculate'])}｜{age_result}岁属{result_animal}·{result}")
            history.append({"sourcePeriod":int(source["period"]),"targetPeriod":int(target["period"]),"branches":[{"name":item["name"],"calculation":expression,"result":result}],"actualNumber":str(actual["number"]).zfill(2),"actualAnimal":actual["shengXiao"],"actualElement":actual_result,"hit":result==actual_result})
        methods.append({key:value for key,value in item.items() if key not in ("calculate","predictions")}|{"rank":rank,"next":[item["next"]],"image":None,"branches":[{"name":item["name"],"next":item["next"],"calculation":calculation,"sourcePositions":source_positions}],"history":history,"label":"家野中特"})
    draws=[{"period":int(record["period"]),"displayPeriod":record.get("displayPeriod"),"date":record.get("lotteryTime") or record.get("openTime") or record.get("date") or "","numbers":[{"number":str(value["number"]).zfill(2),"animal":value.get("shengXiao", ""),"element":"家" if value.get("shengXiao", "") in DOMESTIC else "野"} for value in record["numberList"]]} for record in history_records]
    path=output_dir/f"type-5-{issue}-manifest.json";path.write_text(json.dumps({"lotteryType":5,"year":2026,"issue":issue,"draws":draws,"methods":methods},ensure_ascii=False,indent=2),encoding="utf-8");print(f"{len(methods)} posts");print(path)
if __name__=="__main__":main()
