type Cell={number:string;animal:string;element:string};
export type FushiDraw={period:number;displayPeriod?:string;date?:string;numbers:Cell[]};
type RawBranch={name:string;number?:number;animal?:string};
export type FushiMethod={rank:string;sourceKey:string;branches:RawBranch[];recentStreak?:number;recent30Hits?:number};

const animals=['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
const digitSum=(value:number)=>String(Math.abs(value)).split('').reduce((sum,digit)=>sum+Number(digit),0);
const wrap=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
const values=(draw:FushiDraw)=>draw.numbers.map(item=>Number(item.number));
const cellValue=(draw:FushiDraw,label:string)=>values(draw)[label==='特码'?6:Number(label.match(/平([1-6])码/)?.[1]||1)-1]||0;
const formatNumber=(value:number)=>value>=0&&value<10?String(value).padStart(2,'0'):String(value);
const baseDetails=(draw:FushiDraw,base:string):{value:number;expression:string}=>{
  if(base==='最小平码'){const value=Math.min(...values(draw).slice(0,6));return {value,expression:formatNumber(value)};}
  if(base==='最大平码'){const value=Math.max(...values(draw).slice(0,6));return {value,expression:formatNumber(value)};}
  if(base==='六个平码总分'){const value=values(draw).slice(0,6).reduce((a,b)=>a+b,0);return {value,expression:String(value)};}
  if(base==='七码总分'){const value=values(draw).reduce((a,b)=>a+b,0);return {value,expression:String(value)};}
  if(base==='期数合数'){const value=digitSum(draw.period);return {value,expression:String(value)};}
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair){
    const convert=(label:string,kind?:string)=>{const value=cellValue(draw,label);return kind==='合数'?digitSum(value):kind==='尾数'?value%10:value;};
    const left=convert(pair[1],pair[2]),right=convert(pair[4],pair[5]);
    return {value:pair[3]==='＋'?left+right:left-right,expression:`${formatNumber(left)}${pair[3]}${formatNumber(right)}`};
  }
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  if(single){const source=cellValue(draw,single[1]);const value=single[2]==='合数'?digitSum(source):single[2]==='尾数'?source%10:source;return {value,expression:formatNumber(value)};}
  return {value:0,expression:'00'};
};
const parse=(name:string)=>{
  const match=name.match(/^(.*?)(加|减|乘|除)(\d+)(取整|余数)?$/);
  return {base:match?.[1]||name,operation:match?.[2]||'加',amount:Number(match?.[3]||0),suffix:match?.[4]||''};
};
const evaluate=(draw:FushiDraw,name:string)=>{
  const definition=parse(name),baseDetailsValue=baseDetails(draw,definition.base),base=baseDetailsValue.value;
  const raw=definition.operation==='加'?base+definition.amount:definition.operation==='减'?base-definition.amount:definition.operation==='乘'?base*definition.amount:definition.suffix==='余数'?base%definition.amount:Math.trunc(base/definition.amount);
  const result=wrap(raw),animal=animals[(result-1)%12];
  const symbol=definition.operation==='加'?'+':definition.operation==='减'?'−':definition.operation==='乘'?'×':definition.suffix==='余数'?'÷余':'÷整';
  return {number:result,animal,calculation:`${baseDetailsValue.expression}${symbol}${definition.amount}=${formatNumber(result)}属${animal}`};
};
const sourcePositions=(name:string)=>Array.from(name.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?6:Number(match[1])-1);

export function buildFushiPosterItem(method:FushiMethod,draws:FushiDraw[],requestedIssue:number,kind:'number'|'animal',required:number,label:string){
  const ordered=draws.slice().sort((a,b)=>a.period-b.period);
  const histories=[];
  for(let index=0;index<ordered.length-1;index++){
    const source=ordered[index],target=ordered[index+1];if(target.period>requestedIssue)continue;
    const evaluated=method.branches.map(branch=>evaluate(source,branch.name));
    const targetNumbers=target.numbers.slice(0,6);
    const uniquePredictions=new Set(evaluated.map(item=>kind==='number'?String(item.number):item.animal));
    const matched=[...uniquePredictions].filter(value=>targetNumbers.some(cell=>kind==='number'?Number(cell.number)===Number(value):cell.animal===value));
    const hit=matched.length>=required;
    histories.push({sourcePeriod:source.period,targetPeriod:target.period,branches:evaluated.map((item,branchIndex)=>({name:method.branches[branchIndex].name,calculation:item.calculation,result:kind==='number'?String(item.number).padStart(2,'0'):item.animal,targetPositions:targetNumbers.map((cell,pos)=>((kind==='number'?Number(cell.number)===item.number:cell.animal===item.animal)?pos+1:0)).filter(Boolean)})),actualNumber:target.numbers[6].number,actualAnimal:target.numbers[6].animal,actualElement:target.numbers[6].element,hit,targetPositions:targetNumbers.map((cell,pos)=>(matched.some(value=>kind==='number'?Number(value)===Number(cell.number):value===cell.animal)?pos+1:0)).filter(Boolean)});
  }
  const source=ordered.find(draw=>draw.period===requestedIssue-1)||ordered.at(-1)!;
  const forecast=method.branches.map(branch=>evaluate(source,branch.name));
  return {label,sourceKey:method.sourceKey,next:forecast.map(item=>kind==='number'?String(item.number).padStart(2,'0'):item.animal),recentStreak:method.recentStreak||0,recent30Hits:method.recent30Hits||0,branches:method.branches.map((branch,index)=>({name:branch.name,next:kind==='number'?String(forecast[index].number).padStart(2,'0'):forecast[index].animal,calculation:forecast[index].calculation,sourcePositions:sourcePositions(branch.name)})),history:histories.slice(-5),formulaId:`FUSHI-${method.rank}`};
}
