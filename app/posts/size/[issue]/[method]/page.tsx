import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function SizePost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.size[type];const index=manifest.methods.findIndex((value:any)=>value.rank===method);const item=index>=0?manifest.methods[index]:null;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/size/${issue}/${method}`} backHref={`/?type=${type}#board-大小公式`} backLabel="返回大小板块"/>;
  const draws=formulaManifests.wuxing[type].draws.filter((draw:any)=>draw.period<Number(issue)).slice(-6);
  return <DynamicSimpleFormulaPost type={type} issue={issue} method={method} item={item} draws={draws} board="大小" hash="大小公式" basePath="/posts/size" index={index} total={manifest.methods.length} note="1至24为小，25至49为大 · 按上期开奖推算下期大小 · 仅供娱乐参考"/>;
}
