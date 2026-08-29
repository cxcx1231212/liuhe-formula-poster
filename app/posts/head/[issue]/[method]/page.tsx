import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function HeadPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.head[type];const index=manifest.methods.findIndex((value:any)=>value.rank===method);const item=index>=0?manifest.methods[index]:null;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/head/${issue}/${method}`} backHref={`/?type=${type}#board-头数公式`} backLabel="返回头数板块"/>;
  const link=(target:number,eyebrow:string)=>{const value=manifest.methods[target];return value?{href:`/posts/head/${issue}/${value.rank}?type=${type}`,eyebrow,label:`头数 第${target+1}条`}:null};
  return <StaticFormulaPost type={type} board="头数" hash="头数公式" image={item.image} alt={`${item.label}公式图`} note="按上期开奖推算下期头数 · 仅供娱乐参考" previous={link(index-1,'上一个公式')} next={link(index+1,'下一个公式')}/>;
}
