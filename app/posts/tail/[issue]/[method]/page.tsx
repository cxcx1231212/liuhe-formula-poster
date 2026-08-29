import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function TailPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.tail[type];const index=manifest.methods.findIndex((value:any)=>value.rank===method);const item=index>=0?manifest.methods[index]:null;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/tail/${issue}/${method}`} backHref={`/?type=${type}#board-尾数公式`} backLabel="返回尾数板块"/>;
  const link=(target:number,eyebrow:string)=>{const value=manifest.methods[target];return value?{href:`/posts/tail/${issue}/${value.rank}?type=${type}`,eyebrow,label:`尾数 第${target+1}条`}:null};
  return <StaticFormulaPost type={type} board="尾数" hash="尾数公式" image={item.image} alt={`${item.label}公式图`} note="按上期开奖推算下期尾数 · 仅供娱乐参考" previous={link(index-1,'上一个公式')} next={link(index+1,'下一个公式')}/>;
}
