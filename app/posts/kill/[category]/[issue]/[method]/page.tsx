import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function KillPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.kill[type];const group=(manifest.groups as any)[category];const index=group?.methods.findIndex((value:any)=>value.rank===method)??-1;const item=index>=0?group.methods[index]:null;
  if(issue!==String(manifest.issue)||!group||!item)return <ArchivedFormulaPost type={type} path={`/posts/kill/${category}/${issue}/${method}`} backHref={`/?type=${type}#board-绝杀公式`} backLabel="返回绝杀板块"/>;
  const link=(target:number,eyebrow:string)=>{const value=group.methods[target];return value?{href:`/posts/kill/${category}/${issue}/${value.rank}?type=${type}`,eyebrow,label:`${group.label} 第${target+1}条`}:null};
  return <StaticFormulaPost type={type} board="绝杀" hash="绝杀公式" image={item.image} alt={`${group.label}公式图`} note="所杀结果全部避开下期特号才算准 · 仅供娱乐参考" previous={link(index-1,'上一个公式')} next={link(index+1,'下一个公式')}/>;
}
