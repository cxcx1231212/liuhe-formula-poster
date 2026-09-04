import { getLatestLottery, isLotteryType, type LatestLottery } from '@/lib/lottery';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedType = url.searchParams.get('type') ?? '1';
  if (!isLotteryType(requestedType)) return Response.json({ error: '无效彩种' }, { status: 400 });
  try {
    const response = await fetch('https://liuhe-formula-update-checker.xcx8088.workers.dev/latest?lotteryType=' + requestedType, {cache:'no-store', signal:AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('CF 开奖数据读取失败');
    const payload = await response.json() as {ok?:boolean;data?:LatestLottery};
    const incoming = payload.data;
    if (!payload.ok || !incoming || String(incoming.lotteryType) !== requestedType || !Array.isArray(incoming.numberList) || !Number.isInteger(Number(incoming.period)) || Number(incoming.period) < 1) throw new Error('CF 开奖数据无效');
    const saved = await getLatestLottery(requestedType);
    const newerSaved = Number(saved.year) > Number(incoming.year) || (Number(saved.year) === Number(incoming.year) && Number(saved.period) > Number(incoming.period));
    const samePeriod = Number(saved.year) === Number(incoming.year) && Number(saved.period) === Number(incoming.period);
    const data = newerSaved ? saved : {...saved,...incoming,lotteryType:requestedType,period:String(incoming.period),numberList:samePeriod && saved.numberList.length > incoming.numberList.length ? saved.numberList : incoming.numberList};
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: '开奖数据读取失败' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
