import json
import math
import re
from PIL import Image, ImageDraw
from generate_pingte_all_pattern_images import center, font
from generate_tema_images import source_positions
from search_pingte_all_patterns import build_candidates
from search_pingte_methods import ROOT, fetch_year, wrap

W=1080
OUT=ROOT/"public"/"generated"/"tema-bundles"
XS=[105,270,390,510,630,750,870,990]
PALETTE=["#cf2d2d","#2178b5","#278a49","#bd7419","#7d4aa8","#bd3b72","#176f75","#a34b24",
         "#516ab0","#687d21","#9b3d3d","#2876a8","#2d8255","#c08025","#76549b","#b84e7d","#367580","#8c5b2b"]

def formula_box_height(size):
    return size*31+12 if size<=6 else 100

def formula_box(draw,y,bundle,source,candidates,actual=None):
    size=len(bundle["branches"]); vertical=size<=6
    height=formula_box_height(size)
    left,right=(350,815) if vertical else (70,940)
    draw.rounded_rectangle((left,y-height/2,right,y+height/2),radius=14,fill="#fffaf0",outline="#c59b43",width=3)
    matched=None
    columns=1 if vertical else math.ceil(size/2)
    rows=size if vertical else 2
    cell_w=(right-left-12)/columns
    cell_h=(height-12)/rows
    for index,branch in enumerate(bundle["branches"]):
        row=index if vertical else index//columns
        column=0 if vertical else index%columns
        cell_left=left+6+column*cell_w; cell_right=cell_left+cell_w-3
        line_y=y-height/2+6+row*cell_h+cell_h/2
        color="#9a6c20"
        result=wrap(candidates[branch["name"]]["calculate"](source))
        draw.rounded_rectangle((cell_left,line_y-cell_h/2+2,cell_right,line_y+cell_h/2-2),radius=7,fill=color)
        if vertical:
            text=f"{branch['name'].split('码',1)[1]}＝{result:02d}"; text_font=font(16,True)
        else:
            match=re.search(r"(加|减)(\d+)$",branch["name"])
            text=f"{match.group(1)}{match.group(2)}＝{result:02d}"; text_font=font(18 if columns<=5 else 14,True)
        center(draw,((cell_left+cell_right)/2,line_y),text,text_font,"white")
        if actual is not None and result==actual:
            draw.rounded_rectangle((cell_left-2,line_y-cell_h/2,cell_right+2,line_y+cell_h/2),radius=9,outline="#11100d",width=4)
            matched=(right,line_y,"#cf2d2d")
    return left,right,height,matched

def render(bundle,rank,size,issue,records,candidates):
    branches=sorted(bundle["branches"],key=lambda item:int(re.search(r"(\d+)$",item["name"]).group(1)))
    bundle={**bundle,"branches":branches}
    columns=size if size<=6 else math.ceil(size/2)
    grid_rows=math.ceil(size/columns)
    grid_y0=330; grid_gap=94
    prediction_bottom=grid_y0+(grid_rows-1)*grid_gap+58
    box_h=formula_box_height(size)
    current_box_y=prediction_bottom+32+box_h/2
    latest_y=current_box_y+box_h/2+105
    row_gap=box_h+145
    row_ys=[latest_y+i*row_gap for i in range(4)]
    H=int(row_ys[-1]+145)
    image=Image.new("RGB",(W,H),"#e7dfd0"); draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((28,26,W-28,H-26),radius=28,fill="#f8f4ea",outline="#8d6a2e",width=2)
    draw.rounded_rectangle((28,26,W-28,215),radius=28,fill="#11100d")
    draw.rectangle((28,160,W-28,215),fill="#11100d"); draw.rectangle((28,26,38,215),fill="#c59b43")
    draw.text((70,56),"六合公式库",font=font(21,True),fill="#c59b43")
    center(draw,(W/2,112),f"2026-{issue:03d}期 · {size}码中特",font(45,True),"#efd58e")
    center(draw,(W/2,174),f"{bundle['sourceKey']} · 连续回测",font(24,True),"#9a875d")
    for x,label in zip(XS,["期号","平1码","平2码","平3码","平4码","平5码","平6码","特码"]):
        center(draw,(x,248),label,font(21,True),"#8b6726")
    prediction_centers=[]
    for index,branch in enumerate(branches):
        row,column=divmod(index,columns)
        x=540 if columns==1 else 145+column*(790/(columns-1))
        y=grid_y0+row*grid_gap
        prediction_centers.append((x,y)); color=PALETTE[index]
        draw.ellipse((x-36,y-36,x+36,y+36),fill=color,outline="#fff",width=4)
        center(draw,(x,y),f"{branch['number']:02d}",font(31,True),"white")
    draw.text((60,292),f"{issue:03d}期预测",font=font(24,True),fill="#cf2d2d")
    centers={}
    shown=list(reversed(records[-4:]))
    for row_index,(record,y) in enumerate(zip(shown,row_ys)):
        draw.rectangle((48,y-58,W-48,y+76),fill="#fffdf8" if row_index%2==0 else "#f1ecdf")
        period=int(record["period"]); draw.text((57,y-18),f"{period:03d}期",font=font(30,True),fill="#b78934")
        date=record["lotteryTime"].replace("年","/").replace("月","/").replace("日","")
        draw.text((57,y+32),date,font=font(16,True),fill="#817868")
        for position,item in enumerate(record["numberList"]):
            x=XS[position+1]; centers[(period,position)]=(x,y)
            draw.ellipse((x-31,y-31,x+31,y+31),fill="#faf6ed",outline="#d1c8b8",width=4)
            center(draw,(x,y),item["number"],font(28,True),"#655f55")
            center(draw,(x,y+45),item["shengXiao"],font(19,True),"#817b70")
    # 本期：上一期取数进入一个竖向公式框，再用一个总箭头指向预测号码组。
    latest=records[-1]; position=source_positions(branches[0]["name"],latest)[-1]
    sx,sy=centers[(int(latest["period"]),position)]
    left,right,height,_=formula_box(draw,current_box_y,bundle,latest,candidates)
    draw.ellipse((sx-38,sy-38,sx+38,sy+38),outline="#c59b43",width=6)
    draw.line([(sx,sy-39),(sx,current_box_y+height/2),(right,current_box_y+height/2)],fill="#c59b43",width=5,joint="curve")
    group_x=sum(x for x,_ in prediction_centers)/len(prediction_centers)
    group_bottom=max(y for _,y in prediction_centers)+38
    draw.line((group_x,current_box_y-height/2,group_x,group_bottom),fill="#c59b43",width=6)
    draw.polygon([(group_x,group_bottom-8),(group_x-12,group_bottom+12),(group_x+12,group_bottom+12)],fill="#c59b43")
    # 历史三次：每一期所有公式都计算，只从命中行连到下一期实际特码。
    ordered=records[-4:]
    for source,target in zip(ordered,ordered[1:]):
        actual=int(target["numberList"][6]["number"])
        position=source_positions(branches[0]["name"],source)[-1]
        sx,sy=centers[(int(source["period"]),position)]; ex,ey=centers[(int(target["period"]),6)]
        box_y=(sy+ey)/2; left,right,height,matched=formula_box(draw,box_y,bundle,source,candidates,actual)
        draw.ellipse((sx-38,sy-38,sx+38,sy+38),outline="#c59b43",width=6)
        draw.line([(sx,sy-39),(sx,box_y+height/2),(right,box_y+height/2)],fill="#c59b43",width=5,joint="curve")
        if matched:
            rx,line_y,color=matched
            draw.ellipse((ex-38,ey-38,ex+38,ey+38),outline=color,width=6)
            draw.line([(rx,line_y),(ex,line_y),(ex,ey+39)],fill=color,width=6,joint="curve")
            draw.polygon([(ex,ey+31),(ex-12,ey+51),(ex+12,ey+51)],fill=color)
            center(draw,((rx+ex)/2,line_y+17),"命中",font(15,True),color)
    draw.text((68,H-64),"每期全部公式同时计算 · 命中行连接实际特码 · 历史规律仅供娱乐参考",font=font(20,True),fill="#8d6a2e")
    watermark=Image.new("RGBA",(W,H),(0,0,0,0)); wm=ImageDraw.Draw(watermark)
    for y in range(320,H-100,210):
        for x in range(120 if (y//210)%2 else 400,W,480):
            wm.text((x,y),"六合公式库",font=font(23,True),fill=(118,86,36,24))
    image=Image.alpha_composite(image.convert("RGBA"),watermark).convert("RGB")
    path=OUT/f"type-5-{issue:03d}-{size:02d}-{rank:03d}.png"; image.save(path,quality=94)
    return path

def main():
    payload=json.loads((ROOT/"data"/"tema"/"bundles-type-5-2026.json").read_text())
    records=fetch_year(5,2026); candidates={item["name"]:item for item in build_candidates()}
    groups={}
    for size_text,methods in payload["bundles"].items():
        size=int(size_text)
        paths=[render(method,rank,size,payload["nextPeriod"],records,candidates) for rank,method in enumerate(methods,1)]
        groups[size_text]={"methods":methods,"images":[str(path.relative_to(ROOT/"public")) for path in paths]}
    manifest=OUT/f"type-5-{payload['nextPeriod']:03d}-manifest.json"
    manifest.write_text(json.dumps({"issue":payload["nextPeriod"],"groups":groups},ensure_ascii=False,indent=2))
    print(f"已按最终模板生成 {sum(len(x['methods']) for x in groups.values())} 张图片")

if __name__=="__main__":
    main()
