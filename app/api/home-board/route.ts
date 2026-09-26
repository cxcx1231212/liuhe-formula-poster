import {NextRequest,NextResponse} from 'next/server';
import {getHomeBoardPage,validBoardCategory,type HomeBoardKey} from '@/lib/home-board-data';
const boards=new Set(['pingte','tema','zodiac','fushi','danshuang','wave','wuxing','jiaye','kill','size','tail','head']);
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams,type=q.get('type')??'5',board=q.get('board')??'',category=q.get('category')??'';
  const page=Number(q.get('page')||1);
  if(!['1','5','8'].includes(type)||!boards.has(board)||!validBoardCategory(board,category)||!Number.isSafeInteger(page)||page<1)return NextResponse.json({error:'invalid request'},{status:400});
  const data=await getHomeBoardPage(type as '1'|'5'|'8',board as HomeBoardKey,category,Number(q.get('page')||1));
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store, no-transform'}});
}
