import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function DanshuangPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.danshuang[type];const index=manifest.methods.findIndex((value:any)=>value.rank===method);const item=index>=0?manifest.methods[index]:null;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/danshuang/${issue}/${method}`} backHref={`/?type=${type}#board-单双公式`} backLabel="返回单双板块"/>;
  const draws=formulaManifests.wuxing[type].draws.filter((draw:any)=>draw.period<Number(issue)).slice(-6);
  return <DynamicSimpleFormulaPost type={type} issue={issue} method={method} item={item} draws={draws} board="单双" hash="单双公式" basePath="/posts/danshuang" index={index} total={manifest.methods.length} note="按上期开奖推算下期特码单双 · 仅供娱乐参考"/>;
}
