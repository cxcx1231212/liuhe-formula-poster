import {getLatestLottery,isLotteryType,type LotteryType} from '@/lib/lottery';
import HomeClient from './HomeClient';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,requested=typeof query.type==='string'?query.type:'5';
 const initialType:LotteryType=isLotteryType(requested)?requested:'5';
 const types:LotteryType[]=['1','5','8'];
 const values=await Promise.all(types.map(type=>getLatestLottery(type)));
 const latestByType=Object.fromEntries(types.map((type,index)=>[type,values[index]])) as Record<LotteryType,(typeof values)[number]>;
 return <HomeClient initialType={initialType} latestByType={latestByType}/>;
}
