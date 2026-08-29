import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import StaticFormulaPost from '@/app/StaticFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';

type DrawNumber={number:string;animal:string;element:string};
type Draw={period:number;displayPeriod?:string;date?:string;numbers:DrawNumber[]};
type BundleBranch={name:string;number:number};
type BundleMethod={sourceKey:string;branches:BundleBranch[];formulaId?:string};
type Calculated={name:string;calculation:string;result:string;sourcePositions:number[]};
const labels:Record<string,string>={'3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'};

function digits(value:number){return Math.floor(value/10)+(value%10)}
function wrap(value:number){while(value>49)value-=12;while(value<1)value+=12;return value}
function calculate(name:string,draw:Draw,fallback:number):Calculated{
  const match=name.match(/^(平[1-6]码|特码码)(合数|尾数|固定)(加|减)(\d+)$/);
  if(!match)return {name,calculation:name,result:String(wrap(fallback)).padStart(2,'0'),sourcePositions:[0]};
  const [,source,mode,operator,amountText]=match;
  const position=source==='特码码'?6:Number(source[1])-1;
  const sourceNumber=Number(draw.numbers[position].number);
  const base=mode==='合数'?digits(sourceNumber):mode==='尾数'?sourceNumber%10:sourceNumber;
  const amount=Number(amountText);
  const result=wrap(operator==='加'?base+amount:base-amount);
  const resultText=String(result).padStart(2,'0');
  return {name,calculation:`${source}${mode==='固定'?'':mode}：${String(base).padStart(2,'0')}${operator==='加'?'+':'−'}${amount}=${resultText}`,result:resultText,sourcePositions:[position]};
}

export default async function TemaMethodPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {size,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const label=labels[size];
  const methodIndex=Number(method)-1;
  const baseManifest=formulaManifests.tema[type] as any;
  const latestManifest=formulaManifests.wuxing[type] as any;
  const latestIssue=Number(latestManifest.issue??baseManifest.issue);
  const requestedIssue=Number(issue);
  const methods=(baseManifest.groups?.[size]?.methods??[]) as BundleMethod[];
  const selected=methods[methodIndex];
  const draws=(latestManifest.draws??[]) as Draw[];
  const drawMap=new Map(draws.map(draw=>[Number(draw.period),draw]));
  if(!label||!selected||!Number.isInteger(requestedIssue)||requestedIssue<1||requestedIssue>latestIssue)return <ArchivedFormulaPost type={type} path={`/posts/tema/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-特码公式`} backLabel="返回特码板块"/>;
  const calculateFor=(targetIssue:number)=>{const source=drawMap.get(targetIssue-1);return source?selected.branches.map(branch=>calculate(branch.name,source,branch.number)):null};
  const currentBranches=calculateFor(requestedIssue);
  if(!currentBranches)return <ArchivedFormulaPost type={type} path={`/posts/tema/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-特码公式`} backLabel="返回特码板块"/>;

  const fullHistory=[] as any[];
  for(let target=1;target<=requestedIssue;target++){
    const source=drawMap.get(target-1),actual=drawMap.get(target),branches=calculateFor(target);
    if(!source||!actual||!branches)continue;
    const special=actual.numbers[6];
    fullHistory.push({sourcePeriod:source.period,targetPeriod:actual.period,branches:branches.map(branch=>({...branch,targetPositions:branch.result===special.number?[7]:[]})),actualNumber:special.number,actualAnimal:special.animal,actualElement:special.element,hit:branches.some(branch=>branch.result===special.number),targetPositions:[7]});
  }
  const sourceEntry=fullHistory.find(entry=>entry.targetPeriod===requestedIssue);
  const verification=requestedIssue<latestIssue&&Boolean(sourceEntry);
  const item={label,sourceKey:selected.sourceKey,next:currentBranches.map(branch=>branch.result),recentStreak:0,recent30Hits:0,formulaId:selected.formulaId,branches:currentBranches.map(branch=>({...branch,next:branch.result})),history:fullHistory.slice(-5),...(verification?{verification:{hit:sourceEntry.hit,actualNumber:sourceEntry.actualNumber,actualAnimal:sourceEntry.actualAnimal,actualElement:sourceEntry.actualElement}}:{})};
  const cutoff=verification?requestedIssue:requestedIssue-1;
  const shownDraws=draws.filter(draw=>draw.period<=cutoff).slice(-6);
  const historyPeriods=item.history.map(entry=>entry.targetPeriod);
  const posterIssue=verification&&historyPeriods.length?`${Math.min(...historyPeriods)}-${Math.max(...historyPeriods)}`:String(requestedIssue);
  const issueButtons:number[]=[];for(let target=latestIssue;target>=1;target--)if(drawMap.has(target-1))issueButtons.push(target);
  const previous=methodIndex>0?String(methodIndex).padStart(3,'0'):null;
  const next=methodIndex<methods.length-1?String(methodIndex+2).padStart(3,'0'):null;
  return <StaticFormulaPost type={type} board="特码" hash="特码公式" note={`按上期开奖推算下期${label} · 仅供娱乐参考`} previous={previous?{href:`/posts/tema/${size}/${issue}/${previous}?type=${type}`,eyebrow:'上一个公式',label:`${label} 第${methodIndex}条`}:null} next={next?{href:`/posts/tema/${size}/${issue}/${next}?type=${type}`,eyebrow:'下一个公式',label:`${label} 第${methodIndex+2}条`}:null} topExtra={<IssueScroller issues={issueButtons} current={requestedIssue} basePath={`/posts/tema/${size}`} method={method} type={type}/>}>
    <section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={shownDraws} lotteryName={LOTTERY_SHORT_NAMES[type]} mode="generic"/></section>
  </StaticFormulaPost>;
}
