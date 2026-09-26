import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pingteCalculation} from '../lib/pingte-calculation.js';
const draw={period:268,numbers:[48,34,11,21,19,36,40].map(number=>({number:String(number)}))};
test('alternating, asymmetric, cyclic and digit sources have numeric steps',()=>{
  assert.equal(pingteCalculation('平1码尾数交替加减4',draw).raw,4);
  assert.match(pingteCalculation('平1码尾数交替加减4',draw).calculation,/48尾数8.*268期.*减4.*8－4＝4/);
  assert.equal(pingteCalculation('特码码合数不对称交替加2减3',draw).raw,1);
  assert.equal(pingteCalculation('平3码尾数循环步长2',draw).raw,3);
  assert.deepEqual(pingteCalculation('平4码固定加2',draw).sourcePositions,[4]);
  assert.throws(()=>pingteCalculation('未知算法',draw),/Unsupported/);
});
test('shared calculations preserve Python algorithm results for all candidates',()=>{
 const script="import sys,json;sys.path.insert(0,'scripts');from search_pingte_all_patterns import build_candidates;print(json.dumps([{'name':c['name'],'period':p,'raw':c['calculate']({'period':str(p),'numberList':[{'number':str(n)} for n in [48,34,11,21,19,36,40]]})} for c in build_candidates() for p in [267,268,269]]))";
 const cases=JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',script],{encoding:'utf8',maxBuffer:4*1024*1024}));
 for(const row of cases)assert.equal(pingteCalculation(row.name,{...draw,period:row.period}).raw,row.raw,row.name+' period '+row.period);
 console.log('Python parity checks:',cases.length);
});
test('every saved pingte and pingte2 algorithm is supported',()=>{
  const names=new Set();
  for(const folder of ['pingte-all','pingte-two']) {
    for(const file of readdirSync(new URL('../public/generated/'+folder+'/',import.meta.url)).filter(name=>name.endsWith('-manifest.json'))) {
      const data=JSON.parse(readFileSync(new URL('../public/generated/'+folder+'/'+file,import.meta.url),'utf8'));
      for(const method of data.methods||[]) for(const name of folder==='pingte-all'?[method.name]:[method.leftName,method.rightName]) if(name)names.add(name);
    }
  }
  for(const name of names) for(const period of [267,268,269]) {
    const result=pingteCalculation(name,{...draw,period});
    assert.ok(Number.isFinite(result.raw),name);
    assert.ok(result.calculation.includes('＝'),name);
  }
  console.log('Audited unique pingte algorithms:',names.size);
});
