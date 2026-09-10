type NumberCell={number:string;animal:string;element:string};
export type ZodiacDraw={period:number;displayPeriod?:string;date?:string;numbers:NumberCell[]};
export type ZodiacBranch={name:string;baseName?:string;operation?:string;amount?:number;number?:number;animal?:string};
export type ZodiacMethod={name?:string;baseName?:string;operation?:string;amount?:number;nextNumber?:number;nextAnimal?:string;sourceKey?:string;branches?:ZodiacBranch[];recentStreak?:number;recent30Rate?:number};

const digitSum=(value:number)=>String(Math.abs(value)).split('').reduce((sum,digit)=>sum+Number(digit),0);
const wrap=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
const animals=['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
const values=(draw:ZodiacDraw)=>draw.numbers.map(item=>Number(item.number));
const pos=(name:string)=>name==='特码'?6:Number(name.match(/平([1-6])码/)?.[1]||1)-1;
const cellValue=(draw:ZodiacDraw,label:string)=>values(draw)[pos(label)]||0;
const baseValue=(draw:ZodiacDraw,base:string):number=>{
  if(base==='最小平码')return Math.min(...values(draw).slice(0,6));
  if(base==='最大平码')return Math.max(...values(draw).slice(0,6));
  if(base==='六个平码总分')return values(draw).slice(0,6).reduce((a,b)=>a+b,0);
  if(base==='七码总分')return values(draw).reduce((a,b)=>a+b,0);
  if(base==='期数合数')return digitSum(draw.period);
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair){
    const convert=(label:string,kind?:string)=>{const value=cellValue(draw,label);return kind==='合数'?digitSum(value):kind==='尾数'?value%10:value};
    const left=convert(pair[1],pair[2]),right=convert(pair[4],pair[5]);
    return pair[3]==='＋'?left+right:left-right;
  }
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  if(single){const value=cellValue(draw,single[1]);return single[2]==='合数'?digitSum(value):single[2]==='尾数'?value%10:value;}
  return 0;
};
const alternatingDirection=(operation:string,period:number)=>operation==='alternate_add_subtract'?(period%2?1:-1):operation==='double_alternate_add_subtract'?((Math.floor((period-1)/2)%2===0)?1:-1):operation==='triple_alternate_add_subtract'?((Math.floor((period-1)/3)%2===0)?1:-1):0;
const calculate=(base:number,operation:string,amount:number,period:number)=>operation==='add'?base+amount:operation==='subtract'?base-amount:alternatingDirection(operation,period)?base+alternatingDirection(operation,period)*amount:operation==='multiply'?base*amount:operation==='divide_floor'?Math.trunc(base/amount):operation==='modulo'?base%amount:base;
const symbol=(operation:string,period:number)=>operation==='add'?'+':operation==='subtract'?'−':alternatingDirection(operation,period)?(alternatingDirection(operation,period)>0?'+':'−'):operation==='multiply'?'×':operation==='divide_floor'?'÷取整':'÷余数';
const sourcePositions=(base:string)=>Array.from(base.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?6:Number(match[1])-1);
const baseExpression=(draw:ZodiacDraw,base:string)=>{
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair){
    const display=(label:string,kind?:string)=>{const value=cellValue(draw,label);return kind==='合数'?digitSum(value):kind==='尾数'?value%10:value;};
    return `${String(display(pair[1],pair[2])).padStart(2,'0')}${pair[3]}${String(display(pair[4],pair[5])).padStart(2,'0')}`;
  }
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  if(single){const value=cellValue(draw,single[1]);const shown=single[2]==='合数'?digitSum(value):single[2]==='尾数'?value%10:value;return String(shown).padStart(2,'0');}
  return String(baseValue(draw,base));
};

export function buildZodiacPosterItem(method:ZodiacMethod,draws:ZodiacDraw[],requestedIssue:number){
  const definitions:ZodiacBranch[]=(method.branches?.length?method.branches:[{name:method.name||'',baseName:method.baseName,operation:method.operation,amount:method.amount,number:method.nextNumber,animal:method.nextAnimal}]);
  const ordered=draws.slice().sort((a,b)=>a.period-b.period);
  const evaluate=(definition:ZodiacBranch,draw:ZodiacDraw)=>{
    const base=baseValue(draw,definition.baseName||'');const raw=calculate(base,definition.operation||'',definition.amount||0,draw.period);const result=wrap(raw);
    const animal=animals[(result-1)%12];
    return {result,animal,calculation:`${baseExpression(draw,definition.baseName||'')}${symbol(definition.operation||'',draw.period)}${definition.amount}=${String(result).padStart(2,'0')}属${animal}`};
  };
  const histories=[];
  for(let index=0;index<ordered.length-1;index++){
    const source=ordered[index],target=ordered[index+1];if(target.period>requestedIssue)continue;
    const branches=definitions.map(definition=>{const answer=evaluate(definition,source);return {name:definition.name,calculation:answer.calculation,result:answer.animal};});
    const actual=target.numbers[6];const hit=branches.some(branch=>branch.result===actual.animal);
    histories.push({sourcePeriod:source.period,targetPeriod:target.period,branches,actualNumber:actual.number,actualAnimal:actual.animal,actualElement:actual.element,hit});
  }
  const forecastSource=ordered.find(draw=>draw.period===requestedIssue-1)||ordered.at(-1)!;
  const forecast=definitions.map(definition=>evaluate(definition,forecastSource));
  return {
    label:`${definitions.length}肖`,sourceKey:method.sourceKey||definitions[0]?.baseName||method.name||'生肖公式',
    next:forecast.map(item=>item.animal),recentStreak:method.recentStreak||0,recent30Hits:Math.round((method.recent30Rate||0)*30),
    branches:definitions.map((definition,index)=>({name:definition.name,next:forecast[index].animal,calculation:forecast[index].calculation,sourcePositions:sourcePositions(definition.baseName||'')})),
    history:histories.slice(-5),formulaId:'',
  };
}
