import assert from 'node:assert/strict';
import {buildZodiacPosterItem} from '../lib/zodiac-history.ts';

const method={name:'平2码－平6码交替加减14',baseName:'平2码－平6码',operation:'alternate_add_subtract',amount:14};
const draw=(period,p2,p6)=>({period,numbers:[1,p2,3,4,5,p6,7].map(number=>({number:String(number),animal:'',element:''}))});

const negative=buildZodiacPosterItem(method,[draw(252,41,48)],253);
assert.equal(negative.next[0],'兔');
assert.match(negative.branches[0].calculation,/\(41－48\)−14＝-21＋49＝28，28属兔（超出1～49，每次加\/减49）/);

const zero=buildZodiacPosterItem(method,[draw(253,35,49)],254);
assert.equal(zero.next[0],'马');
assert.match(zero.branches[0].calculation,/\(35－49\)\+14＝0＋49＝49，49属马（超出1～49，每次加\/减49）/);

const tails={name:'平1码尾数＋特码尾数除9余数',baseName:'平1码尾数＋特码尾数',operation:'modulo',amount:9};
const tail=buildZodiacPosterItem(tails,[{period:256,numbers:[40,15,9,37,7,3,1].map(number=>({number:String(number),animal:'',element:''}))}],257);
assert.match(tail.branches[0].calculation,/\(40尾0＋01尾1\)÷余数9＝1，01属马/);

console.log('PASS zodiac formulas show source meaning and explicit 1-49 cycling');
