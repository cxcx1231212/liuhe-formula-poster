import assert from 'node:assert/strict';
import {buildZodiacPosterItem} from '../lib/zodiac-history.ts';
import {buildFushiPosterItem} from '../lib/fushi-history.ts';

const method={name:'平2码－平6码交替加减14',baseName:'平2码－平6码',operation:'alternate_add_subtract',amount:14};
const draw=(period,p2,p6)=>({period,numbers:[1,p2,3,4,5,p6,7].map(number=>({number:String(number),animal:'',element:''}))});

const negative=buildZodiacPosterItem(method,[draw(252,41,48)],253);
assert.equal(negative.next[0],'龙');
assert.match(negative.branches[0].calculation,/\(41－48\)−14＝-21按12肖循环＝3，03属龙/);

const zero=buildZodiacPosterItem(method,[draw(253,35,49)],254);
assert.equal(zero.next[0],'羊');
assert.match(zero.branches[0].calculation,/\(35－49\)\+14＝0按12肖循环＝12，12属羊/);

const tails={name:'平1码尾数＋特码尾数除9余数',baseName:'平1码尾数＋特码尾数',operation:'modulo',amount:9};
const tail=buildZodiacPosterItem(tails,[{period:256,numbers:[40,15,9,37,7,3,1].map(number=>({number:String(number),animal:'',element:''}))}],257);
assert.match(tail.branches[0].calculation,/\(40尾0＋01尾1\)÷余数9＝01属马/);

const fushiMethod={rank:'001',sourceKey:'边界测试',branches:[{name:'平1码减35'}]};
const fushiDraw={period:1,numbers:[35,2,3,4,5,6,7].map(number=>({number:String(number),animal:'',element:''}))};
const animalFushi=buildFushiPosterItem(fushiMethod,[fushiDraw],2,'animal',2,'二肖复式');
assert.equal(animalFushi.next[0],'羊');
assert.match(animalFushi.branches[0].calculation,/35−35=0＋12＝12（按12肖循环），12属羊/);
const numberFushi=buildFushiPosterItem(fushiMethod,[fushiDraw],2,'number',2,'二中二');
assert.equal(numberFushi.next[0],'49');
assert.match(numberFushi.branches[0].calculation,/35−35=0＋49＝49（超出1～49，每次加\/减49）/);

console.log('PASS zodiac and fushi formulas show explicit category-specific cycling');
