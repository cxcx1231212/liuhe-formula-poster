import type {ZodiacDraw} from './zodiac-history';

export type DanshuangMethod={rank:string;label:string;sourceKey:string;name:string;baseName:string;operation:string;amount:number};

const digitSum=(value:number)=>String(Math.abs(value)).split('').reduce((sum,digit)=>sum+Number(digit),0);
const values=(draw:ZodiacDraw)=>draw.numbers.map(item=>Number(item.number));
const position=(name:string)=>name==='特码'?6:Number(name.match(/平([1-6])码/)?.[1]||1)-1;
const cellValue=(draw:ZodiacDraw,label:string)=>values(draw)[position(label)]||0;
const converted=(draw:ZodiacDraw,label:string,kind?:string)=>{const value=cellValue(draw,label);return kind==='合数'?digitSum(value):kind==='尾数'?value%10:value;};
const baseValue=(draw:ZodiacDraw,base:string):number=>{
  if(base==='最小平码'||base==='平码最小值')return Math.min(...values(draw).slice(0,6));
  if(base==='最大平码'||base==='平码最大值')return Math.max(...values(draw).slice(0,6));
  if(base==='六个平码总分'||base==='平码总分')return values(draw).slice(0,6).reduce((a,b)=>a+b,0);
  if(base==='七码总分')return values(draw).reduce((a,b)=>a+b,0);
  if(base==='期数合数')return digitSum(draw.period);
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair){const left=converted(draw,pair[1],pair[2]),right=converted(draw,pair[4],pair[5]);return pair[3]==='＋'?left+right:left-right;}
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  return single?converted(draw,single[1],single[2]):0;
};
const baseExpression=(draw:ZodiacDraw,base:string)=>{
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair)return `${String(converted(draw,pair[1],pair[2])).padStart(2,'0')}${pair[3]}${String(converted(draw,pair[4],pair[5])).padStart(2,'0')}`;
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  return single?String(converted(draw,single[1],single[2])).padStart(2,'0'):String(baseValue(draw,base));
};
const sourcePositions=(base:string)=>Array.from(new Set(Array.from(base.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?7:Number(match[1]))));
const parity=(number:number)=>number%2?'单':'双';
const heshuParity=(number:number)=>digitSum(number)%2?'合单':'合双';

export function buildDanshuangPosterItem(method:DanshuangMethod,draws:ZodiacDraw[],requestedIssue:number){
  const ordered=draws.slice().sort((a,b)=>a.period-b.period);
  const evaluate=(draw:ZodiacDraw)=>{
    const base=baseValue(draw,method.baseName);const raw=Math.trunc(method.operation==='subtract'?base-method.amount:base+method.amount);
    const prediction=method.label==='合数单双'?heshuParity(raw):parity(raw);
    const symbol=method.operation==='subtract'?'−':'+';
    const suffix=method.label==='合数单双'?` → 合数${digitSum(raw)}为${prediction}`:` → ${prediction}`;
    return {prediction,calculation:`${baseExpression(draw,method.baseName)}${symbol}${method.amount}=${raw}${suffix}`};
  };
  const histories=[];
  for(let index=0;index<ordered.length-1;index++){
    const source=ordered[index],target=ordered[index+1];if(target.period>requestedIssue)continue;
    const answer=evaluate(source);const actualNumber=Number(target.numbers[6].number);
    const actual=method.label==='合数单双'?heshuParity(actualNumber):parity(actualNumber);const hit=answer.prediction===actual;
    histories.push({sourcePeriod:source.period,targetPeriod:target.period,branches:[{name:method.name,calculation:answer.calculation,result:answer.prediction,targetPositions:hit?[7]:[]}],actualNumber:target.numbers[6].number,actualAnimal:target.numbers[6].animal,actualElement:target.numbers[6].element,hit,targetPositions:hit?[7]:[]});
  }
  const forecastSource=ordered.find(draw=>draw.period===requestedIssue-1)||ordered.at(-1)!;const forecast=evaluate(forecastSource);
  return {label:method.label,sourceKey:method.sourceKey,next:[forecast.prediction],recentStreak:histories.reduce((count,row)=>row.hit?count+1:0,0),recent30Hits:histories.slice(-30).filter(row=>row.hit).length,branches:[{name:method.name,next:forecast.prediction,calculation:forecast.calculation,sourcePositions:sourcePositions(method.baseName)}],history:histories.slice(-5),formulaId:method.rank};
}
