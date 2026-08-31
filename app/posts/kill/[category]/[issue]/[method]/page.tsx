import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function KillPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.kill[type];const group=(manifest.groups as any)[category];const index=group?.methods.findIndex((value:any)=>value.rank===method)??-1;const item=index>=0?group.methods[index]:null;
  if(issue!==String(manifest.issue)||!group||!item)return <ArchivedFormulaPost type={type} path={`/posts/kill/${category}/${issue}/${method}`} backHref={`/?type=${type}#board-绝杀公式`} backLabel="返回绝杀板块"/>;
  return <DynamicSimpleFormulaPost type={type} issue={issue} method={method} item={item} draws={manifest.draws||[]} board="绝杀" hash="绝杀公式" basePath={`/posts/kill/${category}`} index={index} total={group.methods.length} note="所杀结果全部避开下期特号才算准 · 仅供娱乐参考" posterItemOverride={{...item,next:item.next||item.values,label:group.label,history:(item.history||[]).slice(-5)}}/>;
}
