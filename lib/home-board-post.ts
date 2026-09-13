import {postAuthor} from '@/lib/post-authors';
import type {BoardPost} from '@/app/BoardPostList';
const pad=(v:number|string)=>String(v).padStart(3,'0');
const labels:Record<string,string>={
 'pingte:one':'平特一肖','pingte:two':'平特二肖',
 'tema:3':'三码中特','tema:8':'八码中特','tema:10':'十码中特','tema:18':'十八码中特',
 'zodiac:1':'一肖中特','zodiac:3':'三肖中特','zodiac:6':'六肖中特','zodiac:9':'九肖中特',
 'fushi:22':'二中二八码复式','fushi:33':'三中三十码复式','fushi:2x':'二连肖','fushi:3x':'三连肖',
 'danshuang:':'特码单双','wave:':'特码波色','wuxing:':'特码五行','jiaye:':'家野中特',
 'kill:code':'杀码','kill:animal':'杀肖','kill:tail':'杀尾','kill:head':'杀头','kill:wave':'杀波',
 'size:':'特码大小','tail:':'尾数中特','head:':'头数中特',
};
function firstText(value:unknown){return typeof value==='string'&&value.trim()?value.trim():'';}
export function makeHomeBoardPost(type:string,board:string,category:string,issue:number,m:Record<string,unknown>,index:number):BoardPost{
 index=typeof m.sourceIndex==='number'?m.sourceIndex:index;
 const q=`?type=${type}`,rank=String(m.rank??pad(index+1)),i=`${issue}期`;
 const key=board==='pingte'?`pingte:${category==='two'?'two':'one'}`:`${board}:${category}`;
 const label=labels[key]||firstText(m.label)||'公式';
 const authorBoard=board==='pingte'?(category==='two'?'pingte2':'pingte'):board==='tema'?`tema${category}`:board==='zodiac'?`zodiac${category}`:board==='fushi'?`fushi${category}`:board==='kill'?`kill${category}`:board;
 const streak=Number(m.recentStreak??m.streak??0);
 const streakText=Number.isFinite(streak)&&streak>0?`连准${Math.trunc(streak)}期`:'近期验证中';
 const title=`${postAuthor(type,authorBoard as never,index)}【${label}】${streakText}`;
 if(board==='pingte')return {issue:i,href:`/posts/${category==='two'?'pingte2':'pingte'}/${issue}/${pad(index+1)}${q}`,title};
 if(board==='tema'||board==='zodiac')return {issue:i,href:`/posts/${board}/${category}/${issue}/${pad(index+1)}${q}`,title};
 if(board==='fushi'||board==='kill')return {issue:i,href:`/posts/${board}/${category}/${issue}/${rank}${q}`,title};
 return {issue:i,href:`/posts/${board}/${issue}/${rank}${q}`,title};
}
