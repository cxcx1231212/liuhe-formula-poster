import {NextRequest} from 'next/server';
import {getHomeBoardRecommendation,type HomeBoardKey} from '@/lib/home-board-data';

const boards=new Set<HomeBoardKey>(['pingte','tema','zodiac','fushi','danshuang','wave','wuxing','jiaye','kill','size','tail','head']);
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const reds=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const blues=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
const color=(value:unknown)=>reds.has(Number(value))?'#e13b43':blues.has(Number(value))?'#3d91d2':'#43aa55';
const prediction=(value:unknown)=>Array.isArray(value)?value.join('、'):value&&typeof value==='object'?Object.values(value as Record<string,unknown>).flat().join('、'):String(value??'待更新');
const sourcePositions=(formula:string)=>Array.from(formula.matchAll(/平([1-6])码|特码/g),match=>match[1]?Number(match[1]):7);
const operation=(formula:string)=>{const match=formula.match(/(?:交替)?(加|减)(\d+)/);return match?`${match[1]}${match[2]}`:'公式推算';};

export async function GET(request:NextRequest){
  const lotteryType=request.nextUrl.searchParams.get('lotteryType')??'5';
  const board=request.nextUrl.searchParams.get('board') as HomeBoardKey;
  const category=request.nextUrl.searchParams.get('category')??'';
  if(!['1','5','8'].includes(lotteryType)||!boards.has(board))return new Response('Invalid request',{status:400});
  const item=await getHomeBoardRecommendation(lotteryType as '1'|'5'|'8',board,category);
  if(!item.formula)return new Response('Recommendation not found',{status:404});
  const draws=(item.draws as any[]).slice(-4);
  const positions=sourcePositions(item.formula);
  const xs=[108,188,268,348,428,508,608];
  const ball=(number:unknown,animal:unknown,x:number,y:number,active=false)=>`<g opacity="${active?1:.38}"><circle cx="${x}" cy="${y}" r="21" fill="#fff" stroke="${active?'#bd0710':color(number)}" stroke-width="${active?4:3}"/><text x="${x}" y="${y+7}" text-anchor="middle" class="num">${esc(String(number).padStart(2,'0'))}</text><text x="${x}" y="${y+42}" text-anchor="middle" class="animal">${esc(animal)}</text></g>`;
  const rows=draws.map((draw,rowIndex)=>{
    const y=170+rowIndex*88,nums=draw.numbers??[],selected=positions.length?positions:[1];
    const balls=nums.map((entry:any,index:number)=>ball(entry.number,entry.animal,xs[index],y,selected.includes(index+1))).join('');
    const start=xs[selected[0]-1]??xs[0],end=xs[6],labelX=Math.min(start+136,526);
    return `<g><rect x="0" y="${y-44}" width="750" height="88" fill="${rowIndex%2?'#fafafa':'#f5f5f5'}"/><line x1="0" y1="${y+44}" x2="750" y2="${y+44}" stroke="#ddd"/><text x="39" y="${y-4}" text-anchor="middle" class="period">${esc(String(draw.period).padStart(3,'0'))}期</text><text x="39" y="${y+20}" text-anchor="middle" class="date">${esc(String(draw.date??'').replace(/年|月/g,'-').replace('日',''))}</text>${balls}<path d="M${start+22} ${y-3} L${end-24} ${y-3}" stroke="#c90008" stroke-width="2.5" marker-end="url(#arrow)"/><rect x="${labelX-56}" y="${y-27}" width="112" height="31" rx="15" fill="#c90008"/><text x="${labelX}" y="${y-6}" text-anchor="middle" class="op">${esc(operation(item.formula))}</text></g>`;
  }).join('');
  const next=prediction(item.prediction);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="750" height="520" viewBox="0 0 750 520"><style>.head{font:700 18px Arial,'Microsoft YaHei',sans-serif;fill:#111}.period{font:700 18px Arial,'Microsoft YaHei',sans-serif;fill:#f04b23}.date{font:12px Arial,'Microsoft YaHei',sans-serif;fill:#333}.num{font:700 18px Arial,sans-serif;fill:#222}.animal{font:17px Arial,'Microsoft YaHei',sans-serif;fill:#555}.op{font:700 18px Arial,'Microsoft YaHei',sans-serif;fill:#fff}</style><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c90008"/></marker></defs><rect width="750" height="520" fill="#fff"/><g class="head" text-anchor="middle"><text x="39" y="29">期号</text><text x="108" y="29">平1码</text><text x="188" y="29">平2码</text><text x="268" y="29">平3码</text><text x="348" y="29">平4码</text><text x="428" y="29">平5码</text><text x="508" y="29">平6码</text><text x="608" y="29">特码</text></g><line x1="0" y1="43" x2="750" y2="43" stroke="#bbb"/><rect x="0" y="44" width="750" height="82" fill="#fff" stroke="#ff8d75"/><text x="39" y="76" text-anchor="middle" class="period">${esc(String(item.issue).padStart(3,'0'))}期</text><text x="39" y="99" text-anchor="middle" class="date">下期预测</text><text x="370" y="91" text-anchor="middle" style="font:700 25px Arial,'Microsoft YaHei',sans-serif;fill:#d71920">${esc(next)}</text>${rows}<text x="375" y="302" text-anchor="middle" transform="rotate(-32 375 302)" style="font:700 52px Arial,sans-serif;fill:#75869a;opacity:.09;letter-spacing:8px">123LH.COM</text></svg>`;
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300','Access-Control-Allow-Origin':'*'}});
}
