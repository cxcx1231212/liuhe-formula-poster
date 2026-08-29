import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import macau239 from '../../../../../../public/generated/tema-bundles/type-5-239-manifest.json';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';

type BundleMethod={numbers:number[];recentStreak:number;sourceKey:string};
const labels:Record<string,string>={'1':'一码中特','3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'};

export default async function TemaMethodPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {size,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const oneComplete=formulaManifests.temaOne[type];const currentBundle=formulaManifests.tema[type];const bundleManifests:Record<string,any>=type==='5'?{'239':macau239,[String(currentBundle.issue)]:currentBundle}:{[String(currentBundle.issue)]:currentBundle};const bundleManifest=bundleManifests[issue];
  const index=Number(method)-1;
  const label=labels[size];
  const bundleGroup=(bundleManifest?.groups as Record<string,{methods:BundleMethod[]}>|undefined)?.[size];
  const methods=size==='1'?oneComplete.qualifiedMethods:bundleGroup?.methods;
  if(!bundleManifest||!label||!methods||!Number.isInteger(index)||index<0||index>=methods.length){
    return <ArchivedFormulaPost type={type} path={`/posts/tema/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-特码公式`} backLabel="返回特码板块"/>;
  }
  const item=methods[index];
  const numbers='numbers' in item?item.numbers:[];
  const sourceName='sourceKey' in item?item.sourceKey:'';
  const formulaName=size==='1'&&'name' in item?item.name:`${sourceName}参考号码：${numbers.map(number=>String(number).padStart(2,'0')).join('、')}`;
  const previous=index>0?String(index).padStart(3,'0'):null;
  const next=index<methods.length-1?String(index+2).padStart(3,'0'):null;
  const image=size==='1'?`/generated/tema/type-${type}-${String(issue).padStart(3,'0')}-${method}.webp?v=34`:`/generated/tema-bundles/type-${type}-${String(issue).padStart(3,'0')}-${size.padStart(2,'0')}-${method}.webp?v=34`;
  const signature=(value:any)=>`${value.sourceKey}|${(value.branches??[]).map((branch:any)=>branch.name).sort().join('|')}`;const issueKeys=Object.keys(bundleManifests).map(Number).sort((a,b)=>a-b);const issuePosition=issueKeys.indexOf(Number(issue));const linkedIssue=(offset:number)=>{if(size==='1')return null;const target=issueKeys[issuePosition+offset];const targetMethods=target?bundleManifests[String(target)]?.groups?.[size]?.methods:null;const targetIndex=targetMethods?.findIndex((value:any)=>signature(value)===signature(item))??-1;return targetIndex>=0?{issue:target,method:String(targetIndex+1).padStart(3,'0')}:null};const older=linkedIssue(-1),newer=linkedIssue(1);
  return <StaticFormulaPost type={type} board="特码" hash="特码公式" image={image} alt={`${label}第${method}个公式`} note={`【${label}】${formulaName} · 图中标记展示取数来源与计算结果 · 仅供娱乐参考`} previous={previous?{href:`/posts/tema/${size}/${issue}/${previous}?type=${type}`,eyebrow:'上一个公式',label:`${label} 第${index}条`}:null} next={next?{href:`/posts/tema/${size}/${issue}/${next}?type=${type}`,eyebrow:'下一个公式',label:`${label} 第${index+2}条`}:null} extra={<nav className="post-pager issue-pager">{older?<a href={`/posts/tema/${size}/${older.issue}/${older.method}?type=${type}`}><small>查看上一期</small><strong>第{older.issue}期公式图</strong></a>:<span/>}{newer?<a href={`/posts/tema/${size}/${newer.issue}/${newer.method}?type=${type}`}><small>查看下一期</small><strong>第{newer.issue}期公式图</strong></a>:<span/>}</nav>}/>;
}
