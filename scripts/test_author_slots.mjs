import assert from 'node:assert/strict';
import {postAuthorBySlot} from '../lib/post-authors.ts';

const LEGACY_LIMIT=100000;
const SLOT_LIMIT=137323;
const names=new Set();
for(const type of ['1','5','8']){
  for(let slot=0;slot<SLOT_LIMIT;slot++){
    const name=postAuthorBySlot(type,slot);
    assert(!names.has(name),`duplicate author ${name} at ${type}/${slot}`);
    names.add(name);
  }
}
assert.equal(names.size,SLOT_LIMIT*3);
assert.equal(postAuthorBySlot('1',0),postAuthorBySlot('1',0));
assert.notEqual(postAuthorBySlot('1',LEGACY_LIMIT),postAuthorBySlot('5',0));
console.log(`PASS ${names.size} unique stable author slots`);
