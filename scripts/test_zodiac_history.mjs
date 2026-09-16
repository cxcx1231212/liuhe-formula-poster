import assert from 'node:assert/strict';
import {buildZodiacPosterItem} from '../lib/zodiac-history.ts';
import {buildFushiPosterItem} from '../lib/fushi-history.ts';
import {buildDanshuangPosterItem} from '../lib/danshuang-history.ts';
import {buildWavePosterItem} from '../lib/wave-history.ts';

const method={name:'平2码－平6码交替加减14',baseName:'平2码－平6码',operation:'alternate_add_subtract',amount:14};
const draw=(period,p2,p6)=>({period,numbers:[1,p2,3,4,5,p6,7].map(number=>({number:String(number),animal:'',element:''}))});

const negative=buildZodiacPosterItem(method,[draw(252,41,48)],253);
assert.equal(negative.next[0],'龙');
assert.match(negative.branches[0].calculation,/\(41－48\)−14＝-21＋24＝03（按12肖循环），03属龙/);

const zero=buildZodiacPosterItem(method,[draw(253,35,49)],254);
assert.equal(zero.next[0],'羊');
assert.match(zero.branches[0].calculation,/\(35－49\)\+14＝0＋12＝12（按12肖循环），12属羊/);

const tails={name:'平1码尾数＋特码尾数除9余数',baseName:'平1码尾数＋特码尾数',operation:'modulo',amount:9};
const tail=buildZodiacPosterItem(tails,[{period:256,numbers:[40,15,9,37,7,3,1].map(number=>({number:String(number),animal:'',element:''}))}],257);
assert.equal(tail.branches[0].calculation,'40尾0＋01尾1＝1；1÷9，余数＝01属马');

const divided={name:'平1码－特码除5取整',baseName:'平1码－特码',operation:'divide_floor',amount:5};
const division=buildZodiacPosterItem(divided,[{period:256,numbers:[1,15,9,37,7,3,40].map(number=>({number:String(number),animal:'',element:''}))}],257);
assert.equal(division.next[0],'虎');
assert.equal(division.branches[0].calculation,'01－40＝-39；-39÷5＝-7.8；去掉小数部分＝-7；-7＋12＝05（按12肖循环），05属虎');
const exactDivision=buildZodiacPosterItem(divided,[{period:256,numbers:[5,15,9,37,7,3,40].map(number=>({number:String(number),animal:'',element:''}))}],257);
assert.doesNotMatch(exactDivision.branches[0].calculation,/去掉小数部分/);
assert.match(exactDivision.branches[0].calculation,/05－40＝-35；-35÷5＝-7；-7＋12＝05（按12肖循环）/);

const periodSum={sourceKey:'期数合数不对称交替法三连肖',branches:[
  {name:'期数合数减2',baseName:'期数合数',operation:'subtract',amount:2},
  {name:'期数合数减5',baseName:'期数合数',operation:'subtract',amount:5},
  {name:'期数合数减4',baseName:'期数合数',operation:'subtract',amount:4},
]};
const periodSumResult=buildZodiacPosterItem(periodSum,[draw(258,23,19)],259);
assert.deepEqual(periodSumResult.next,['马','鸡','猴']);
assert.equal(periodSumResult.branches[0].calculation,'258期：2＋5＋8＝15；15−2＝13属马');
assert.equal(periodSumResult.branches[1].calculation,'258期：2＋5＋8＝15；15−5＝10属鸡');
assert.equal(periodSumResult.branches[2].calculation,'258期：2＋5＋8＝15；15−4＝11属猴');

const periodDraw=draw(258,23,19);
const periodFushi=buildFushiPosterItem({rank:'003',sourceKey:'期数合数',branches:[{name:'期数合数减2',baseName:'期数合数',operation:'subtract',amount:2}]},[periodDraw],259,'animal',1,'一肖复式');
assert.equal(periodFushi.branches[0].calculation,'258期：2＋5＋8＝15；15−2=13属马');
const periodDanshuang=buildDanshuangPosterItem({rank:'001',label:'特码单双',sourceKey:'期数合数',name:'期数合数减2',baseName:'期数合数',operation:'subtract',amount:2},[periodDraw],259);
assert.match(periodDanshuang.branches[0].calculation,/258期：2＋5＋8＝15；15−2＝13/);
const periodWave=buildWavePosterItem({rank:'001',label:'特码波色',sourceKey:'期数合数',name:'期数合数减2',baseName:'期数合数',operation:'subtract',amount:2},[periodDraw],259);
assert.match(periodWave.branches[0].calculation,/258期：2＋5＋8＝15；15−2=13属红波/);

const fushiMethod={rank:'001',sourceKey:'边界测试',branches:[{name:'平1码减35'}]};
const fushiDraw={period:1,numbers:[35,2,3,4,5,6,7].map(number=>({number:String(number),animal:'',element:''}))};
const animalFushi=buildFushiPosterItem(fushiMethod,[fushiDraw],2,'animal',2,'二肖复式');
assert.equal(animalFushi.next[0],'羊');
assert.match(animalFushi.branches[0].calculation,/35−35=0＋12＝12（按12肖循环），12属羊/);
const overFushi=buildFushiPosterItem({rank:'002',sourceKey:'超过49',branches:[{name:'平1码加15'}]},[{...fushiDraw,numbers:[49,2,3,4,5,6,7].map(number=>({number:String(number),animal:'',element:''}))}],2,'animal',2,'二肖复式');
assert.equal(overFushi.next[0],'兔');
assert.equal(overFushi.branches[0].calculation,'49+15=64属兔');
const numberFushi=buildFushiPosterItem(fushiMethod,[fushiDraw],2,'number',2,'二中二');
assert.equal(numberFushi.next[0],'49');
assert.match(numberFushi.branches[0].calculation,/35−35=0＋49＝49（超出1～49，每次加\/减49）/);

console.log('PASS zodiac and fushi formulas show explicit category-specific cycling');
