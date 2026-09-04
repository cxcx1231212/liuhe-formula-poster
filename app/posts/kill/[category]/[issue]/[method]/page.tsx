/* asset-manifests-v1 */
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import IssueScroller from '@/app/IssueScroller';
import {env} from 'cloudflare:workers';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function KillPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=await formulaManifests.kill[type];
  const group=manifest.groups[category];
  const index=group?.methods.findIndex((value:any)=>value.rank===method)??-1;
  const current=index>=0?group.methods[index]:null;
  const requested=Number(issue),latest=Number(manifest.issue);
  const fallback=<ArchivedFormulaPost type={type} path={`/posts/kill/${category}/${issue}/${method}`} backHref={`/?type=${type}#board-绝杀公式`} backLabel="返回绝杀板块"/>;
  if(!current||!Number.isInteger(requested)||requested>latest)return fallback;
  const assets=(env as unknown as {ASSETS:{fetch(request:Request):Promise<Response>}}).ASSETS;
  const response=await assets.fetch(new Request(`https://assets.local/generated/kill-history/type-${type}-${latest}/${category}-${current.rank}.json`));
  if(!response.ok)throw new Error('Missing kill calculation history');
  const data=await response.json() as any;
  if(data.formulaId!==current.formulaId)throw new Error('Kill formula identity mismatch');
  const verified=data.history.find((row:any)=>row.targetPeriod===requested);
  if(requested!==latest&&!verified)return fallback;
  const isHistory=requested<latest;
  const history=data.history.filter((row:any)=>row.targetPeriod<=requested).slice(-5);
  const item={...current,label:group.label,branches:isHistory?verified.branches:data.branches,next:isHistory?verified.branches.map((b:any)=>b.result):current.next||current.values,history,...(isHistory?{verification:verified}:{})};
  const periods=history.map((row:any)=>row.targetPeriod);
  const displayIssue=isHistory?`${Math.min(...periods)}-${Math.max(...periods)}`:issue;
  const availableIssues:number[]=[latest,...data.history.map((row:any)=>Number(row.targetPeriod))];
  const draws=manifest.draws.filter((draw:any)=>draw.period<=(isHistory?requested:requested-1));
  return <DynamicSimpleFormulaPost type={type} issue={displayIssue} navigationIssue={issue} method={method} item={current} draws={draws} board="绝杀" hash="绝杀公式" basePath={`/posts/kill/${category}`} index={index} total={group.methods.length} note="历史分页按当前固定公式回算，不代表当时已发布；当期保存记录见公式历史。所杀结果全部避开下期特号才算准 · 仅供娱乐参考" posterItemOverride={item} periodNav={<IssueScroller issues={availableIssues} current={requested} basePath={`/posts/kill/${category}`} method={method} type={type}/>}/>;
}
