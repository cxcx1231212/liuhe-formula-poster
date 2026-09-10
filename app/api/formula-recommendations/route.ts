import {NextRequest,NextResponse} from 'next/server';
import {getHomeBoardRecommendation,type HomeBoardKey} from '@/lib/home-board-data';

type Definition={board:HomeBoardKey;category:string;typeName:string};
const groups=(board:HomeBoardKey,names:Record<string,string>):Definition[]=>Object.entries(names).map(([category,typeName])=>({board,category,typeName}));
const definitions:Definition[]=[
  {board:'pingte',category:'one',typeName:'平特一肖'},{board:'pingte',category:'two',typeName:'平特二肖'},
  ...groups('tema',{'3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'}),
  ...groups('zodiac',{'1':'一肖中特','3':'三肖中特','6':'六肖中特','9':'九肖中特'}),
  ...groups('fushi',{'22':'二中二','33':'三中三','2x':'二连肖','3x':'三连肖'}),
  {board:'danshuang',category:'',typeName:'特码单双'},{board:'wave',category:'',typeName:'特码波色'},{board:'wuxing',category:'',typeName:'特码五行'},{board:'jiaye',category:'',typeName:'家野中特'},
  ...groups('kill',{code:'杀码',animal:'杀肖',tail:'杀尾',head:'杀头',wave:'杀波'}),
  {board:'size',category:'',typeName:'特码大小'},{board:'tail',category:'',typeName:'尾数'},{board:'head',category:'',typeName:'头数'},
];
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const chinese=['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一','二十二','二十三','二十四','二十五','二十六'];

export async function OPTIONS(){return new Response(null,{status:204,headers:cors});}
export async function GET(request:NextRequest){
  const lotteryType=request.nextUrl.searchParams.get('lotteryType')??request.nextUrl.searchParams.get('type')??'5';
  if(!['1','5','8'].includes(lotteryType))return NextResponse.json({ok:false,error:'无效彩种，支持 1、5、8'},{status:400,headers:cors});
  const requested=request.nextUrl.searchParams.get('formulaType')?.trim();
  const selected=requested?definitions.filter(item=>item.typeName===requested||`${item.board}:${item.category}`===requested):definitions;
  if(!selected.length)return NextResponse.json({ok:false,error:'未找到该公式类型'},{status:404,headers:cors});
  const origin=request.nextUrl.origin;
  const recommendations=(await Promise.all(selected.map(async (definition,index)=>{
    const item=await getHomeBoardRecommendation(lotteryType as '1'|'5'|'8',definition.board,definition.category);
    return {slot:index+1,cardName:`规律${chinese[index]??index+1}`,...definition,...item,imageUrl:item.image?new URL(item.image,origin).toString():null,url:item.href?origin+item.href:null};
  }))).filter(item=>item.formula!==null);
  return NextResponse.json({ok:true,lotteryType,generatedAt:new Date().toISOString(),count:recommendations.length,recommendations},{headers:{...cors,'Cache-Control':'public, max-age=60, s-maxage=300'}});
}
