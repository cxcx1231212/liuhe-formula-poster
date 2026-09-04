import {formulaHistory} from '@/lib/formula-history';








const names:Record<string,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const fieldNames:Record<string,string>={predictionAnimal:'本期生肖',predictionNumber:'本期号码',predictionAnimals:'本期生肖',predictionNumbers:'本期号码',numbers:'本期号码',number:'本期号码',animals:'本期生肖',animal:'本期生肖',nextAnimal:'本期生肖',tails:'本期尾数',tail:'本期尾数',heads:'本期头数',head:'本期头数',waves:'本期波色',wave:'本期波色',elements:'本期五行',element:'本期五行',values:'本期结果',value:'本期结果',result:'本期结果',next:'本期预测',prediction:'本期预测',branches:'计算明细',name:'公式分支',calculation:'计算过程',source:'取数来源',recentStreak:'近期连中',streak:'当前连中',maxStreak:'最高连中',recent30Rate:'近30期准确率',recent30Hits:'近30期命中',totalRate:'总准确率',totalHits:'总命中',totalTests:'统计期数'};








function scoreText(key:string,value:unknown):string{
  return key.toLowerCase().includes('rate')&&typeof value==='number'?Math.round(value*100)+'%':valueText(value);
}




function valueText(value:unknown):string{
  if(value===null||value===undefined||value==='')return '—';
  if(Array.isArray(value))return value.map(valueText).join('、');
  if(typeof value==='object')return Object.entries(value as Record<string,unknown>).map(([key,item])=>(fieldNames[key]||key)+'：'+valueText(item)).join('；');
  return String(value);
}








export default async function ArchivedFormulaPost({type,path,backHref='/',backLabel='返回公式板块'}:{type:string;path:string;backHref?:string;backLabel?:string}){
  const history=await formulaHistory(type,path);
  const item=history?.entries.find(entry=>entry.href===path)??null;
  if(!item||!history)return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  const position=history.entries.findIndex(entry=>entry.href===path);
  const newer=position>0?history.entries[position-1]:null;
  const older=position<history.entries.length-1?history.entries[position+1]:null;
  const predictions=Object.entries(item.prediction??{}).filter(([,value])=>value!==null&&value!==undefined&&value!=='');
  const scores=Object.entries(item.score??{}).filter(([,value])=>value!==null&&value!==undefined&&value!=='');
  const signature=item.signature||history.signature;
  const poolName=path.startsWith('/posts/fushi/22/')&&signature.includes('【8码扩展v1】')?'八码复式':path.startsWith('/posts/fushi/33/')&&signature.includes('【10码扩展v1】')?'十码复式':'';
  const displayLabel=(item.label||history.label).replace(/【(?:8|10)码扩展v1】/g,'')+(poolName?`【${poolName}】`:'');
  const algorithmParts=signature.replace(/【(?:8|10)码扩展v1】/g,'').split('|').filter(Boolean);
  const resultRows=predictions.filter(([key])=>key!=='branches');
  const branchRows=predictions.find(([key])=>key==='branches');
  const displayId=item.formulaId.replace(/-+/g,'-');
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={backHref}><i>←</i><span><small>BACK TO INDEX</small><strong>{backLabel}</strong></span></a><nav className="detail-issue-links">{newer?.href?<a href={newer.href+'?type='+type}><small>下一期</small><strong>{newer.issue}期</strong></a>:<span className="disabled">当前最新</span>}{older?.href?<a href={older.href+'?type='+type}><small>上一期</small><strong>{older.issue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <header className="detail-title detail-title-rich"><div className="detail-title-copy"><p><span>{names[type]??names['5']}</span><b>历史公式</b><time>2026-{item.issue}期</time></p><h1>{displayLabel}</h1><small>历史档案 · 已按同一公式连续保存</small></div><em>{String(item.issue).padStart(3,'0')}</em></header>
      <section className="method-card single-method" style={{overflow:'hidden'}}>
        <div style={{padding:'20px',background:'linear-gradient(135deg,#eef5ff,#ffffff)',borderBottom:'1px solid #cfdef0'}}>
          <p style={{margin:'0 0 8px',color:'#1d5eb5',fontSize:'13px',fontWeight:700}}>{names[type]??names['5']} · 第{item.issue}期</p>
          <h1 style={{margin:0,color:'#253247',fontSize:'clamp(22px,5vw,34px)',lineHeight:1.3}}>{displayLabel}</h1>
        </div>
        <div style={{display:'grid',gap:'16px',padding:'20px'}}>
          <div><strong style={{display:'block',marginBottom:'14px',color:'#1d5eb5'}}>公式计算过程</strong><div style={{display:'grid',gap:'12px'}}>{algorithmParts.map((part,index)=><div key={index} style={{position:'relative',paddingLeft:'42px',minHeight:'34px',display:'flex',alignItems:'center'}}><span style={{position:'absolute',left:0,top:'2px',width:'28px',height:'28px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#1d5eb5',color:'#ffffff',fontWeight:800,zIndex:1}}>{index+1}</span>{index<algorithmParts.length-1?<i style={{position:'absolute',left:'13px',top:'28px',bottom:'-14px',width:'2px',background:'#b9d1ef'}}/>:null}<span style={{lineHeight:1.6}}>{part}</span></div>)}</div></div>
          {branchRows?<div><strong style={{display:'block',marginBottom:'10px',color:'#1d5eb5'}}>计算过程</strong><p style={{margin:0,lineHeight:1.8}}>{valueText(branchRows[1])}</p></div>:null}
          {resultRows.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'10px'}}>{resultRows.map(([key,value])=><div key={key} style={{padding:'14px',border:'1px solid #b9d1ef',borderRadius:'10px',background:'#f5f9ff'}}><small style={{display:'block',marginBottom:'6px',color:'#46698f'}}>{fieldNames[key]||key}</small><strong style={{fontSize:'22px',color:'#253247'}}>{valueText(value)}</strong></div>)}</div>:<p className="formula-note">本期公式资料已保存，等待生成预测结果。</p>}
          <div><strong style={{display:'block',marginBottom:'10px',color:'#1d5eb5'}}>公式历史记录</strong><div style={{display:'grid',gap:'8px'}}>{history.entries.slice(0,10).map(entry=><div key={entry.issue} style={{display:'grid',gridTemplateColumns:'70px 1fr auto',gap:'10px',alignItems:'center',padding:'10px 12px',border:'1px solid #d5e3f5',borderRadius:'8px',background:'#ffffff'}}><b>{entry.issue}期</b><span>{entry.actual?'开奖号 '+entry.actual.number+'（'+entry.actual.animal+'）':'等待开奖'}</span><strong style={{color:entry.status==='hit'?'#18733b':entry.status==='miss'?'#bb3030':'#1d5eb5'}}>{entry.status==='hit'?'命中':entry.status==='miss'?'未中':'待开奖'}</strong></div>)}</div></div>
          {scores.length?<div style={{padding:'12px 14px',borderRadius:'10px',background:'#edf5ff',lineHeight:1.8}}><b style={{color:'#1d5eb5'}}>历史成绩：</b>{scores.map(([key,value])=>(fieldNames[key]||key)+' '+scoreText(key,value)).join(' · ')}</div>:null}
          <div style={{display:'flex',flexWrap:'wrap',gap:'12px',justifyContent:'space-between',fontSize:'14px',color:'#536b86'}}><span>公式编号：{displayId}</span><span>开奖结果：{item.actual?item.actual.number+'（'+item.actual.animal+'）':'等待开奖'}</span></div>
        </div>
      </section>
      <p className="formula-note">本页为该公式当期原始存档，开奖结果公布后自动记录命中状态。仅供娱乐参考。</p>
      <a className="history-inline-link" href={'/formula-history?type='+type+'&path='+encodeURIComponent(path)}>查看这个公式的全部历史记录</a>
    </article>
  </main>;
}
