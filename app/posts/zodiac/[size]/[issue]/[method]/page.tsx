import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import StaticFormulaPost from '@/app/StaticFormulaPost';

type ZodiacMethod={name?:string;sourceKey?:string;animals?:string[];nextAnimal?:string;recent30Rate:number};
const labels:Record<string,string>={'1':'一肖','3':'三肖','6':'六肖','9':'九肖'};

export default async function ZodiacPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {size,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.zodiac[type];
  const index=Number(method)-1;
  const group=(manifest.groups as Record<string,{methods:ZodiacMethod[]}>)[size];
  const item=group?.methods[index];
  const label=labels[size];
  if(issue!==String(manifest.issue)||!label||!item||!Number.isInteger(index)||index<0){
    return <ArchivedFormulaPost type={type} path={`/posts/zodiac/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-生肖公式`} backLabel="返回生肖板块"/>;
  }
  const animals=item.animals??(item.nextAnimal?[item.nextAnimal]:[]);
  const image=`/generated/zodiac/type-${type}-${String(issue).padStart(3,'0')}-${size.padStart(2,'0')}-${method}.webp`;
  const previous=index>0?String(index).padStart(3,'0'):null;
  const next=index<group.methods.length-1?String(index+2).padStart(3,'0'):null;
  return <StaticFormulaPost type={type} board="生肖" hash="生肖公式" image={image} alt={`${label}中特公式图`} note={`【${label}中特】参考生肖：${animals.join('、')} · 依据前期开奖数据推算下期特码生肖 · 仅供娱乐参考`} previous={previous?{href:`/posts/zodiac/${size}/${issue}/${previous}?type=${type}`,eyebrow:'上一个公式',label:`${label} 第${index}条`}:null} next={next?{href:`/posts/zodiac/${size}/${issue}/${next}?type=${type}`,eyebrow:'下一个公式',label:`${label} 第${index+2}条`}:null}/>;
}
