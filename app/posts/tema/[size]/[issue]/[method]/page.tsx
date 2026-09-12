/* asset-manifests-v1 */
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import StaticFormulaPost from '@/app/StaticFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';
import {postAuthor} from '@/lib/post-authors';

type DrawNumber={number:string;animal:string;element:string};
type Draw={period:number;displayPeriod?:string;date?:string;numbers:DrawNumber[]};
type AdvancedSpec={kind:'digit'|'span'|'neighbor'|'mirror'|'multi'|'cross';a:number;b?:number;offset:number};
type BundleBranch={name:string;number:number;advancedSpec?:AdvancedSpec};
type BundleMethod={sourceKey:string;branches:BundleBranch[];formulaId?:string};
type SourceRef={position:number;periodOffset:number};
type Calculated={name:string;calculation:string;result:string;sourcePositions:number[];sourceRefs?:SourceRef[]};
const labels:Record<string,string>={'3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'};

function digits(value:number){return String(Math.abs(Math.trunc(value))).split('').reduce((sum,digit)=>sum+Number(digit),0)}
function wrap(value:number){while(value>49)value-=12;while(value<1)value+=12;return value}
function sourcePosition(label:string){return label==='特码'?6:Number(label.replace('平',''))-1}
function baseFormula(name:string,draw:Draw):{value:number;text:string;positions:number[]}|null{
  const values=draw.numbers.map(item=>Number(item.number));
  let match=name.match(/^(平[1-6]|特码)码(原码|合数|尾数)$/);
  if(match){const position=sourcePosition(match[1]),raw=values[position],value=match[2]==='合数'?digits(raw):match[2]==='尾数'?raw%10:raw;return {value,text:`${String(raw).padStart(2,'0')}${match[2]==='合数'?`合${value}`:match[2]==='尾数'?`尾${value}`:''}`,positions:[position]};}
  match=name.match(/^(平[1-6]|特码)码(加|减)期数合数$/);
  if(match){const position=sourcePosition(match[1]),raw=values[position],amount=digits(Number(draw.period)),value=match[2]==='加'?raw+amount:raw-amount;return {value,text:`${String(raw).padStart(2,'0')}${match[2]==='加'?'+':'−'}期合${amount}`,positions:[position]};}
  match=name.match(/^(平[1-6]|特码)码(加|减)(平[1-6]|特码)码$/);
  if(match){const left=sourcePosition(match[1]),right=sourcePosition(match[3]),value=match[2]==='加'?values[left]+values[right]:values[left]-values[right];return {value,text:`${String(values[left]).padStart(2,'0')}${match[2]==='加'?'+':'−'}${String(values[right]).padStart(2,'0')}`,positions:[left,right]};}
  match=name.match(/^(平[1-6]|特码)(合数|尾数)加(平[1-6]|特码)(合数|尾数)$/);
  if(match){const left=sourcePosition(match[1]),right=sourcePosition(match[3]),a=match[2]==='合数'?digits(values[left]):values[left]%10,b=match[4]==='合数'?digits(values[right]):values[right]%10;return {value:a+b,text:`${String(values[left]).padStart(2,'0')}${match[2]==='合数'?`合${a}`:`尾${a}`}+${String(values[right]).padStart(2,'0')}${match[4]==='合数'?`合${b}`:`尾${b}`}`,positions:[left,right]};}
  const aggregate:Record<string,{value:number;positions:number[]}>= {
    '六个平码总分':{value:values.slice(0,6).reduce((a,b)=>a+b,0),positions:[0,1,2,3,4,5]},
    '七码总分':{value:values.reduce((a,b)=>a+b,0),positions:[0,1,2,3,4,5,6]},
    '最小平码':{value:Math.min(...values.slice(0,6)),positions:[values.slice(0,6).indexOf(Math.min(...values.slice(0,6)))]},
    '最大平码':{value:Math.max(...values.slice(0,6)),positions:[values.slice(0,6).indexOf(Math.max(...values.slice(0,6)))]},
  };
  if(name.endsWith('合数')||name.endsWith('尾数')){const root=name.replace(/(合数|尾数)$/,'');const base=aggregate[root];if(base){const value=name.endsWith('合数')?digits(base.value):base.value%10;return {value,text:`${root}${base.value}${name.endsWith('合数')?`合${value}`:`尾${value}`}`,positions:base.positions};}}
  const base=aggregate[name];return base?{...base,text:`${name}${base.value}`}:null;
}
function calculateAdvanced(name:string,spec:AdvancedSpec,draw:Draw,previous?:Draw):Calculated|null{
  const values=draw.numbers.map(item=>Number(item.number));
  const prior=previous?.numbers.map(item=>Number(item.number));
  const a=values[spec.a],b=spec.b==null?undefined:values[spec.b];
  let base:number,expression:string,sourceRefs:SourceRef[]=[{position:spec.a+1,periodOffset:0}];
  if(spec.kind==='digit'){base=digits(a);expression=`${String(a).padStart(2,'0')}合${base}`;}
  else if(spec.kind==='span'&&b!=null){base=Math.abs(a-b);expression=`|${String(a).padStart(2,'0')}−${String(b).padStart(2,'0')}|=${base}`;sourceRefs.push({position:spec.b!+1,periodOffset:0});}
  else if(spec.kind==='neighbor'){base=a;expression=String(a).padStart(2,'0');}
  else if(spec.kind==='mirror'){base=50-a;expression=`50−${String(a).padStart(2,'0')}=${base}`;}
  else if(spec.kind==='multi'&&b!=null){base=a+b;expression=`${String(a).padStart(2,'0')}+${String(b).padStart(2,'0')}=${base}`;sourceRefs.push({position:spec.b!+1,periodOffset:0});}
  else if(spec.kind==='cross'&&spec.b!=null&&prior){base=a+prior[spec.b];expression=`本期${String(a).padStart(2,'0')}+上期${String(prior[spec.b]).padStart(2,'0')}=${base}`;sourceRefs.push({position:spec.b+1,periodOffset:-1});}
  else return null;
  const result=wrap(base+spec.offset),sign=spec.offset>=0?'+':'−';
  return {name,calculation:`${expression}${sign}${Math.abs(spec.offset)}=${String(result).padStart(2,'0')}`,result:String(result).padStart(2,'0'),sourcePositions:sourceRefs.filter(ref=>ref.periodOffset===0).map(ref=>ref.position),sourceRefs};
}
function calculate(name:string,draw:Draw,fallback:number,advancedSpec?:AdvancedSpec,previous?:Draw):Calculated{
  const advanced=advancedSpec?calculateAdvanced(name,advancedSpec,draw,previous):null;
  if(advanced)return advanced;
  const spread=name.match(/^邻码【(.+)】偏移([+-]\d+)$/);
  if(spread){const base=baseFormula(spread[1],draw);if(base){const offset=Number(spread[2]),result=wrap(base.value+offset),sign=offset>=0?'+':'−';return {name,calculation:`${base.text}${sign}${Math.abs(offset)}=${String(result).padStart(2,'0')}`,result:String(result).padStart(2,'0'),sourcePositions:base.positions.map(position=>position+1)};}}
  const special=name.match(/^(平[1-6]码|特码码)(合数|尾数|固定)?不对称交替加(\d+)减(\d+)$/);if(special){const [,source,mode='',plus,minus]=special,position=source==='特码码'?6:Number(source[1])-1,raw=Number(draw.numbers[position].number),base=mode==='合数'?digits(raw):mode==='尾数'?raw%10:raw,amount=draw.period%2?Number(plus):Number(minus),direction=draw.period%2?1:-1,result=wrap(base+direction*amount);return {name,calculation:`${base}${direction>0?'+':'−'}${amount}=${String(result).padStart(2,'0')}`,result:String(result).padStart(2,'0'),sourcePositions:[position+1]};}
  const cycle=name.match(/^(平[1-6]码|特码码)(合数|尾数|固定)?循环步长(\d+)$/);if(cycle){const [,source,mode='',amount]=cycle,position=source==='特码码'?6:Number(source[1])-1,raw=Number(draw.numbers[position].number),base=mode==='合数'?digits(raw):mode==='尾数'?raw%10:raw,step=((draw.period-1)%3+1)*Number(amount),result=wrap(base+step);return {name,calculation:`${base}+${step}=${String(result).padStart(2,'0')}`,result:String(result).padStart(2,'0'),sourcePositions:[position+1]};}
  const alternating=name.match(/^(平[1-6]码|特码码)(合数|尾数|固定)?(双期|三期)?交替加减(\d+)$/);
  if(alternating){const [,source,mode='',cycle='',amountText]=alternating,position=source==='特码码'?6:Number(source[1])-1,sourceNumber=Number(draw.numbers[position].number),base=mode==='合数'?digits(sourceNumber):mode==='尾数'?sourceNumber%10:sourceNumber,amount=Number(amountText),direction=cycle==='双期'?((Math.floor((draw.period-1)/2)%2===0)?1:-1):cycle==='三期'?((Math.floor((draw.period-1)/3)%2===0)?1:-1):(draw.period%2?1:-1),result=wrap(base+direction*amount),resultText=String(result).padStart(2,'0');return {name,calculation:`${source}${mode==='固定'?'':mode}：${String(base).padStart(2,'0')}${direction>0?'+':'−'}${amount}=${resultText}`,result:resultText,sourcePositions:[position+1]};}
  const match=name.match(/^(平[1-6]码|特码码)(合数|尾数|固定)(加|减)(\d+)$/);
  if(!match)return {name,calculation:name,result:String(wrap(fallback)).padStart(2,'0'),sourcePositions:[1]};
  const [,source,mode,operator,amountText]=match;
  const position=source==='特码码'?6:Number(source[1])-1;
  const sourceNumber=Number(draw.numbers[position].number);
  const base=mode==='合数'?digits(sourceNumber):mode==='尾数'?sourceNumber%10:sourceNumber;
  const amount=Number(amountText);
  const result=wrap(operator==='加'?base+amount:base-amount);
  const resultText=String(result).padStart(2,'0');
  return {name,calculation:`${source}${mode==='固定'?'':mode}：${String(base).padStart(2,'0')}${operator==='加'?'+':'−'}${amount}=${resultText}`,result:resultText,sourcePositions:[position+1]};
}

export default async function TemaMethodPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {size,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const label=labels[size];
  const methodIndex=Number(method)-1;
  const baseManifest=(await formulaManifests.tema[type]) as any;
  const latestManifest=(await formulaManifests.wuxing[type]) as any;
  const latestIssue=Number(latestManifest.issue??baseManifest.issue);
  const requestedIssue=Number(issue);
  const methods=(baseManifest.groups?.[size]?.methods??[]) as BundleMethod[];
  const selected=methods[methodIndex];
  const draws=(latestManifest.draws??[]) as Draw[];
  const drawMap=new Map(draws.map(draw=>[Number(draw.period),draw]));
  if(!label||!selected||!Number.isInteger(requestedIssue)||requestedIssue<1||requestedIssue>latestIssue)return <ArchivedFormulaPost type={type} path={`/posts/tema/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-特码公式`} backLabel="返回特码板块"/>;
  const calculateFor=(targetIssue:number)=>{const source=drawMap.get(targetIssue-1),previous=drawMap.get(targetIssue-2);return source?selected.branches.map(branch=>calculate(branch.name,source,branch.number,branch.advancedSpec,previous)):null};
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
  const item={label,sourceKey:selected.sourceKey,next:currentBranches.map(branch=>branch.result),recentStreak:fullHistory.reduce((count,row)=>row.hit?count+1:0,0),recent30Hits:fullHistory.slice(-30).filter(row=>row.hit).length,formulaId:selected.formulaId,branches:currentBranches.map(branch=>({...branch,next:branch.result})),history:fullHistory.slice(-5),...(verification?{verification:{hit:sourceEntry.hit,actualNumber:sourceEntry.actualNumber,actualAnimal:sourceEntry.actualAnimal,actualElement:sourceEntry.actualElement}}:{})};
  const cutoff=verification?requestedIssue:requestedIssue-1;
  const shownDraws=draws.filter(draw=>draw.period<=cutoff).slice(selected.branches.some(branch=>branch.advancedSpec?.kind==='cross')?-7:-6);
  const historyPeriods=item.history.map(entry=>entry.targetPeriod);
  const posterIssue=verification&&historyPeriods.length?`${Math.min(...historyPeriods)}-${Math.max(...historyPeriods)}`:String(requestedIssue);
  const issueButtons:number[]=[];for(let target=latestIssue;target>=1;target--)if(drawMap.has(target-1))issueButtons.push(target);
  const previous=methodIndex>0?String(methodIndex).padStart(3,'0'):null;
  const next=methodIndex<methods.length-1?String(methodIndex+2).padStart(3,'0'):null;
  return <StaticFormulaPost type={type} board="特码" hash="特码公式" note={`按上期开奖推算下期${label} · 仅供娱乐参考`} previous={previous?{href:`/posts/tema/${size}/${issue}/${previous}?type=${type}`,eyebrow:'上一个公式',label:`${label} 第${methodIndex}条`}:null} next={next?{href:`/posts/tema/${size}/${issue}/${next}?type=${type}`,eyebrow:'下一个公式',label:`${label} 第${methodIndex+2}条`}:null} topExtra={<IssueScroller issues={issueButtons} current={requestedIssue} basePath={`/posts/tema/${size}`} method={method} type={type}/>}>
    <section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={shownDraws} lotteryName={LOTTERY_SHORT_NAMES[type]} authorName={postAuthor(type,`tema${size}` as never,methodIndex)} mode="generic"/></section>
  </StaticFormulaPost>;
}
