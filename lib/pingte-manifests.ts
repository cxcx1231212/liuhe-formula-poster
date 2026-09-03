import type {LotteryType} from './lottery';

import pingte1 from '../public/generated/pingte-all/type-1-096-manifest.json';
import pingte5 from '../public/generated/pingte-all/type-5-246-manifest.json';
import pingte8 from '../public/generated/pingte-all/type-8-246-manifest.json';
import wuxing1 from '../public/generated/wuxing/type-1-096-manifest.json';
import wuxing5 from '../public/generated/wuxing/type-5-246-manifest.json';
import wuxing8 from '../public/generated/wuxing/type-8-246-manifest.json';

const map=(one:unknown,five:unknown,eight:unknown)=>({1:one,5:five,8:eight} as Record<LotteryType,any>);

export const pingteManifests={
  pingte:map(pingte1,pingte5,pingte8),
  wuxing:map(wuxing1,wuxing5,wuxing8),
};

export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';
  return value==='1'||value==='8'?value:'5';
}
