import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';import IssueScroller from '@/app/IssueScroller';import {pingteManifests,requestedLotteryType} from '@/lib/pingte-manifests';import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';

export const revalidate=3600;

type Draw={period:number;displayPeriod?:string;date?:string;numbers:{number:string;animal:string;element:string}[]};
type Check={sourcePeriod:number;targetPeriod:number;resultNumber:number;resultAnimal:string;hit:boolean;targetPositions:number[];targetNumbers:string[]};
const digits=(value:number)=>String(Math.abs(value)).split('').reduce((sum,char)=>sum+Number(char),0);
const wrap=(value:number)=>{while(value>49)value-=12;while(value<1)value+=12;return value};
const animals=['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
const animalFor=(value:number)=>animals[(wrap(value)-1)%12];
function targetPosition(draw:Draw|undefined,predictedNumber:number,predictedAnimal:string){
  const numbers=draw?.numbers||[];const exact=numbers.findIndex(value=>Number(value.number)===Number(predictedNumber));if(exact>=0)return [exact+1];
  const same=numbers.map((value,position)=>({value,position})).filter(({value})=>value.animal===predictedAnimal).sort((a,b)=>Math.abs(Number(a.value.number)-predictedNumber)-Math.abs(Number(b.value.number)-predictedNumber));
  return same.length?[same[0].position+1]:[];
}
function sourcePositions(name:string){
  // 总分是整行聚合值，不把七个球误画成七条独立取号线。
  if(name.includes('七码总分'))return [];
  return Array.from(new Set(Array.from(name.matchAll(/平([1-6])码|特码码/g),match=>match[0]==='特码码'?6:Number(match[1])-1)));
}
function calculation(name:string,draw:Draw|undefined,result:number){
  if(!draw)return `${name}＝${String(result).padStart(2,'0')}`;const values=draw.numbers.map(row=>Number(row.number));let match=name.match(/^(平([1-6])码|特码码)(固定|合数|尾数)交替加减(\d+)$/);
  if(match){const value=values[match[1]==='特码码'?6:Number(match[2])-1],mode=match[3],base=mode==='合数'?digits(value):mode==='尾数'?value%10:value,amount=Number(match[4]),direction=draw.period%2?1:-1;return `${String(value).padStart(2,'0')}${mode==='合数'?`合${base}`:mode==='尾数'?`尾${base}`:''}${direction>0?'＋':'－'}${amount}＝${String(wrap(base+direction*amount)).padStart(2,'0')}`}
  match=name.match(/平(\d)码固定(加|减)(\d+)/);
  if(match){const value=values[Number(match[1])-1],amount=Number(match[3]);return `${String(value).padStart(2,'0')}${match[2]==='加'?'＋':'－'}${amount}＝${String(wrap(value+(match[2]==='加'?amount:-amount))).padStart(2,'0')}`}
  match=name.match(/平(\d)码尾数(加|减)(\d+)/);if(match){const value=values[Number(match[1])-1],tail=value%10,amount=Number(match[3]);return `${String(value).padStart(2,'0')}尾${tail}${match[2]==='加'?'＋':'－'}${amount}＝${String(wrap(tail+(match[2]==='加'?amount:-amount))).padStart(2,'0')}`}
  match=name.match(/平(\d)(?:码)?合数＋平(\d)(?:码)?合数/);if(match){const a=values[Number(match[1])-1],b=values[Number(match[2])-1];return `${String(a).padStart(2,'0')}合${digits(a)}＋${String(b).padStart(2,'0')}合${digits(b)}＝${String(wrap(digits(a)+digits(b))).padStart(2,'0')}`}
  match=name.match(/平(\d)(?:码)?尾数＋平(\d)(?:码)?尾数/);if(match){const a=values[Number(match[1])-1],b=values[Number(match[2])-1];return `${String(a).padStart(2,'0')}尾${a%10}＋${String(b).padStart(2,'0')}尾${b%10}＝${String(wrap(a%10+b%10)).padStart(2,'0')}`}
  match=name.match(/七码总分加(\d+)/);if(match){const total=values.reduce((sum,value)=>sum+value,0),amount=Number(match[1]);return `七码总分${total}＋${amount}＝${String(wrap(total+amount)).padStart(2,'0')}`}
  return `${name}＝${String(result).padStart(2,'0')}`;
}
function calculatedNumber(name:string,draw:Draw|undefined,fallback:number){const match=calculation(name,draw,fallback).match(/＝(\d+)$/);return match?Number(match[1]):fallback}

export default async function PingteMethodPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=await pingteManifests.pingte[type];const requestedIssue=Number(issue);const currentIssue=Number(manifest.issue);const index=Number(method)-1;const currentItem=manifest.methods[index];
  if(!currentItem||!Number.isInteger(index)||index<0)return <ArchivedFormulaPost type={type} path={`/posts/pingte/${issue}/${method}`} backHref={`/?type=${type}#board-平特公式`} backLabel="返回平特板块"/>;
  const history:Check[]=currentItem.history||[];const sourceEntry=history.find(entry=>entry.targetPeriod===requestedIssue);const isDerivedHistory=requestedIssue<currentIssue&&Boolean(sourceEntry);
  if(requestedIssue!==currentIssue&&!isDerivedHistory)return <ArchivedFormulaPost type={type} path={`/posts/pingte/${issue}/${method}`} backHref={`/?type=${type}#board-平特公式`} backLabel="返回平特板块"/>;
  const draws:Draw[]=(await pingteManifests.wuxing[type]).draws;const drawMap=new Map(draws.map(draw=>[Number(draw.period),draw]));const selectedHistory=history.filter(entry=>entry.targetPeriod<=(isDerivedHistory?requestedIssue:currentIssue-1)).filter(entry=>drawMap.has(Number(entry.sourcePeriod))&&drawMap.has(Number(entry.targetPeriod))).slice(-5);const positions=sourcePositions(currentItem.name);
  const transformedHistory=selectedHistory.map(entry=>{const sourceDraw=drawMap.get(Number(entry.sourcePeriod)),targetDraw=drawMap.get(Number(entry.targetPeriod));const resultNumber=calculatedNumber(currentItem.name,sourceDraw,entry.resultNumber),resultAnimal=animalFor(resultNumber),targets=targetPosition(targetDraw,resultNumber,resultAnimal),actual=targets.length?targetDraw?.numbers[targets[0]-1]:undefined;return {...entry,resultNumber,resultAnimal,hit:targets.length>0,targetPositions:targets,branches:[{name:currentItem.name,calculation:`${calculation(currentItem.name,sourceDraw,resultNumber)}属${resultAnimal}`,result:resultAnimal,targetPositions:targets}],actualNumber:actual?.number||'',actualAnimal:actual?.animal||'',actualElement:actual?.element||''}});
  const predictionSource=drawMap.get(isDerivedHistory?requestedIssue-1:currentIssue-1);const storedPrediction=isDerivedHistory?sourceEntry!.resultNumber:currentItem.predictionNumber;const predictionNumber=calculatedNumber(currentItem.name,predictionSource,storedPrediction),predictionAnimal=animalFor(predictionNumber);const verifiedEntry=isDerivedHistory?transformedHistory.find(entry=>entry.targetPeriod===requestedIssue):undefined;
  const sourceText=positions.length===1?`取平码${positions[0]+1}`:'取公式号码';const item={label:'平特一肖',sourceKey:currentItem.name,next:[predictionAnimal],recentStreak:currentItem.recentStreak,recent30Hits:Math.round((currentItem.recent30Rate||0)*30),formulaId:currentItem.formulaId,branches:[{name:currentItem.name,next:predictionAnimal,calculation:`${sourceText}：${calculation(currentItem.name,predictionSource,predictionNumber)}属${predictionAnimal}`,sourcePositions:positions.map(position=>position+1)}],history:transformedHistory,...(isDerivedHistory?{verification:{hit:verifiedEntry?.hit??false,actualNumber:verifiedEntry?.actualNumber||'',actualAnimal:verifiedEntry?.actualAnimal||'',actualElement:verifiedEntry?.actualElement||''}}:{})};
  const cutoff=isDerivedHistory?requestedIssue:currentIssue-1;const shownDraws=draws.filter(draw=>draw.period<=cutoff).slice(-6);const periods=selectedHistory.map(entry=>entry.targetPeriod);const posterIssue=isDerivedHistory&&periods.length?`${Math.min(...periods)}-${Math.max(...periods)}`:issue;const availableIssues=Array.from(new Set([currentIssue,...history.map(entry=>entry.targetPeriod)])).sort((a,b)=>b-a);const previous=index>0?String(index).padStart(3,'0'):null;const next=index<manifest.methods.length-1?String(index+2).padStart(3,'0'):null;
  return <main className="post-page"><header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-平特公式`}>平特公式</a></nav></header><article className="detail pingte-detail"><div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-平特公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回平特板块</strong></span></a><IssueScroller issues={availableIssues} current={requestedIssue} basePath="/posts/pingte" method={method} type={type}/></div><section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={shownDraws} mode="pingte" lotteryName={LOTTERY_SHORT_NAMES[type]}/></section><p className="formula-note">按上期开奖推算下期平特一肖 · 平码与特码均计入 · 仅供娱乐参考</p><nav className="post-pager">{previous?<a href={`/posts/pingte/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>平特 第{index}条</strong></a>:<span/>}{next?<a href={`/posts/pingte/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>平特 第{index+2}条</strong></a>:<span/>}</nav></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
}
