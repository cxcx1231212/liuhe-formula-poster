import {NextRequest,NextResponse} from 'next/server';
import {searchHomeBoards} from '@/lib/home-board-data';
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams,type=q.get('type')||'5',query=(q.get('q')||'').trim(),page=Number(q.get('page')||1);
 if(!['1','5','8'].includes(type)||!query||query.length>100||!Number.isSafeInteger(page)||page<1)return NextResponse.json({error:'invalid request'},{status:400});
 return NextResponse.json(await searchHomeBoards(type as '1'|'5'|'8',query,page),{headers:{'cache-control':'private, no-store, no-transform'}});
}
