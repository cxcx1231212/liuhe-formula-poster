/* asset-manifests-v1 */
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import IssueScroller from '@/app/IssueScroller';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {buildDanshuangPosterItem,type DanshuangMethod} from '@/lib/danshuang-history';

export default async function DanshuangPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=(await formulaManifests.danshuang[type]);const index=manifest.methods.findIndex((value:any)=>value.rank===method);const item=index>=0?manifest.methods[index] as DanshuangMethod:null;
  const requestedIssue=Number(issue),currentIssue=Number(manifest.issue),allDraws=(await formulaManifests.wuxing[type]).draws;
  const minimumIssue=Math.min(...allDraws.map((draw:any)=>Number(draw.period)))+1;
  if(!item||!Number.isFinite(requestedIssue)||requestedIssue<minimumIssue||requestedIssue>currentIssue)return <ArchivedFormulaPost type={type} path={`/posts/danshuang/${issue}/${method}`} backHref={`/?type=${type}#board-单双公式`} backLabel="返回单双板块"/>;
  const posterItem=buildDanshuangPosterItem(item,allDraws.filter((draw:any)=>Number(draw.period)<=requestedIssue),requestedIssue);
  const isHistory=requestedIssue<currentIssue;const verified=posterItem.history.find((entry:any)=>entry.targetPeriod===requestedIssue);
  const shownItem=isHistory&&verified?{...posterItem,next:verified.branches.map((branch:any)=>branch.result),branches:posterItem.branches.map((branch:any,branchIndex:number)=>({...branch,next:verified.branches[branchIndex]?.result||branch.next,calculation:verified.branches[branchIndex]?.calculation||branch.calculation})),verification:{hit:verified.hit,actualNumber:verified.actualNumber,actualAnimal:verified.actualAnimal,actualElement:verified.actualElement}}:posterItem;
  const draws=allDraws.filter((draw:any)=>Number(draw.period)<=(isHistory?requestedIssue:requestedIssue-1)).slice(-6);
  const availableIssues:number[]=[];for(let value=currentIssue;value>=minimumIssue;value-=6)availableIssues.push(value);
  if(!availableIssues.includes(minimumIssue))availableIssues.push(minimumIssue);
  const periodNav=<IssueScroller issues={availableIssues} current={requestedIssue} basePath="/posts/danshuang" method={method} type={type}/>;
  return <DynamicSimpleFormulaPost type={type} issue={issue} method={method} item={item} draws={draws} board="单双" hash="单双公式" basePath="/posts/danshuang" index={index} total={manifest.methods.length} note="按上期开奖推算下期特单双与合数单双 · 仅供娱乐参考" posterItemOverride={shownItem} periodNav={periodNav}/>;
}
