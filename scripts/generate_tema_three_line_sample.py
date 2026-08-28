import json
from PIL import Image, ImageDraw
from generate_pingte_all_pattern_images import BALL_COLORS, center, font
from generate_tema_images import calculation, source_positions
from search_pingte_all_patterns import build_candidates
from search_pingte_methods import ROOT, fetch_year, wrap

W,H=1080,1500
OUT=ROOT/"public"/"generated"/"tema-bundles"/"type-5-239-03-001.png"
XS=[105,270,390,510,630,750,870,990]

def arrow(draw,start,end,label,color):
    sx,sy=start; ex,ey=end; route_y=(sy+ey)/2
    draw.line([(sx,sy-42),(sx,route_y),(ex,route_y),(ex,ey+42)],fill=color,width=6,joint="curve")
    draw.polygon([(ex,ey+34),(ex-13,ey+56),(ex+13,ey+56)],fill=color)
    f=font(23,True); box=draw.textbbox((0,0),label,font=f); width=box[2]-box[0]+28
    middle=(sx+ex)/2
    draw.rounded_rectangle((middle-width/2,route_y-20,middle+width/2,route_y+20),radius=12,fill=color)
    center(draw,(middle,route_y),label,f,"white")

def render():
    bundles=json.loads((ROOT/"data"/"tema"/"bundles-type-5-2026.json").read_text())["bundles"]["3"]
    bundle=next(item for item in bundles if item["recentStreak"]>=3)
    records=fetch_year(5,2026)[-4:]
    candidates={item["name"]:item for item in build_candidates()}
    image=Image.new("RGB",(W,H),"#e7dfd0"); draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((28,26,W-28,H-26),radius=28,fill="#f8f4ea",outline="#8d6a2e",width=2)
    draw.rounded_rectangle((28,26,W-28,215),radius=28,fill="#11100d")
    draw.rectangle((28,160,W-28,215),fill="#11100d"); draw.rectangle((28,26,38,215),fill="#c59b43")
    draw.text((70,56),"六合公式库",font=font(21,True),fill="#c59b43")
    center(draw,(W/2,112),"2026-239期 · 3码中特",font(45,True),"#efd58e")
    center(draw,(W/2,174),f"{bundle['sourceKey']} · 最近连续3期回测",font(24,True),"#9a875d")
    for x,label in zip(XS,["期号","平1码","平2码","平3码","平4码","平5码","平6码","特码"]):
        center(draw,(x,250),label,font(21,True),"#8b6726")
    draw.rounded_rectangle((48,280,W-48,400),radius=12,fill="#fffaf0",outline="#cf2d2d",width=2)
    draw.text((65,305),"239期",font=font(30,True),fill="#c59b43")
    draw.text((65,350),"下期预测",font=font(20,True),fill="#cf2d2d")
    prediction_centers=[]
    for index,branch in enumerate(bundle["branches"]):
        number=branch["number"]
        x=600+index*145; y=340; prediction_centers.append((x,y))
        draw.ellipse((x-40,y-40,x+40,y+40),fill=["#cf2d2d","#2178b5","#278a49"][index],outline="#fff",width=4)
        center(draw,(x,y),f"{number:02d}",font(35,True),"white")
        center(draw,(x,y+55),branch["name"].split("码",1)[1],font(16,True),"#8b6726")
    centers={}
    row_top=520; row_h=220
    for row_index,record in enumerate(reversed(records)):
        y=row_top+row_index*row_h
        draw.rectangle((48,y,W-48,y+row_h),fill="#fffdf8" if row_index%2==0 else "#f1ecdf")
        period=int(record["period"])
        draw.text((57,y+48),f"{period:03d}期",font=font(32,True),fill="#b78934")
        date=record["lotteryTime"].replace("年","/").replace("月","/").replace("日","")
        draw.text((57,y+103),date,font=font(17,True),fill="#817868")
        for position,item in enumerate(record["numberList"]):
            x,cy=XS[position+1],y+78; centers[(period,position)]=(x,cy)
            draw.ellipse((x-34,cy-34,x+34,cy+34),fill="#faf6ed",outline="#d1c8b8",width=5)
            center(draw,(x,cy),item["number"],font(31,True),"#655f55")
            center(draw,(x,cy+52),item["shengXiao"],font(22,True),"#817b70")
    def formula_box(y, source, actual=None):
        left,right=390,790
        draw.rounded_rectangle((left,y-57,right,y+57),radius=14,fill="#fffaf0",outline="#c59b43",width=3)
        row_ys=[y-37,y,y+37]; matched=None
        for branch_index,branch in enumerate(bundle["branches"]):
            result=wrap(candidates[branch["name"]]["calculate"](source)); color=colors[branch_index]
            top=row_ys[branch_index]-17; bottom=row_ys[branch_index]+17
            draw.rounded_rectangle((left+6,top,right-6,bottom),radius=9,fill=color)
            text=f"{branch['name'].split('码',1)[1]}＝{result:02d}"
            center(draw,((left+right)/2,row_ys[branch_index]),text,font(18,True),"white")
            if actual is not None and result==actual:
                draw.rounded_rectangle((left+2,top-4,right-2,bottom+4),radius=11,outline="#11100d",width=4)
                matched=(right,row_ys[branch_index],color)
        return (left,right,row_ys,matched)

    # 最近三次连续命中：每期三个公式全部放进同一个竖向框。
    ordered=records
    colors=["#cf2d2d","#2178b5","#278a49"]
    for index,(source,target) in enumerate(zip(ordered,ordered[1:])):
        actual=int(target["numberList"][6]["number"])
        position=source_positions(bundle["branches"][0]["name"],source)[-1]
        start=centers[(int(source["period"]),position)]; end=centers[(int(target["period"]),6)]
        sx,sy=start; ex,ey=end; route_y=(sy+ey)/2
        draw.ellipse((sx-41,sy-41,sx+41,sy+41),outline="#c59b43",width=6)
        left,right,row_ys,matched=formula_box(route_y,source,actual)
        draw.line([(sx,sy-42),(sx,route_y+57),(right,route_y+57)],fill="#c59b43",width=5,joint="curve")
        if matched:
            rx,line_y,color=matched
            draw.ellipse((ex-41,ey-41,ex+41,ey+41),outline=color,width=6)
            draw.line([(rx,line_y),(ex,line_y),(ex,ey+42)],fill=color,width=6,joint="curve")
            draw.polygon([(ex,ey+34),(ex-13,ey+56),(ex+13,ey+56)],fill=color)
            center(draw,((rx+ex)/2,line_y+18),"命中",font(16,True),color)
    # 238期同一取数位置连向239期三个参考号码。
    latest=records[-1]; position=source_positions(bundle["branches"][0]["name"],latest)[-1]
    sx,sy=centers[(int(latest["period"]),position)]; bracket_y=455
    draw.ellipse((sx-41,sy-41,sx+41,sy+41),outline="#c59b43",width=6)
    left,right,row_ys,_=formula_box(bracket_y,latest)
    draw.line([(sx,sy-43),(sx,bracket_y+57),(right,bracket_y+57)],fill="#c59b43",width=5,joint="curve")
    group_x=prediction_centers[1][0]
    draw.line((group_x,bracket_y-58,group_x,prediction_centers[1][1]+43),fill="#c59b43",width=6)
    draw.polygon([(group_x,prediction_centers[1][1]+34),(group_x-12,prediction_centers[1][1]+54),(group_x+12,prediction_centers[1][1]+54)],fill="#c59b43")
    draw.text((68,H-65),"前一期计算下一期 · 最近3期连续命中 · 历史规律仅供娱乐参考",font=font(21,True),fill="#8d6a2e")
    image.save(OUT,quality=95)
    print(OUT)

if __name__=="__main__":
    render()
