import TailHeadFormulaPost from '@/app/TailHeadFormulaPost';
import {requestedLotteryType} from '@/lib/formula-manifests';

export default async function HeadPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;const type=requestedLotteryType(await searchParams);
  return <TailHeadFormulaPost type={type} issue={issue} method={method} kind="head"/>;
}
