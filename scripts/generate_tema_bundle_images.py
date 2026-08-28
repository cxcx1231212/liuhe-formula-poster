import json
import math
from PIL import Image, ImageDraw
from generate_pingte_all_pattern_images import center, font
from generate_tema_images import calculation, source_positions
from search_pingte_all_patterns import build_candidates
from search_pingte_methods import ROOT, fetch_year, wrap

W=1080
OUT_DIR=ROOT/"public"/"generated"/"tema-bundles"
COLORS=["#c92727","#2178b5","#278a49","#b87918","#7c52a2","#b84678"]
XS=[250,365,480,595,710,825,950]

def draw_record(draw,record,y,fill):
    draw.rounded_rectangle((58,y-37,W-58,y+47),radius=9,fill=fill,outline="#ddd1bd")
    draw.text((70,y-15),f"{int(record['period']):03d}期",font=font(23,True),fill="#946a25")
    positions={}
    for position,item in enumerate(record["numberList"]):
        x=XS[position]; positions[position]=(x,y)
        draw.ellipse((x-27,y-27,x+27,y+27),fill="#faf6ed",outline="#cfc4b2",width=3)
        center(draw,(x,y),item["number"],font(24,True),"#635c50")
        center(draw,(x,y+37),item["shengXiao"],font(15,True),"#817868")
    return positions

def render(bundle,rank,issue,records,candidate_map):
    size=bundle["size"]; grid_rows=math.ceil(size/6)
    history_top=315+grid_rows*112; card_height=345
    H=history_top+size*card_height+115
    image=Image.new("RGB",(W,H),"#e7dfd0"); draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((28,26,W-28,H-26),radius=28,fill="#f8f4ea",outline="#8d6a2e",width=2)
    draw.rounded_rectangle((28,26,W-28,220),radius=28,fill="#11100d")
    draw.rectangle((28,165,W-28,220),fill="#11100d"); draw.rectangle((28,26,38,220),fill="#c59b43")
    draw.text((70,58),"六合公式库",font=font(21,True),fill="#c59b43")
    center(draw,(W/2,116),f"2026-{issue:03d}期 · {size}码中特",font(46,True),"#efd58e")
    center(draw,(W/2,178),f"{bundle['sourceKey']}系列 · 每支公式单独回顾",font(24,True),"#9a875d")
    draw.text((62,248),"下期参考号码",font=font(25,True),fill="#8b6726")
    for index,number in enumerate(bundle["numbers"]):
        row,column=divmod(index,6); x,y=145+column*158,306+row*112; color=COLORS[index%len(COLORS)]
        draw.ellipse((x-42,y-42,x+42,y+42),fill=color,outline="#fff9eb",width=5)
        center(draw,(x,y),f"{number:02d}",font(38,True),"white")
    draw.line((55,history_top-30,W-55,history_top-30),fill="#cdbb94",width=2)
    draw.text((62,history_top-10),f"{int(records[-1]['period']):03d}期预测＋连续4期回测",font=font(25,True),fill="#8b6726")
    for index,branch in enumerate(bundle["branches"]):
        color=COLORS[index%len(COLORS)]; top=history_top+28+index*card_height
        draw.rounded_rectangle((48,top,W-48,top+318),radius=12,fill="#fffdf8",outline=color,width=3)
        draw.rounded_rectangle((64,top+12,114,top+60),radius=22,fill=color)
        center(draw,(89,top+36),str(index+1),font(20,True),"white")
        draw.text((132,top+19),branch["name"],font=font(25,True),fill="#67583c")
        calculate=candidate_map[branch["name"]]["calculate"]
        # 第一行：上一期计算本期预测。
        source=records[-1]; source_position=source_positions(branch["name"],source)[-1]
        source_value=int(source["numberList"][source_position]["number"]); y=top+92
        draw.rounded_rectangle((62,y-31,W-62,y+31),radius=9,fill="#f1ecdf")
        draw.text((76,y-12),f"{int(source['period']):03d}→{issue:03d}",font=font(20,True),fill="#946a25")
        draw.ellipse((205,y-24,253,y+24),fill="#faf6ed",outline=color,width=4)
        center(draw,(229,y),f"{source_value:02d}",font(21,True),"#302b23")
        result=branch["number"]; label=calculation(branch["name"],source,result)
        draw.line((260,y,850,y),fill=color,width=5); draw.polygon([(850,y),(836,y-9),(836,y+9)],fill=color)
        center(draw,(545,y),label,font(21,True),"white")
        draw.rounded_rectangle((395,y-19,695,y+19),radius=10,fill=color)
        center(draw,(545,y),label,font(21,True),"white")
        draw.ellipse((865,y-27,919,y+27),fill="#faf6ed",outline=color,width=5)
        center(draw,(892,y),f"{result:02d}",font(23,True),"#302b23")
        draw.text((932,y-10),"预测",font=font(18,True),fill=color)
        # 后四行：严格按连续期数回测，命中和未中都保留。
        for check_index,(old,target) in enumerate(list(zip(records,records[1:]))[-4:]):
            row_y=top+153+check_index*42
            position=source_positions(branch["name"],old)[-1]
            value=int(old["numberList"][position]["number"])
            predicted=wrap(calculate(old)); actual=int(target["numberList"][6]["number"])
            hit=predicted==actual; mark="#278a49" if hit else "#a79d8b"
            draw.line((70,row_y+20,W-70,row_y+20),fill="#e4dccd",width=1)
            draw.text((76,row_y-9),f"{int(old['period']):03d}→{int(target['period']):03d}",font=font(17,True),fill="#807561")
            center(draw,(245,row_y),f"取{value:02d}",font(18,True),"#5e5548")
            text=calculation(branch["name"],old,predicted)
            draw.line((285,row_y,758,row_y),fill=mark,width=3)
            center(draw,(520,row_y),text,font(17,True),"#5e5548")
            center(draw,(800,row_y),f"算{predicted:02d}",font(18,True),mark)
            center(draw,(900,row_y),f"开{actual:02d}",font(18,True),"#5e5548")
            draw.rounded_rectangle((954,row_y-16,1008,row_y+16),radius=12,fill=mark)
            center(draw,(981,row_y),"中" if hit else "未中",font(15,True),"white")
    draw.text((68,H-67),f"本期只用{int(records[-1]['period']):03d}期计算，并连续回测前4期 · 仅供娱乐参考",font=font(21,True),fill="#8d6a2e")
    watermark=Image.new("RGBA",(W,H),(0,0,0,0)); wm=ImageDraw.Draw(watermark)
    for y in range(330,H-100,180):
        for x in range(110 if (y//180)%2 else 300,W,430):
            wm.text((x,y),"六合公式库",font=font(25,True),fill=(118,86,36,28))
    image=Image.alpha_composite(image.convert("RGBA"),watermark).convert("RGB")
    path=OUT_DIR/f"type-5-{issue:03d}-{size:02d}-{rank:03d}.png"; image.save(path,quality=94)
    return path

if __name__=="__main__":
    output=json.loads((ROOT/"data"/"tema"/"bundles-type-5-2026.json").read_text(encoding="utf-8"))
    records=fetch_year(5,2026); candidate_map={c["name"]:c for c in build_candidates()}
    OUT_DIR.mkdir(parents=True,exist_ok=True); groups={}
    for size_text,methods in output["bundles"].items():
        size=int(size_text)
        paths=[render(method,rank,output["nextPeriod"],records,candidate_map) for rank,method in enumerate(methods,1)]
        groups[size_text]={"methods":methods,"images":[str(path.relative_to(ROOT/"public")) for path in paths]}
    manifest=OUT_DIR/f"type-5-{output['nextPeriod']:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue":output["nextPeriod"],"groups":groups},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"已生成 {sum(len(g['methods']) for g in groups.values())} 张多码特码图片：{manifest}")
