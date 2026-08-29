import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';

type Method={rank:string;image:string;numbers?:number[];animals?:string[]};
type Group={label:string;kind:string;methods:Method[]};

export default async function FushiPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.fushi[type];
  const group=(manifest.groups as Record<string,Group>)[category];
  const index=group?.methods.findIndex(item=>item.rank===method)??-1;
  const item=index>=0?group.methods[index]:undefined;
  if(issue!==String(manifest.issue)||!group||!item){
    return <ArchivedFormulaPost type={type} path={`/posts/fushi/${category}/${issue}/${method}`} backHref={`/?type=${type}#board-复式公式`} backLabel="返回复式板块"/>;
  }
  const values=group.kind==='animal'?item.animals:item.numbers?.map(number=>String(number).padStart(2,'0'));
  const previous=index>0?group.methods[index-1].rank:null;
  const next=index<group.methods.length-1?group.methods[index+1].rank:null;
  return <StaticFormulaPost type={type} board="复式" hash="复式公式" image={item.image} alt={`${group.label}公式图`} note={`【${group.label}】${group.kind==='animal'?'参考生肖':'参考号码'}：${values?.join('、')} · 只计算六个平码，重复号码或生肖只计一次 · 仅供娱乐参考`} previous={previous?{href:`/posts/fushi/${category}/${issue}/${previous}?type=${type}`,eyebrow:'上一个公式',label:`${group.label} 第${index}条`}:null} next={next?{href:`/posts/fushi/${category}/${issue}/${next}?type=${type}`,eyebrow:'下一个公式',label:`${group.label} 第${index+2}条`}:null}/>;
}
