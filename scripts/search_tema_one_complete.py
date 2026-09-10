import json
from search_pingte_methods import ROOT, digit_sum, fetch_year, wrap
from search_pingte_all_patterns import numbers, tail

POSITIONS=["平1码","平2码","平3码","平4码","平5码","平6码","特码"]

def bases():
    items=[]
    def add(name,calculate): items.append((name,calculate))
    for p,label in enumerate(POSITIONS):
        add(label,lambda r,p=p:numbers(r)[p])
        add(f"{label}合数",lambda r,p=p:digit_sum(numbers(r)[p]))
        add(f"{label}尾数",lambda r,p=p:tail(numbers(r)[p]))
    add("最小平码",lambda r:min(numbers(r)[:6]))
    add("最大平码",lambda r:max(numbers(r)[:6]))
    add("六个平码总分",lambda r:sum(numbers(r)[:6]))
    add("七码总分",lambda r:sum(numbers(r)))
    add("期数合数",lambda r:digit_sum(int(r["period"])))
    for a in range(7):
        for b in range(a+1,7):
            an,bn=POSITIONS[a],POSITIONS[b]
            add(f"{an}＋{bn}",lambda r,a=a,b=b:numbers(r)[a]+numbers(r)[b])
            add(f"{an}－{bn}",lambda r,a=a,b=b:numbers(r)[a]-numbers(r)[b])
            add(f"{bn}－{an}",lambda r,a=a,b=b:numbers(r)[b]-numbers(r)[a])
            add(f"{an}合数＋{bn}合数",lambda r,a=a,b=b:digit_sum(numbers(r)[a])+digit_sum(numbers(r)[b]))
            add(f"{an}尾数＋{bn}尾数",lambda r,a=a,b=b:tail(numbers(r)[a])+tail(numbers(r)[b]))
    return items

def candidates():
    result=[]
    for base_name,base in bases():
        result.append({"name":base_name,"family":"基础值","calculate":base})
        for amount in range(1,19):
            result.append({"name":f"{base_name}加{amount}","family":"加法","calculate":lambda r,b=base,a=amount:b(r)+a})
            result.append({"name":f"{base_name}减{amount}","family":"减法","calculate":lambda r,b=base,a=amount:b(r)-a})
            result.append({"name":f"{base_name}交替加减{amount}","family":"交替加减","calculate":lambda r,b=base,a=amount:b(r)+(a if int(r["period"])%2 else -a)})
            result.append({"name":f"{base_name}双期交替加减{amount}","family":"双期交替加减","calculate":lambda r,b=base,a=amount:b(r)+(a if ((int(r["period"])-1)//2)%2==0 else -a)})
            result.append({"name":f"{base_name}三期交替加减{amount}","family":"三期交替加减","calculate":lambda r,b=base,a=amount:b(r)+(a if ((int(r["period"])-1)//3)%2==0 else -a)})
            if amount <= 6:
                result.append({"name":f"{base_name}不对称交替加{amount}减{amount+1}","family":"不对称交替","calculate":lambda r,b=base,a=amount:b(r)+(a if int(r["period"])%2 else -(a+1))})
                result.append({"name":f"{base_name}循环步长{amount}","family":"循环步长","calculate":lambda r,b=base,a=amount:b(r)+((int(r["period"])-1)%3+1)*a})
        for amount in range(2,13):
            result.append({"name":f"{base_name}乘{amount}","family":"乘法","calculate":lambda r,b=base,a=amount:b(r)*a})
            result.append({"name":f"{base_name}除{amount}取整","family":"除法取整","calculate":lambda r,b=base,a=amount:int(b(r)/a)})
            result.append({"name":f"{base_name}除{amount}余数","family":"除法余数","calculate":lambda r,b=base,a=amount:b(r)%a})
    return result

def streak(values):
    count=0
    for value in reversed(values):
        if not value: break
        count+=1
    return count

def run(lottery_type=5,year=2026):
    records=fetch_year(lottery_type,year); methods=[]
    for candidate in candidates():
        hits=[]
        for source,target in zip(records,records[1:]):
            predicted=wrap(candidate["calculate"](source))
            actual=int(target["numberList"][6]["number"])
            hits.append(predicted==actual)
        methods.append({
            "name":candidate["name"],"family":candidate["family"],
            "predictionNumber":wrap(candidate["calculate"](records[-1])),
            "recentStreak":streak(hits),"hits":hits[-6:],
        })
    qualified=[item for item in methods if item["recentStreak"]>=2]
    qualified.sort(key=lambda item:(item["recentStreak"],sum(item["hits"])),reverse=True)
    output={"totalFormulaCount":len(methods),"qualifiedCount":len(qualified),"qualifiedMethods":qualified}
    path=ROOT/"data"/"tema"/f"one-complete-type-{lottery_type}-{year}.json"
    path.write_text(json.dumps(output,ensure_ascii=False,indent=2))
    print(f"完整一码公式：{len(methods)}；最近连中2期以上：{len(qualified)}")
    for i,item in enumerate(qualified,1):
        print(f"{i:03d}. {item['name']} -> {item['predictionNumber']:02d} | 连中{item['recentStreak']}")
    print(path)
    return output

if __name__=="__main__": run()
