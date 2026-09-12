import {notFound} from 'next/navigation';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import {getHomeBoardMethod} from '@/lib/home-board-data';
import {isLotteryType,type LotteryType} from '@/lib/lottery';

const labels:Record<string,string>={digit:'合数',span:'跨度',neighbor:'邻数',mirror:'镜像',multi:'多码合成',cross:'跨期交叉'};

export default async function AdvancedPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const route=await params,query=await searchParams,rawType=typeof query.type==='string'?query.type:'5';
  const type:LotteryType=isLotteryType(rawType)?rawType:'5';
  if(!labels[route.category])notFound();
  const data=await getHomeBoardMethod(type,'advanced',route.category,route.method);
  if(!data.method)notFound();
  const item=data.method as any,label=labels[route.category];
  const prediction=item.next??item.predictionNumbers??[];
  const poster={...item,label:`${label}公式`,sourceKey:item.name,branches:[{name:item.name,next:Array.isArray(prediction)?prediction[0]:prediction,calculation:item.name}]};
  return <DynamicSimpleFormulaPost type={type} issue={String(data.issue)} navigationIssue={route.issue} method={route.method} item={item} draws={data.draws} board={label} hash="新算法公式" basePath={`/posts/advanced/${route.category}`} index={data.index} total={data.total} posterItemOverride={poster} note={`${label}独立算法，按历史开奖逐期回测排序 · 仅供娱乐参考`}/>;
}
