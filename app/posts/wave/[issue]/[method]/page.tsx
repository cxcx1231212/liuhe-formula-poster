import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
export default async function WavePost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {issue,method}=await params; const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.wave[type];const index=manifest.methods.findIndex((item:any)=>item.rank===method); const item=index>=0?manifest.methods[index]:undefined;
 if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/wave/${issue}/${method}`} backHref={`/?type=${type}#board-波色公式`} backLabel="返回波色板块"/>;
 const previous=index>0?manifest.methods[index-1].rank:null; const next=index<manifest.methods.length-1?manifest.methods[index+1].rank:null;
 return <main className="post-page"><header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-波色公式">波色公式</a></nav></header><article className="detail pingte-detail">
 <div className="detail-topbar"><a className="detail-back" href="/#board-波色公式"><i>←</i><span><small>BACK TO INDEX</small><strong>返回波色板块</strong></span></a></div>
 <header className="detail-title"><span>特码波色</span><h1>2026-{issue}期｜特码波色</h1></header><section className="method-card single-method"><header className="simple-method-title"><strong>下期参考：{item.next}</strong></header><figure className="formula-frame"><img src={item.image} alt="特码波色公式图" draggable="false" /></figure></section>
 <p className="formula-note">使用上一期开奖数据预测下一期特波，图中展示取号、计算过程和历史验证。仅供娱乐参考。</p><nav className="post-pager">{previous?<a href={`/posts/wave/${issue}/${previous}`}><small>上一个公式</small><strong>波色 第{index}条</strong></a>:<span/>}{next?<a href={`/posts/wave/${issue}/${next}`}><small>下一个公式</small><strong>波色 第{index+2}条</strong></a>:<span/>}</nav></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
}
