import type {ZodiacDraw} from './zodiac-history';

export type WaveMethod={rank:string;label:string;sourceKey:string;name:string;baseName:string;operation:string;amount:number};
const RED=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const BLUE=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
const digitSum=(v:number)=>String(Math.abs(v)).split('').reduce((s,d)=>s+Number(d),0);
const wrap=(v:number)=>((Math.trunc(v)-1)%49+49)%49+1;
const wave=(v:number)=>RED.has(v)?'红波':BLUE.has(v)?'蓝波':'绿波';
const values=(d:ZodiacDraw)=>d.numbers.map(i=>Number(i.number));
const position=(n:string)=>n==='特码'?6:Number(n.match(/平([1-6])码/)?.[1]||1)-1;
const converted=(d:ZodiacDraw,l:string,k?:string)=>{const v=values(d)[position(l)]||0;return k==='合数'?digitSum(v):k==='尾数'?v%10:v;};
const baseValue=(d:ZodiacDraw,b:string):number=>{
  if(b==='最小平码'||b==='平码最小值')return Math.min(...values(d).slice(0,6));if(b==='最大平码'||b==='平码最大值')return Math.max(...values(d).slice(0,6));
  if(b==='六个平码总分'||b==='平码总分')return values(d).slice(0,6).reduce((a,c)=>a+c,0);if(b==='七码总分')return values(d).reduce((a,c)=>a+c,0);if(b==='期数合数')return digitSum(d.period);
  const p=b.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);if(p){const l=converted(d,p[1],p[2]),r=converted(d,p[4],p[5]);return p[3]==='＋'?l+r:l-r;}
  const s=b.match(/^(平[1-6]码|特码)(合数|尾数)?$/);return s?converted(d,s[1],s[2]):0;
};
const baseExpression=(d:ZodiacDraw,b:string)=>{const p=b.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);if(p)return `${String(converted(d,p[1],p[2])).padStart(2,'0')}${p[3]}${String(converted(d,p[4],p[5])).padStart(2,'0')}`;const s=b.match(/^(平[1-6]码|特码)(合数|尾数)?$/);return s?String(converted(d,s[1],s[2])).padStart(2,'0'):String(baseValue(d,b));};
const sourcePositions=(b:string)=>Array.from(new Set(Array.from(b.matchAll(/平([1-6])码|特码/g),m=>m[0]==='特码'?7:Number(m[1]))));

export function buildWavePosterItem(method:WaveMethod,draws:ZodiacDraw[],requestedIssue:number){
  const ordered=draws.slice().sort((a,b)=>a.period-b.period);const evaluate=(draw:ZodiacDraw)=>{const raw=Math.trunc(method.operation==='subtract'?baseValue(draw,method.baseName)-method.amount:baseValue(draw,method.baseName)+method.amount);const result=wrap(raw),prediction=wave(result),symbol=method.operation==='subtract'?'−':'+';const mapped=result!==raw?` → 对应号码${String(result).padStart(2,'0')}`:'';return {prediction,calculation:`${baseExpression(draw,method.baseName)}${symbol}${method.amount}=${raw}${mapped} → ${prediction}`};};
  const histories=[];for(let i=0;i<ordered.length-1;i++){const source=ordered[i],target=ordered[i+1];if(target.period>requestedIssue)continue;const answer=evaluate(source),actualNumber=Number(target.numbers[6].number),hit=answer.prediction===wave(actualNumber);histories.push({sourcePeriod:source.period,targetPeriod:target.period,branches:[{name:method.name,calculation:answer.calculation,result:answer.prediction,targetPositions:hit?[7]:[]}],actualNumber:target.numbers[6].number,actualAnimal:target.numbers[6].animal,actualElement:target.numbers[6].element,hit,targetPositions:hit?[7]:[]});}
  const forecastSource=ordered.find(d=>d.period===requestedIssue-1)||ordered.at(-1)!;const forecast=evaluate(forecastSource);return {label:method.label,sourceKey:method.sourceKey,next:[forecast.prediction],recentStreak:histories.reduce((count,row)=>row.hit?count+1:0,0),recent30Hits:histories.slice(-30).filter(row=>row.hit).length,branches:[{name:method.name,next:forecast.prediction,calculation:forecast.calculation,sourcePositions:sourcePositions(method.baseName)}],history:histories.slice(-5),formulaId:method.rank};
}
// Display-only wave name. Invalid or missing numbers must not look like green-wave numbers.
export function lotteryWaveColor(value: string | number): 'red' | 'blue' | 'green' | 'neutral' {
  const number = Number(value);
  if (!String(value).trim() || !Number.isInteger(number) || number < 1 || number > 49) return 'neutral';
  return RED.has(number) ? 'red' : BLUE.has(number) ? 'blue' : 'green';
}
