import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import IssueScroller from '@/app/IssueScroller';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

type Draw={period:number;date?:string;numbers:{number:string;animal:string;element:string}[]};
type Spec={kind:'single';pos:number;feature:'raw'|'digit'|'tail'}|{kind:'global';op:'min'|'max'|'regular_sum'|'all_sum'|'period_digit_sum'}|{kind:'pair';a:number;b:number;op:'sum'|'a_minus_b'|'b_minus_a'|'digit_sum'|'tail_sum'};
const labels=['平1码','平2码','平3码','平4码','平5码','平6码','特码'];
const digitSum=(value:number)=>String(Math.abs(value)).split('').reduce((sum,digit)=>sum+Number(digit),0);
const wrap=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
const sizeOf=(value:number)=>value>=25?'大':'小';
const num=(draw:Draw,index:number)=>Number(draw.numbers[index]?.number||0);

function evaluate(spec:Spec,draw:Draw){
  if(spec.kind==='single'){
    const raw=num(draw,spec.pos);const value=spec.feature==='digit'?digitSum(raw):spec.feature==='tail'?raw%10:raw;const suffix=spec.feature==='digit'?'合数':spec.feature==='tail'?'尾数':'';
    return {number:wrap(value),calculation:`${labels[spec.pos]}${suffix}：${String(raw).padStart(2,'0')}${suffix?`＝${value}`:''}`,sourcePositions:[spec.pos+1]};
  }
  if(spec.kind==='global'){
    if(spec.op==='min'||spec.op==='max'){
      const values=draw.numbers.slice(0,6).map(value=>Number(value.number));const value=spec.op==='min'?Math.min(...values):Math.max(...values);
      return {number:wrap(value),calculation:`六码${spec.op==='min'?'最小':'最大'}：${String(value).padStart(2,'0')}`,sourcePositions:[values.indexOf(value)+1]};
    }
    if(spec.op==='period_digit_sum'){const value=digitSum(draw.period);return {number:wrap(value),calculation:`期数合数：${draw.period}合${value}`,sourcePositions:[] as number[]};}
    const count=spec.op==='regular_sum'?6:7;const values=draw.numbers.slice(0,count).map(value=>Number(value.number));const value=values.reduce((sum,current)=>sum+current,0);
    return {number:wrap(value),calculation:`${count===6?'六码':'七码'}总分：${values.join('＋')}＝${value}→${wrap(value)}`,sourcePositions:values.map((_,index)=>index+1)};
  }
  const left=num(draw,spec.a),right=num(draw,spec.b);let value=0;let expression='';
  if(spec.op==='sum'){value=left+right;expression=`${left}＋${right}＝${value}`;}
  if(spec.op==='a_minus_b'){value=left-right;expression=`${left}－${right}＝${value}`;}
  if(spec.op==='b_minus_a'){value=right-left;expression=`${right}－${left}＝${value}`;}
  if(spec.op==='digit_sum'){value=digitSum(left)+digitSum(right);expression=`${left}合${digitSum(left)}＋${right}合${digitSum(right)}＝${value}`;}
  if(spec.op==='tail_sum'){value=left%10+right%10;expression=`${left}尾${left%10}＋${right}尾${right%10}＝${value}`;}
  return {number:wrap(value),calculation:`${expression}${wrap(value)!==value?`→${wrap(value)}`:''}`,sourcePositions:[spec.a+1,spec.b+1]};
}

export default async function SizePost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.size[type];
  const requestedIssue=Number(issue),currentIssue=Number(manifest.issue);const index=manifest.methods.findIndex((value:any)=>value.rank===method);const methodItem:any=index>=0?manifest.methods[index]:null;
  if(!methodItem||requestedIssue<2||requestedIssue>currentIssue)return <ArchivedFormulaPost type={type} path={`/posts/size/${issue}/${method}`} backHref={`/?type=${type}#board-大小公式`} backLabel="返回大小板块"/>;
  const allDraws=(manifest.draws as Draw[]).slice().sort((a,b)=>a.period-b.period);const drawByPeriod=new Map(allDraws.map(draw=>[draw.period,draw]));
  const history=allDraws.slice(0,-1).map((source,position)=>{const target=allDraws[position+1];if(target.period!==source.period+1)return null;const prediction=evaluate(methodItem.spec as Spec,source);const actual=Number(target.numbers[6].number);const hit=sizeOf(prediction.number)===sizeOf(actual);return {sourcePeriod:source.period,targetPeriod:target.period,branches:[{name:methodItem.name,calculation:`${prediction.calculation} 为${sizeOf(prediction.number)}`,result:sizeOf(prediction.number),sourcePositions:prediction.sourcePositions,targetPositions:hit?[7]:[]}],actualNumber:target.numbers[6].number,actualAnimal:target.numbers[6].animal,actualElement:target.numbers[6].element,hit,targetPositions:hit?[7]:[]};}).filter(Boolean) as any[];
  const sourceDraw=drawByPeriod.get(requestedIssue-1);if(!sourceDraw)return <ArchivedFormulaPost type={type} path={`/posts/size/${issue}/${method}`} backHref={`/?type=${type}#board-大小公式`} backLabel="返回大小板块"/>;
  const prediction=evaluate(methodItem.spec as Spec,sourceDraw);const verification=requestedIssue<currentIssue?history.find(entry=>entry.targetPeriod===requestedIssue):undefined;const visibleHistory=history.filter(entry=>entry.targetPeriod<=requestedIssue).slice(-5);
  const item={...methodItem,next:[sizeOf(prediction.number)],branches:[{name:methodItem.name,next:sizeOf(prediction.number),calculation:`${prediction.calculation} 为${sizeOf(prediction.number)}`,sourcePositions:prediction.sourcePositions}],history:visibleHistory,verification:verification?{hit:verification.hit,actualNumber:verification.actualNumber,actualAnimal:verification.actualAnimal,actualElement:verification.actualElement}:undefined};
  const posterIssue=verification&&visibleHistory.length?`${visibleHistory[0].targetPeriod}-${visibleHistory.at(-1).targetPeriod}`:issue;const draws=allDraws.filter(draw=>draw.period<=requestedIssue-1).slice(-6);const availableIssues=Array.from(new Set([currentIssue,...history.map(entry=>entry.targetPeriod)])).sort((a,b)=>b-a);
  return <DynamicSimpleFormulaPost type={type} issue={String(posterIssue)} navigationIssue={issue} method={method} item={methodItem} draws={draws} board="大小" hash="大小公式" basePath="/posts/size" index={index} total={manifest.methods.length} posterItemOverride={item} periodNav={<IssueScroller issues={availableIssues} current={requestedIssue} basePath="/posts/size" method={method} type={String(type)}/>} note="1至24为小，25至49为大 · 按上期开奖推算下期大小 · 仅供娱乐参考"/>;
}
