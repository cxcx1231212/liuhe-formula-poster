import {NextRequest} from 'next/server';
import {getHomeBoardRecommendation,type HomeBoardKey} from '@/lib/home-board-data';

const boards=new Set<HomeBoardKey>(['pingte','tema','zodiac','fushi','danshuang','wave','wuxing','jiaye','kill','size','tail','head']);
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const display=(value:unknown)=>{
  if(Array.isArray(value))return value.join('、');
  if(value&&typeof value==='object')return Object.values(value as Record<string,unknown>).flat().join('、');
  return String(value??'待更新');
};

export async function GET(request:NextRequest){
  const lotteryType=request.nextUrl.searchParams.get('lotteryType')??'5';
  const board=request.nextUrl.searchParams.get('board') as HomeBoardKey;
  const category=request.nextUrl.searchParams.get('category')??'';
  const cardName=request.nextUrl.searchParams.get('cardName')??'公式推荐';
  if(!['1','5','8'].includes(lotteryType)||!boards.has(board))return new Response('Invalid request',{status:400});
  const item=await getHomeBoardRecommendation(lotteryType as '1'|'5'|'8',board,category);
  if(!item.formula)return new Response('Recommendation not found',{status:404});
  const prediction=display(item.prediction);
  const predictionSize=prediction.length>25?22:prediction.length>14?27:34;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="520" viewBox="0 0 420 520">
    <rect width="420" height="520" rx="18" fill="#eef5ff"/>
    <rect x="10" y="10" width="400" height="500" rx="15" fill="#fff" stroke="#9fc4ef" stroke-width="2"/>
    <rect x="10" y="10" width="400" height="72" rx="15" fill="#1768bd"/>
    <path d="M10 65h400v17H10z" fill="#1768bd"/>
    <text x="210" y="54" text-anchor="middle" fill="#fff" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="28" font-weight="700">${esc(cardName)}</text>
    <text x="210" y="123" text-anchor="middle" fill="#245d9f" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="22" font-weight="700">第${esc(item.issue)}期 · ${esc(item.title?.match(/【([^】]+)】/)?.[1]??'公式推荐')}</text>
    <line x1="34" y1="148" x2="386" y2="148" stroke="#d5e4f5"/>
    <text x="210" y="193" text-anchor="middle" fill="#60758e" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="18">当期推荐</text>
    <foreignObject x="32" y="215" width="356" height="120"><div xmlns="http://www.w3.org/1999/xhtml" style="height:120px;display:flex;align-items:center;justify-content:center;text-align:center;color:#d5222a;font:bold ${predictionSize}px Arial,'Microsoft YaHei',sans-serif;line-height:1.45;overflow:hidden">${esc(prediction)}</div></foreignObject>
    <rect x="45" y="355" width="330" height="60" rx="12" fill="#edf5ff"/>
    <text x="210" y="393" text-anchor="middle" fill="#1768bd" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="23" font-weight="700">近期连中 ${esc(item.recentStreak)} 期</text>
    <text x="210" y="456" text-anchor="middle" fill="#718399" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="16">公式：${esc(item.formula)}</text>
    <text x="210" y="487" text-anchor="middle" fill="#a4b2c2" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="13">123六合网 · 当期内容自动更新</text>
  </svg>`;
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300','Access-Control-Allow-Origin':'*'}});
}
