import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import macau239 from '../../../../../public/generated/pingte-two/type-5-239-manifest.json';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';

const sumDigits=(value:number)=>String(Math.abs(value)).split('').reduce((sum,char)=>sum+Number(char),0);
const wrap=(value:number)=>{while(value>49)value-=12;while(value<1)value+=12;return value};
const positions=(name:string)=>Array.from(name.matchAll(/平([1-6])/g),match=>Number(match[1])-1);
function targetPosition(draw:any,predictedNumber:number,predictedAnimal:string){
  const numbers=draw?.numbers||[];
  const exact=numbers.findIndex((value:any)=>Number(value.number)===Number(predictedNumber));
  if(exact>=0)return [exact+1];
  const sameAnimal=numbers.map((value:any,position:number)=>({value,position})).filter(({value}:any)=>value.animal===predictedAnimal).sort((a:any,b:any)=>Math.abs(Number(a.value.number)-predictedNumber)-Math.abs(Number(b.value.number)-predictedNumber));
  return sameAnimal.length?[sameAnimal[0].position+1]:[];
}
function calculate(name:string,draw:any,result:number){
  const values=(draw?.numbers||[]).map((row:any)=>Number(row.number));let match=name.match(/平(\d)码固定(加|减)(\d+)/);
  if(match){const value=values[Number(match[1])-1],amount=Number(match[3]);return String(value).padStart(2,'0')+(match[2]==='加'?'＋':'－')+amount+'＝'+String(wrap(value+(match[2]==='加'?amount:-amount))).padStart(2,'0')}
  match=name.match(/平(\d)码合数(加|减)(\d+)/);if(match){const value=values[Number(match[1])-1],base=sumDigits(value),amount=Number(match[3]);return String(value).padStart(2,'0')+'合'+base+(match[2]==='加'?'＋':'－')+amount+'＝'+String(wrap(base+(match[2]==='加'?amount:-amount))).padStart(2,'0')}
  match=name.match(/平(\d)码尾数(加|减)(\d+)/);if(match){const value=values[Number(match[1])-1],base=value%10,amount=Number(match[3]);return String(value).padStart(2,'0')+'尾'+base+(match[2]==='加'?'＋':'－')+amount+'＝'+String(wrap(base+(match[2]==='加'?amount:-amount))).padStart(2,'0')}
  return name+'＝'+String(result).padStart(2,'0');
}

export default async function PingteTwoPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const current=formulaManifests.pingte2[type];const manifests:Record<string,any>=type==='5'?{'239':macau239,[String(current.issue)]:current}:{[String(current.issue)]:current};const manifest=manifests[issue];const posts=manifest?.methods??[];
  const index=Number(method)-1;
  const currentPost=current.methods?.[index];
  const historyEntry=currentPost?.history?.find((entry:any)=>entry.targetPeriod===Number(issue));
  if((!manifest&&!historyEntry)||!Number.isInteger(index)||index<0||(!currentPost&&!posts[index])) return <ArchivedFormulaPost type={type} path={`/posts/pingte2/${issue}/${method}`} backHref={`/?type=${type}#board-平特公式`} backLabel="返回平特板块"/>;
  const post=historyEntry?currentPost:posts[index];
  const animals=post.predictionAnimals.join('、');
  const title=`${post.leftName} ＋ ${post.rightName}`;
  const signature=(item:any)=>`${item.leftName}|${item.rightName}`;const issueKeys=Object.keys(manifests).map(Number).sort((a,b)=>a-b);const issuePosition=issueKeys.indexOf(Number(issue));const linkedIssue=(offset:number)=>{const target=issueKeys[issuePosition+offset];if(!target)return null;const targetIndex=manifests[String(target)].methods.findIndex((item:any)=>signature(item)===signature(post));return targetIndex>=0?{issue:target,method:String(targetIndex+1).padStart(3,'0')}:null};const older=linkedIssue(-1),newer=linkedIssue(1);
  const previous=index>0?String(index).padStart(3,'0'):null;
  const next=index<posts.length-1?String(index+2).padStart(3,'0'):null;
  if(Number(issue)===Number(current.issue)||historyEntry){
    const allDraws=formulaManifests.wuxing[type].draws;
    const drawMap=new Map(allDraws.map((draw:any)=>[Number(draw.period),draw]));
    const cutoff=historyEntry?Number(issue):Number(current.issue)-1;
    const selectedHistory=(currentPost.history||[])
      .filter((entry:any)=>entry.targetPeriod<=cutoff)
      .filter((entry:any)=>drawMap.has(Number(entry.sourcePeriod))&&drawMap.has(Number(entry.targetPeriod)))
      .slice(-5);
    const transformedHistory=selectedHistory.map((entry:any)=>{
      const targetDraw:any=drawMap.get(entry.targetPeriod);
      const targetPositions=(targetDraw?.numbers||[]).flatMap((value:any,position:number)=>entry.animals.includes(value.animal)?[position+1]:[]);
      return {...entry,targetPositions,branches:[
        {name:post.leftName,calculation:calculate(post.leftName,drawMap.get(entry.sourcePeriod),entry.numbers[0])+'，'+entry.numbers[0]+'岁属'+entry.animals[0],result:entry.animals[0],targetPositions:targetPosition(targetDraw,entry.numbers[0],entry.animals[0])},
        {name:post.rightName,calculation:calculate(post.rightName,drawMap.get(entry.sourcePeriod),entry.numbers[1])+'，'+entry.numbers[1]+'岁属'+entry.animals[1],result:entry.animals[1],targetPositions:targetPosition(targetDraw,entry.numbers[1],entry.animals[1])}
      ],actualNumber:targetPositions.map((position:number)=>targetDraw.numbers[position-1].number).join('、'),actualAnimal:targetPositions.map((position:number)=>targetDraw.numbers[position-1].animal).join('、'),actualElement:''};
    });
    const predictionAnimals=historyEntry?historyEntry.animals:post.predictionAnimals;
    const predictionNumbers=historyEntry?historyEntry.numbers:post.predictionNumbers;
    const sourcePeriod=historyEntry?Number(issue)-1:Number(current.issue)-1;
    const item={label:'平特二肖',sourceKey:post.leftName+'＋'+post.rightName,next:predictionAnimals,recentStreak:post.recentStreak,recent30Hits:Math.round((post.recent30Rate||0)*30),formulaId:post.formulaId,branches:[
      {name:post.leftName,next:predictionAnimals[0],calculation:'取号一：'+calculate(post.leftName,drawMap.get(sourcePeriod),predictionNumbers[0])+'，'+predictionNumbers[0]+'岁属'+predictionAnimals[0],sourcePositions:positions(post.leftName)},
      {name:post.rightName,next:predictionAnimals[1],calculation:'取号二：'+calculate(post.rightName,drawMap.get(sourcePeriod),predictionNumbers[1])+'，'+predictionNumbers[1]+'岁属'+predictionAnimals[1],sourcePositions:positions(post.rightName)}
    ],history:transformedHistory,...(historyEntry?{verification:{hit:historyEntry.hit,actualNumber:'',actualAnimal:'',actualElement:''}}:{})};
    const shownDraws=allDraws.filter((draw:any)=>draw.period<=(historyEntry?Number(issue):Number(current.issue)-1)).slice(-6);
    const periods=selectedHistory.map((entry:any)=>entry.targetPeriod);
    const posterIssue=historyEntry&&periods.length?Math.min(...periods)+'-'+Math.max(...periods):issue;
    const availableIssues=Array.from(new Set([Number(current.issue),...(currentPost.history||[]).map((entry:any)=>entry.targetPeriod)])).sort((a:number,b:number)=>b-a);
    return <main className="post-page"><header className="site-header"><a className="brand" href={'/?type='+type}>六合公式库</a><nav><a href={'/?type='+type}>首页</a><a href={'/?type='+type+'#board-平特公式'}>平特公式</a></nav></header><article className="detail pingte-detail"><div className="detail-topbar"><a className="detail-back" href={'/?type='+type+'#board-平特公式'}><i>←</i><span><small>BACK TO INDEX</small><strong>返回平特板块</strong></span></a><IssueScroller issues={availableIssues} current={Number(issue)} basePath="/posts/pingte2" method={method} type={type}/></div><section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={shownDraws} mode="pingte2" lotteryName={LOTTERY_SHORT_NAMES[type]}/></section><p className="formula-note">两个生肖必须在同一期同时开出才算准 · 平码与特码均计入 · 仅供娱乐参考</p></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
  }
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-平特公式">平特公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar">
        <a className="detail-back" href={`/?type=${type}#board-平特公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回平特板块</strong></span></a>
        <nav className="detail-issue-links">
          {newer?<a href={`/posts/pingte2/${newer.issue}/${newer.method}?type=${type}`}><small>下一期</small><strong>第{newer.issue}期</strong></a>:<span className="disabled"><small>下一期</small><strong>当前最新</strong></span>}
          {older?<a href={`/posts/pingte2/${older.issue}/${older.method}?type=${type}`}><small>上一期</small><strong>第{older.issue}期</strong></a>:<span className="disabled"><small>上一期</small><strong>暂无记录</strong></span>}
        </nav>
      </div>
      <header className="detail-title"><span>平特二肖</span><h1>2026-{issue}期｜参考{animals}</h1></header>
      <section className="method-card single-method"><header className="simple-method-title"><strong>{title}</strong></header><figure className="formula-frame"><img src={`/generated/pingte-two/type-${type}-${String(issue).padStart(3,'0')}-${method}.webp?v=35`} alt={`2026-${issue}期平特一肖${animals}`} draggable="false"/></figure></section>
      <p className="formula-note">平码与特码共7个号码均计入；两个生肖必须在同一期同时出现才记为命中。历史规律仅供娱乐参考。</p>
      <nav className="post-pager">{previous?<a href={`/posts/pingte2/${issue}/${previous}?type=${type}`}><small>上一组二肖</small><strong>{posts[index-1].predictionAnimals.join('、')}</strong></a>:<span/>}{next?<a href={`/posts/pingte2/${issue}/${next}?type=${type}`}><small>下一组二肖</small><strong>{posts[index+1].predictionAnimals.join('、')}</strong></a>:<span/>}</nav>
    </article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
