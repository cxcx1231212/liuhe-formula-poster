export function explainSource(draw, base) {
  const ns=draw.numbers.map(cell=>Number(cell.number));
  const fmt=n=>String(n).padStart(2,'0');
  const sum=n=>String(Math.abs(n)).split('').reduce((a,b)=>a+Number(b),0);
  const single=base.match(/^(平[1-6]码|特码)(合数|尾数)?$/);
  if(single){const position=single[1]==='特码'?7:Number(single[1][1]),n=ns[position-1];return {expression:fmt(n)+(single[2]==='合数'?`合${sum(n)}`:single[2]==='尾数'?`尾${n%10}`:''),positions:[position]};}
  const pair=base.match(/^(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?$/);
  if(pair){const a=explainSource(draw,pair[1]+(pair[2]||'')),b=explainSource(draw,pair[4]+(pair[5]||''));return {expression:a.expression+pair[3]+b.expression,positions:[...a.positions,...b.positions]};}
  if(base==='期数合数')return {expression:`${draw.period}期：${String(draw.period).split('').join('＋')}＝${sum(draw.period)}`,positions:[]};
  if(['六个平码总分','平码总分','七码总分'].includes(base)){const count=base==='七码总分'?7:6;return {expression:ns.slice(0,count).map(fmt).join('＋'),positions:Array.from({length:count},(_,i)=>i+1)};}
  if(['最小平码','平码最小值','最大平码','平码最大值'].includes(base)){const n=base.includes('最小')?Math.min(...ns.slice(0,6)):Math.max(...ns.slice(0,6));return {expression:`${base}：${fmt(n)}`,positions:ns.slice(0,6).flatMap((v,i)=>v===n?[i+1]:[])};}
  throw new Error('Unsupported source explanation: '+base);
}
