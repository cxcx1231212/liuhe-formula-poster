import { getLatestLottery, isLotteryType } from '@/lib/lottery';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedType = url.searchParams.get('type') ?? '1';
  if (!isLotteryType(requestedType)) return Response.json({ error: '无效彩种' }, { status: 400 });
  try {
    const data = await getLatestLottery(requestedType);
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: '开奖数据读取失败' }, { status: 502 });
  }
}

