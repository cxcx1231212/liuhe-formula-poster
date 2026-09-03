import type {LotteryType} from './lottery';

import zodiac1 from '../public/generated/zodiac/type-1-096-manifest.json';
import zodiac5 from '../public/generated/zodiac/type-5-246-manifest.json';
import zodiac8 from '../public/generated/zodiac/type-8-246-manifest.json';

const map=(one:unknown,five:unknown,eight:unknown)=>({1:one,5:five,8:eight} as Record<LotteryType,any>);

export const zodiacManifests=map(zodiac1,zodiac5,zodiac8);

export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';
  return value==='1'||value==='8'?value:'5';
}

