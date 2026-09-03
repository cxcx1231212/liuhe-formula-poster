import cache1 from '@/data/lottery-cache/type-1-2026.json';
import cache5 from '@/data/lottery-cache/type-5-2026.json';
import cache8 from '@/data/lottery-cache/type-8-2026.json';
export const LOTTERY_TYPES = {
  '1': '香港六合彩',
  '5': '澳门六合彩',
  '8': '疯狂天天六合彩',
} as const;

export const LOTTERY_SHORT_NAMES = {
  '1': '香港彩',
  '5': '澳门彩',
  '8': '疯狂彩',
} as const;

export type LotteryType = keyof typeof LOTTERY_TYPES;

export type LotteryNumber = {
  color: 1 | 2 | 3;
  number: string;
  shengXiao: string;
  daXiao: string;
  danShuang: string;
  wuXing: string;
};

export type LotteryRecord = {
  id: number;
  lotteryTime: string;
  numberList: LotteryNumber[];
  period: number;
  year: number;
};

export type LotteryPage = {
  records: LotteryRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const API_URL = 'https://6htv70.com/gallerynew/h5/lottery/search';
const LATEST_API_URL = 'https://6htv70.com/gallerynew/h5/index/lastLotteryRecord';

export type LatestLottery = {
  display?: number;
  interval?: number;
  lotteryTime: string;
  lotteryType: LotteryType;
  nextLotteryNumber: string;
  nextLotteryTime: string;
  numberList: LotteryNumber[];
  period: string;
  title: string;
  videoUrl?: string;
  videoUrlForH5?: string;
  year: number;
};

export async function getLotteryHistory(type: LotteryType, year: number, page = 1): Promise<LotteryPage> {
  const query = new URLSearchParams({
    pageNum: String(Math.max(1, page)),
    year: String(year),
    sort: '1',
    lotteryType: type,
  });
  const response = await fetch(`${API_URL}?${query}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`开奖接口请求失败：${response.status}`);
  const payload = await response.json() as {
    success: boolean;
    data?: {
      pager: { pageNum: number; pageSize: number; totalCount: number; totalPageCount: number };
      recordList: LotteryRecord[];
    };
  };
  if (!payload.success || !payload.data) throw new Error('开奖接口没有返回有效数据');
  return {
    records: payload.data.recordList,
    page: payload.data.pager.pageNum,
    pageSize: payload.data.pager.pageSize,
    total: payload.data.pager.totalCount,
    totalPages: payload.data.pager.totalPageCount,
  };
}

export async function getLotteryYearHistory(type: LotteryType, year: number): Promise<LotteryPage> {
  const first = await getLotteryHistory(type, year, 1);
  if (first.totalPages <= 1) return first;
  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) => getLotteryHistory(type, year, index + 2)),
  );
  return {
    ...first,
    records: [first, ...remaining].flatMap(result => result.records),
    page: 1,
    pageSize: first.total,
  };
}

export function isLotteryType(value: string): value is LotteryType {
  return value in LOTTERY_TYPES;
}

export async function getLatestLottery(type: LotteryType): Promise<LatestLottery> {
  const caches:Record<LotteryType,LotteryRecord[]>={'1':cache1 as LotteryRecord[],'5':cache5 as LotteryRecord[],'8':cache8 as LotteryRecord[]};
  const record=caches[type][caches[type].length-1];
  if(!record)throw new Error('本地开奖缓存没有有效数据');
  const date=record.lotteryTime.replace('年','/').replace('月','/').replace('日','');
  return {lotteryTime:date,lotteryType:type,nextLotteryNumber:String(record.period+1),nextLotteryTime:'',numberList:record.numberList,period:String(record.period),title:LOTTERY_TYPES[type],year:record.year};
}
