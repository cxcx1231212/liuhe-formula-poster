import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const methods=Array.from({length:25},(_,sourceIndex)=>({sourceIndex,name:'算法'+sourceIndex,recentStreak:25-sourceIndex}));
const exports={};let assetCalls=0;
const code=ts.transpileModule(readFileSync(new URL('../lib/home-board-data.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env:{ASSETS:{fetch:async()=>{assetCalls++;return Response.json({issue:269,methods});}}}}:{makeHomeBoardPost:(type,board,category,issue,m,index)=>({href:`/posts/${board}/${issue}/${m.sourceIndex??index}?type=${type}`,title:'作者'+(m.sourceIndex??index),issue:issue+'期'})},Response,Request,Map,Set,Number,Array,Error});
test('board returns only requested ten rows and keeps stable post identity',async()=>{
 const one=await exports.getHomeBoardPage('5','pingte','one',1),two=await exports.getHomeBoardPage('5','pingte','one',2),last=await exports.getHomeBoardPage('5','pingte','one',99);
 assert.equal(one.posts.length,10);assert.equal(two.posts.length,10);assert.equal(last.posts.length,5);assert.equal(last.page,3);
 assert.notEqual(one.posts[0].href,two.posts[0].href);assert.match(two.posts[0].href,/269\/10\?/);
 assert.equal(one.total,25);assert.equal(one.pages,3);
 for(const page of [NaN,0,-1,1.5])await assert.rejects(exports.getHomeBoardPage('5','pingte','one',page));
 assert.equal(exports.validBoardCategory('pingte','two'),true);assert.equal(exports.validBoardCategory('pingte','../../bad'),false);
});
test('server search returns at most thirty matches and counts full result set',async()=>{
 const result=await exports.searchHomeBoards('5','作者',2);
 assert.equal(result.posts.length,30);assert.equal(result.page,2);assert.ok(result.total>30);assert.ok(assetCalls>1);
 const empty=await exports.searchHomeBoards('5','不存在',1);assert.equal(empty.total,0);
});
