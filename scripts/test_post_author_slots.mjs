import assert from 'node:assert/strict';
import {postAuthorBySlot} from '../lib/post-authors.ts';

// Published names must remain unchanged when the pool is extended.
const legacy={
  '1':['广东阿强','长沙周荣','广西戚山','闽侯彭国'],
  '5':['百色吴银','广州秦丽','宁德谢建','泉州郎宝'],
  '8':['定安尤云','贺州姜胜','宝安邹财','南海鲁芳'],
};
const legacySlots=[0,99999,100000,137322];
for(const type of ['1','5','8']){
  legacySlots.forEach((slot,index)=>assert.equal(postAuthorBySlot(type,slot),legacy[type][index]));
}

// The new author range must keep names distinct across all lottery types.
const names=new Set();
for(const type of ['1','5','8']){
  for(let slot=0;slot<300000;slot++){
    const name=postAuthorBySlot(type,slot);
    assert.equal(Array.from(name).length,4,`${type}/${slot}: ${name}`);
    assert.ok(!names.has(name),`duplicate author ${name} at ${type}/${slot}`);
    names.add(name);
  }
}
assert.equal(names.size,900000);
console.log('PASS existing author names retained; 900,000 distinct four-character slots');

