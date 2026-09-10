type Cell={number:string;animal:string;element:string};
export type FushiDraw={period:number;displayPeriod?:string;date?:string;numbers:Cell[]};
type RawBranch={name:string;baseName?:string;operation?:string;amount?:number;number?:number;animal?:string};
export type FushiMethod={expansionSize?:number;activationIssue?:number;expansionActive?:boolean;formulaId?:string;rank:string;sourceKey:string;branches:RawBranch[];recentStreak?:number;recent30Hits?:number};

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
const parse=(input:string|RawBranch)=>{
  const name=typeof input==='string'?input:input.name;
  if(typeof input!=='string'&&input.baseName&&input.operation&&typeof input.amount==='number'){
    const operation={add:'加',subtract:'减',alternate_add_subtract:'交替',double_alternate_add_subtract:'双期交替',triple_alternate_add_subtract:'三期交替',asymmetric_alternate:'不对称',cyclic_step:'循环',multiply:'乘',divide_floor:'除',modulo:'除'}[input.operation]??input.operation;
    return {base:input.baseName.replace('特码码','特码').replace(/固定$/,''),operation,amount:input.operation==='asymmetric_alternate'?Math.trunc(input.amount/100):input.amount,secondary:input.operation==='asymmetric_alternate'?input.amount%100:0,suffix:input.operation==='modulo'?'余数':input.operation==='divide_floor'?'取整':''};
  }
  const asymmetric=name.match(/^(.*?)不对称交替加(\d+)减(\d+)$/);
  if(asymmetric)return {base:asymmetric[1].replace('特码码','特码').replace(/固定$/,''),operation:'不对称',amount:Number(asymmetric[2]),secondary:Number(asymmetric[3]),suffix:''};
  const cycle=name.match(/^(.*?)循环步长(\d+)$/);
  if(cycle)return {base:cycle[1].replace('特码码','特码').replace(/固定$/,''),operation:'循环',amount:Number(cycle[2]),secondary:0,suffix:''};
  const alternating=name.match(/^(.*?)(双期|三期)?交替加减(\d+)$/);
  if(alternating)return {base:alternating[1].replace('特码码','特码').replace(/固定$/,''),operation:alternating[2]==='双期'?'双期交替':alternating[2]==='三期'?'三期交替':'交替',amount:Number(alternating[3]),secondary:0,suffix:''};
  const match=name.match(/^(.*?)(加|减|乘|除)(\d+)(取整|余数)?$/);
  return {base:(match?.[1]||name).replace('特码码','特码').replace(/固定$/,''),operation:match?.[2]||'加',amount:Number(match?.[3]||0),secondary:0,suffix:match?.[4]||''};
};
const evaluate=(draw:FushiDraw,input:string|RawBranch,useExpandedWrap=false)=>{
  const definition=parse(input),baseDetailsValue=baseDetails(draw,definition.base),base=baseDetailsValue.value;
  const direction=definition.operation==='交替'?(draw.period%2?1:-1):definition.operation==='双期交替'?((Math.floor((draw.period-1)/2)%2===0)?1:-1):definition.operation==='三期交替'?((Math.floor((draw.period-1)/3)%2===0)?1:-1):0;const delta=definition.operation==='不对称'?(draw.period%2?definition.amount:-definition.secondary):definition.operation==='循环'?((draw.period-1)%3+1)*definition.amount:direction*definition.amount;const raw=definition.operation==='加'?base+definition.amount:definition.operation==='减'?base-definition.amount:definition.operation==='不对称'||definition.operation==='循环'||direction?base+delta:definition.operation==='乘'?base*definition.amount:definition.suffix==='余数'?(useExpandedWrap?((base%definition.amount)+definition.amount)%definition.amount:base%definition.amount):Math.trunc(base/definition.amount);
  const result=useExpandedWrap?expandedWrap(raw):wrap(raw),animal=animals[(result-1)%12];
  const symbol=definition.operation==='加'?'+':definition.operation==='减'?'−':definition.operation==='不对称'||definition.operation==='循环'?(delta>=0?'+':'−'):direction?(direction>0?'+':'−'):definition.operation==='乘'?'×':definition.suffix==='余数'?'÷余':'÷整';
  const shown=definition.operation==='不对称'||definition.operation==='循环'?Math.abs(delta):definition.amount;return {number:result,animal,calculation:`${baseDetailsValue.expression}${symbol}${shown}=${formatNumber(result)}属${animal}`};
};
const sourcePositions=(name:string)=>Array.from(name.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?6:Number(match[1])-1);


// fushi-8-10-v1: a fixed, prior-draw-only expansion; never applied retroactively.
const expandedWrap=(value:number)=>{let n=Math.trunc(value);while(n>49)n-=12;while(n<1)n+=12;return n;};
const selectBranches=(method:FushiMethod,source:FushiDraw,targetPeriod:number,kind:string)=>{
  const active=kind==='number'&&method.expansionSize&&targetPeriod>=(method.activationIssue||Infinity);
  const original=method.branches.map(branch=>({...evaluate(source,branch,!!active),name:branch.name}));
  if(!active)return original;
  if(source.numbers.length!==7)throw new Error('Incomplete expansion source');
  const result:typeof original=[],seen=new Set<number>();
  const add=(name:string)=>{const value={...evaluate(source,name,true),name};if(!seen.has(value.number)){seen.add(value.number);result.push(value);}};
  for(const branch of original)if(!seen.has(branch.number)){seen.add(branch.number);result.push(branch);}
  for(let amount=1;amount<=49&&result.length<method.expansionSize!;amount++){
    for(let position=1;position<=7&&result.length<method.expansionSize!;position++)add(`${position===7?'特码':`平${position}码`}加${amount}`);
  }
  if(result.length!==method.expansionSize)throw new Error('Incorrect expanded pool size');
  return result;
};

export function buildFushiPosterItem(method:FushiMethod,draws:FushiDraw[],requestedIssue:number,kind:'number'|'animal',required:number,label:string){
  const displayCalculation=(item:ReturnType<typeof evaluate>)=>kind==='number'?item.calculation.replace(/属[^属]+$/,''):item.calculation;
  const ordered=draws.slice().sort((a,b)=>a.period-b.period);
  const histories=[];
  for(let index=0;index<ordered.length-1;index++){
    const source=ordered[index],target=ordered[index+1];if(target.period>requestedIssue||target.period!==source.period+1||source.numbers.length!==7||target.numbers.length!==7)continue;
    if(kind==='number'&&method.expansionSize&&requestedIssue>=(method.activationIssue||Infinity)&&target.period<method.activationIssue!)continue;
    const evaluated=selectBranches(method,source,target.period,kind);
    const targetNumbers=target.numbers.slice(0,6);
    const uniquePredictions=new Set(evaluated.map(item=>kind==='number'?String(item.number):item.animal));
    const matched=[...uniquePredictions].filter(value=>targetNumbers.some(cell=>kind==='number'?Number(cell.number)===Number(value):cell.animal===value));
    const hit=matched.length>=required;
    histories.push({sourcePeriod:source.period,targetPeriod:target.period,branches:evaluated.map((item,branchIndex)=>({name:item.name,sourcePositions:Array.from(item.name.matchAll(/平([1-6])码|特码/g),m=>m[0]==='特码'?7:Number(m[1])),calculation:displayCalculation(item),result:kind==='number'?String(item.number).padStart(2,'0'):item.animal,targetPositions:targetNumbers.map((cell,pos)=>((kind==='number'?Number(cell.number)===item.number:cell.animal===item.animal)?pos+1:0)).filter(Boolean)})),actualNumber:target.numbers[6].number,actualAnimal:target.numbers[6].animal,actualElement:target.numbers[6].element,hit,targetPositions:targetNumbers.map((cell,pos)=>(matched.some(value=>kind==='number'?Number(value)===Number(cell.number):value===cell.animal)?pos+1:0)).filter(Boolean)});
  }
  const source=ordered.find(draw=>draw.period===requestedIssue-1)||ordered.at(-1)!;
  const forecast=selectBranches(method,source,requestedIssue,kind);
  return {label:kind==='number'&&method.expansionSize&&requestedIssue>=(method.activationIssue||Infinity)?`${label}【${method.expansionSize===8?'八码':'十码'}复式】`:label,sourceKey:method.sourceKey.replace(/【(?:8|10)码扩展v1】/g,''),next:forecast.map(item=>kind==='number'?String(item.number).padStart(2,'0'):item.animal),recentStreak:method.recentStreak||0,recent30Hits:method.recent30Hits||0,branches:forecast.map((branch,index)=>({name:branch.name,next:kind==='number'?String(forecast[index].number).padStart(2,'0'):forecast[index].animal,calculation:displayCalculation(forecast[index]),sourcePositions:kind==='number'&&method.expansionSize&&requestedIssue>=(method.activationIssue||Infinity)?Array.from(branch.name.matchAll(/平([1-6])码|特码/g),m=>m[0]==='特码'?7:Number(m[1])):sourcePositions(branch.name)})),history:histories.slice(-5),formulaId:method.formulaId||`FUSHI-${method.rank}`};
}
