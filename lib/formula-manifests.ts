import type {LotteryType} from './lottery';

import pingte1 from '../public/generated/pingte-all/type-1-096-manifest.json';import pingte5 from '../public/generated/pingte-all/type-5-242-manifest.json';import pingte8 from '../public/generated/pingte-all/type-8-241-manifest.json';
import pingte21 from '../public/generated/pingte-two/type-1-096-manifest.json';import pingte25 from '../public/generated/pingte-two/type-5-242-manifest.json';import pingte28 from '../public/generated/pingte-two/type-8-241-manifest.json';
import temaOne1 from '../data/tema/one-complete-type-1-2026.json';import temaOne5 from '../data/tema/one-complete-type-5-2026.json';import temaOne8 from '../data/tema/one-complete-type-8-2026.json';
import tema1 from '../public/generated/tema-bundles/type-1-096-manifest.json';import tema5 from '../public/generated/tema-bundles/type-5-242-manifest.json';import tema8 from '../public/generated/tema-bundles/type-8-242-manifest.json';
import zodiac1 from '../public/generated/zodiac/type-1-096-manifest.json';import zodiac5 from '../public/generated/zodiac/type-5-242-manifest.json';import zodiac8 from '../public/generated/zodiac/type-8-242-manifest.json';
import fushi1 from '../public/generated/fushi/type-1-096-manifest.json';import fushi5 from '../public/generated/fushi/type-5-243-manifest.json';import fushi8 from '../public/generated/fushi/type-8-243-manifest.json';
import ds1 from '../public/generated/danshuang/type-1-096-manifest.json';import ds5 from '../public/generated/danshuang/type-5-244-manifest.json';import ds8 from '../public/generated/danshuang/type-8-244-manifest.json';
import wave1 from '../public/generated/wave/type-1-096-manifest.json';import wave5 from '../public/generated/wave/type-5-244-manifest.json';import wave8 from '../public/generated/wave/type-8-244-manifest.json';
import wx1 from '../public/generated/wuxing/type-1-096-manifest.json';import wx5 from '../public/generated/wuxing/type-5-242-manifest.json';import wx8 from '../public/generated/wuxing/type-8-241-manifest.json';
import jy1 from '../public/generated/jiaye/type-1-095-manifest.json';import jy5 from '../public/generated/jiaye/type-5-241-manifest.json';import jy8 from '../public/generated/jiaye/type-8-241-manifest.json';
import kill1 from '../public/generated/kill/type-1-96-manifest.json';import kill5 from '../public/generated/kill/type-5-243-manifest.json';import kill8 from '../public/generated/kill/type-8-243-manifest.json';
import size1 from '../public/generated/size/type-1-095-manifest.json';import size5 from '../public/generated/size/type-5-241-manifest.json';import size8 from '../public/generated/size/type-8-241-manifest.json';
import tail1 from '../public/generated/tail/type-1-095-manifest.json';import tail5 from '../public/generated/tail/type-5-241-manifest.json';import tail8 from '../public/generated/tail/type-8-241-manifest.json';
import head1 from '../public/generated/head/type-1-095-manifest.json';import head5 from '../public/generated/head/type-5-241-manifest.json';import head8 from '../public/generated/head/type-8-241-manifest.json';

const map=(one:unknown,five:unknown,eight:unknown)=>({1:one,5:five,8:eight} as Record<LotteryType,any>);
export const formulaManifests={
  pingte:map(pingte1,pingte5,pingte8),pingte2:map(pingte21,pingte25,pingte28),
  temaOne:map(temaOne1,temaOne5,temaOne8),tema:map(tema1,tema5,tema8),zodiac:map(zodiac1,zodiac5,zodiac8),
  fushi:map(fushi1,fushi5,fushi8),danshuang:map(ds1,ds5,ds8),wave:map(wave1,wave5,wave8),wuxing:map(wx1,wx5,wx8),
  jiaye:map(jy1,jy5,jy8),kill:map(kill1,kill5,kill8),size:map(size1,size5,size8),tail:map(tail1,tail5,tail8),head:map(head1,head5,head8),
};

export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';return value==='1'||value==='8'?value:'5';
}
