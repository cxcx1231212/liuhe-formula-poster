import { getLatestLottery, isLotteryType, type LotteryType } from '@/lib/lottery';
import LiveDraw from './LiveDraw';
import PingteBoard from './PingteBoard';
import one1 from '../public/generated/pingte-all/type-1-096-manifest.json';import one5 from '../public/generated/pingte-all/type-5-242-manifest.json';import one8 from '../public/generated/pingte-all/type-8-241-manifest.json';
import two1 from '../public/generated/pingte-two/type-1-096-manifest.json';import two5 from '../public/generated/pingte-two/type-5-242-manifest.json';import two8 from '../public/generated/pingte-two/type-8-241-manifest.json';
import TemaBoard from './TemaBoard';
import temaOne1 from '../data/tema/one-complete-type-1-2026.json';import temaOne5 from '../data/tema/one-complete-type-5-2026.json';import temaOne8 from '../data/tema/one-complete-type-8-2026.json';
import tema1 from '../public/generated/tema-bundles/type-1-095-manifest.json';import tema5 from '../public/generated/tema-bundles/type-5-241-manifest.json';import tema8 from '../public/generated/tema-bundles/type-8-241-manifest.json';
import ZodiacBoard from './ZodiacBoard';
import zodiac1 from '../public/generated/zodiac/type-1-095-manifest.json';import zodiac5 from '../public/generated/zodiac/type-5-241-manifest.json';import zodiac8 from '../public/generated/zodiac/type-8-241-manifest.json';
import FushiBoard from './FushiBoard';
import fushi1 from '../public/generated/fushi/type-1-095-manifest.json';import fushi5 from '../public/generated/fushi/type-5-241-manifest.json';import fushi8 from '../public/generated/fushi/type-8-241-manifest.json';
import DanshuangBoard from './DanshuangBoard';
import ds1 from '../public/generated/danshuang/type-1-095-manifest.json';import ds5 from '../public/generated/danshuang/type-5-241-manifest.json';import ds8 from '../public/generated/danshuang/type-8-241-manifest.json';
import WaveBoard from './WaveBoard';
import wave1 from '../public/generated/wave/type-1-095-manifest.json';import wave5 from '../public/generated/wave/type-5-241-manifest.json';import wave8 from '../public/generated/wave/type-8-241-manifest.json';
import WuxingBoard from './WuxingBoard';
import wx1 from '../public/generated/wuxing/type-1-096-manifest.json';import wx5 from '../public/generated/wuxing/type-5-242-manifest.json';import wx8 from '../public/generated/wuxing/type-8-241-manifest.json';
import JiayeBoard from './JiayeBoard';
import jy1 from '../public/generated/jiaye/type-1-095-manifest.json';import jy5 from '../public/generated/jiaye/type-5-241-manifest.json';import jy8 from '../public/generated/jiaye/type-8-241-manifest.json';
import KillBoard from './KillBoard';import kill1 from '../public/generated/kill/type-1-095-manifest.json';import kill5 from '../public/generated/kill/type-5-241-manifest.json';import kill8 from '../public/generated/kill/type-8-241-manifest.json';
import SizeBoard from './SizeBoard';import size1 from '../public/generated/size/type-1-095-manifest.json';import size5 from '../public/generated/size/type-5-241-manifest.json';import size8 from '../public/generated/size/type-8-241-manifest.json';
import TailHeadBoard from './TailHeadBoard';import tail1 from '../public/generated/tail/type-1-095-manifest.json';import tail5 from '../public/generated/tail/type-5-241-manifest.json';import tail8 from '../public/generated/tail/type-8-241-manifest.json';import head1 from '../public/generated/head/type-1-095-manifest.json';import head5 from '../public/generated/head/type-5-241-manifest.json';import head8 from '../public/generated/head/type-8-241-manifest.json';

const boards = [
  {name:'平特公式',tagline:'平码推演 · 特肖参考',posts:[
    ['239期','六合公式库【平特一肖】历史轨迹完整公开'],
    ['239期','六合公式库【平特一肖】平码尾数实战参考'],
    ['239期','六合公式库【平特一肖】连续命中规律分享'],
    ['239期','六合公式库【平特一肖】下期特肖重点参考'],
    ['239期','六合公式库【平特一肖】平码推演清晰易懂'],
    ['239期','六合公式库【平特一肖】合数公式逐期验证'],
    ['239期','六合公式库【平特一肖】精选公式稳定追踪'],
    ['239期','六合公式库【平特一肖】独家思路免费公开'],
    ['239期','六合公式库【平特一肖】七码总分规律解析'],
    ['239期','六合公式库【平特一肖】本期规律参考分享'],
    ['239期','六合公式库【平特二肖】双肖同时开轨迹公开'],
    ['239期','六合公式库【平特二肖】两条公式同步验证'],
    ['239期','六合公式库【平特二肖】平码特码全部计入'],
    ['239期','六合公式库【平特二肖】双支公式清楚易懂'],
    ['239期','六合公式库【平特二肖】历史同期开出参考'],
    ['239期','六合公式库【平特二肖】两肖组合重点分享'],
    ['239期','六合公式库【平特二肖】逐期双线轨迹整理'],
    ['239期','六合公式库【平特二肖】精选双肖免费公开'],
    ['239期','六合公式库【平特二肖】双肖规律手机大字图'],
    ['239期','六合公式库【平特二肖】本期两肖参考分享'],
  ]},
  {name:'特码公式',tagline:'号码规律 · 每期整理',posts:[['094期','本期特码延伸计算方法'],['093期','特码加减定位参考公式']]},
  {name:'生肖公式',tagline:'十二生肖 · 思路归档',posts:[['094期','七码对应生肖排列公式'],['093期','左右生肖组合推演方法']]},
  {name:'复式公式',tagline:'多组组合 · 灵活筛选',posts:[['094期','六组复式号码组合参考'],['093期','精简复式分组计算教程']]},
  {name:'单双公式',tagline:'单双走势 · 简明分析',posts:[['094期','七码单双分布计算公式'],['093期','特码单双转换参考方法']]},
  {name:'波色公式',tagline:'红蓝绿波 · 分类查找',posts:[['094期','三色波段加减计算方法'],['093期','七码波色比例整理']]},
  {name:'五行公式',tagline:'金木水火土 · 对照推演',posts:[['094期','号码五行相生推算公式'],['093期','七码五行属性对照表']]},
  {name:'家野公式',tagline:'家野分类 · 一目了然',posts:[['094期','家野生肖分类计算方法'],['093期','七码家野数量对照']]},
  {name:'绝杀公式',tagline:'排除思路 · 逐期记录',posts:[['094期','十大杀肖公式汇总'],['093期','上期特码加数杀肖法'],['092期','总分个位数排除公式']]},
  {name:'大小公式',tagline:'大小区间 · 快速对照',posts:[['094期','七码大小比例计算公式'],['093期','特码大小区间推演']]},
  {name:'尾数公式',tagline:'十组尾数 · 规律整理',posts:[['094期','七码尾数相加定位法'],['093期','十组尾数筛选公式']]},
  {name:'头数公式',tagline:'号码分段 · 清晰归类',posts:[['094期','七码头数分布计算'],['093期','零至四头筛选方法']]},
];

const lotteryNames: Record<LotteryType, string> = {'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
// 首页只需要生成帖子标题和链接。不要把每条公式的全年历史、取数轨迹等
// 大对象序列化给浏览器，否则手机首次打开会下载数 MB 的无用数据。
const compactMethods=(methods:any[]|undefined,keys:string[])=>(methods??[]).map(method=>Object.fromEntries(keys.map(key=>[key,method?.[key]])));
const compactGroups=(groups:Record<string,any>|undefined,keys:string[])=>Object.fromEntries(Object.entries(groups??{}).map(([key,group])=>[key,{label:group?.label,methods:compactMethods(group?.methods,keys)}]));
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query = await searchParams;
  const requestedType = typeof query.type === 'string' ? query.type : '5';
  const type: LotteryType = isLotteryType(requestedType) ? requestedType : '5';
  const latest = await getLatestLottery(type);
  const pick=<T,>(items:Record<LotteryType,T>)=>items[type];
  const one=pick({1:one1,5:one5,8:one8} as any) as any,two=pick({1:two1,5:two5,8:two8} as any) as any;
  const temaOne=pick({1:temaOne1,5:temaOne5,8:temaOne8} as any) as any,tema=pick({1:tema1,5:tema5,8:tema8} as any) as any;
  const zodiac=pick({1:zodiac1,5:zodiac5,8:zodiac8} as any) as any,fushi=pick({1:fushi1,5:fushi5,8:fushi8} as any) as any;
  const ds=pick({1:ds1,5:ds5,8:ds8} as any) as any,wave=pick({1:wave1,5:wave5,8:wave8} as any) as any,wx=pick({1:wx1,5:wx5,8:wx8} as any) as any;
  const jy=pick({1:jy1,5:jy5,8:jy8} as any) as any,kill=pick({1:kill1,5:kill5,8:kill8} as any) as any,size=pick({1:size1,5:size5,8:size8} as any) as any,tail=pick({1:tail1,5:tail5,8:tail8} as any) as any,head=pick({1:head1,5:head5,8:head8} as any) as any;
  return <main>
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="#boards">公式板块</a></nav></header>
    <section className="draw-hero">
      <div className="lottery-switch"><div>{(['5','1','8'] as LotteryType[]).map(value=><a className={value===type?'active':''} href={`/?type=${value}`} key={value}>{lotteryNames[value]}</a>)}</div></div>
      <LiveDraw initial={latest} type={type}/>
    </section>
    <section className="board-sections" id="boards">{boards.map((board,i)=><section className="board-section" key={board.name} id={`board-${board.name}`}>
      <header><span>{String(i+1).padStart(2,'0')}</span><h2>{board.name}</h2><i>{board.tagline}</i></header>
      {board.name==='平特公式'?<PingteBoard type={type} issue={one.issue} oneMethods={compactMethods(one.methods,['recentStreak'])} twoMethods={compactMethods(two.methods,['recentStreak'])}/>:board.name==='特码公式'?<TemaBoard type={type} issue={tema.issue} oneMethods={compactMethods(temaOne.qualifiedMethods,['recentStreak'])} groups={compactGroups(tema.groups,['recentStreak','sourceKey'])}/>:board.name==='生肖公式'?<ZodiacBoard type={type} issue={zodiac.issue} groups={compactGroups(zodiac.groups,['recentStreak','recent30Rate'])}/>:board.name==='复式公式'?<FushiBoard type={type} issue={fushi.issue} groups={compactGroups(fushi.groups,['rank','recentStreak','recent30Rate'])}/>:board.name==='单双公式'?<DanshuangBoard type={type} issue={ds.issue} methods={compactMethods(ds.methods,['rank','next','recentStreak','label'])}/>:board.name==='波色公式'?<WaveBoard type={type} issue={wave.issue} methods={compactMethods(wave.methods,['rank','next','recentStreak'])}/>:board.name==='五行公式'?<WuxingBoard type={type} issue={wx.issue} methods={compactMethods(wx.methods,['rank','label','next'])}/>:board.name==='家野公式'?<JiayeBoard type={type} issue={jy.issue} methods={compactMethods(jy.methods,['rank','next'])}/>:board.name==='绝杀公式'?<KillBoard type={type} issue={kill.issue} groups={compactGroups(kill.groups,['rank'])}/>:board.name==='大小公式'?<SizeBoard type={type} issue={size.issue} methods={compactMethods(size.methods,['rank'])}/>:board.name==='尾数公式'?<TailHeadBoard type={type} issue={tail.issue} methods={compactMethods(tail.methods,['rank','label'])} kind="tail"/>:board.name==='头数公式'?<TailHeadBoard type={type} issue={head.issue} methods={compactMethods(head.methods,['rank','label'])} kind="head"/>:null}
    </section>)}</section>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>
}
