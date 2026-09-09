import {env} from 'cloudflare:workers';
import type {LotteryType} from './lottery';

const pingte1 = '/generated/pingte-all/type-1-098-manifest.json';const pingte5 = '/generated/pingte-all/type-5-252-manifest.json';const pingte8 = '/generated/pingte-all/type-8-252-manifest.json';
const pingte21 = '/generated/pingte-two/type-1-098-manifest.json';const pingte25 = '/generated/pingte-two/type-5-252-manifest.json';const pingte28 = '/generated/pingte-two/type-8-252-manifest.json';

const tema1 = '/generated/tema-bundles/type-1-098-manifest.json';const tema5 = '/generated/tema-bundles/type-5-252-manifest.json';const tema8 = '/generated/tema-bundles/type-8-252-manifest.json';
const zodiac1 = '/generated/zodiac/type-1-098-manifest.json';const zodiac5 = '/generated/zodiac/type-5-252-manifest.json';const zodiac8 = '/generated/zodiac/type-8-252-manifest.json';
const fushi1 = '/generated/fushi/type-1-098-manifest.json';const fushi5 = '/generated/fushi/type-5-252-manifest.json';const fushi8 = '/generated/fushi/type-8-252-manifest.json';
const ds1 = '/generated/danshuang/type-1-098-manifest.json';const ds5 = '/generated/danshuang/type-5-252-manifest.json';const ds8 = '/generated/danshuang/type-8-252-manifest.json';
const wave1 = '/generated/wave/type-1-098-manifest.json';const wave5 = '/generated/wave/type-5-252-manifest.json';const wave8 = '/generated/wave/type-8-252-manifest.json';
const wx1 = '/generated/wuxing/type-1-098-manifest.json';const wx5 = '/generated/wuxing/type-5-252-manifest.json';const wx8 = '/generated/wuxing/type-8-252-manifest.json';
const jy1 = '/generated/jiaye/type-1-098-manifest.json';const jy5 = '/generated/jiaye/type-5-252-manifest.json';const jy8 = '/generated/jiaye/type-8-252-manifest.json';
const kill1 = '/generated/kill/type-1-098-manifest.json';const kill5 = '/generated/kill/type-5-252-manifest.json';const kill8 = '/generated/kill/type-8-252-manifest.json';
const size1 = '/generated/size/type-1-098-manifest.json';const size5 = '/generated/size/type-5-252-manifest.json';const size8 = '/generated/size/type-8-252-manifest.json';
const tail1 = '/generated/tail/type-1-098-manifest.json';const tail5 = '/generated/tail/type-5-252-manifest.json';const tail8 = '/generated/tail/type-8-252-manifest.json';
const head1 = '/generated/head/type-1-098-manifest.json';const head5 = '/generated/head/type-5-252-manifest.json';const head8 = '/generated/head/type-8-252-manifest.json';

// Manifest bytes belong in static assets, not the Worker executable.
async function loadManifest(path: string): Promise<any> {
  const assets = (env as unknown as {ASSETS: {fetch(request: Request): Promise<Response>}}).ASSETS;
  const response = await assets.fetch(new Request('https://assets.local' + path));
  if (!response.ok) throw new Error('Formula asset unavailable: ' + path + ' (' + response.status + ')');
  return response.json();
}
const map = (one: string, five: string, eight: string) => ({
  get 1() { return loadManifest(one); },
  get 5() { return loadManifest(five); },
  get 8() { return loadManifest(eight); },
} as Record<LotteryType, Promise<any>>);
export const formulaManifests={
  pingte:map(pingte1,pingte5,pingte8),pingte2:map(pingte21,pingte25,pingte28),
  tema:map(tema1,tema5,tema8),zodiac:map(zodiac1,zodiac5,zodiac8),
  fushi:map(fushi1,fushi5,fushi8),danshuang:map(ds1,ds5,ds8),wave:map(wave1,wave5,wave8),wuxing:map(wx1,wx5,wx8),
  jiaye:map(jy1,jy5,jy8),kill:map(kill1,kill5,kill8),size:map(size1,size5,size8),tail:map(tail1,tail5,tail8),head:map(head1,head5,head8),
};

export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';return value==='1'||value==='8'?value:'5';
}
