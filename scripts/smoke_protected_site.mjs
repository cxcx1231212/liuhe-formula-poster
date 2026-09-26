// Live smoke test: secrets are supplied in the environment, never logged.
import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE,key=process.env.SMOKE_ENTRY_KEY;
if(!base||!key)throw Error('Set SMOKE_BASE and SMOKE_ENTRY_KEY');
const get=(path,cookie='')=>fetch(new URL(path,base),{headers:cookie?{cookie}:{},redirect:'manual'});
const outer=await get('/?t='+encodeURIComponent(key));assert.equal(outer.status,200);
const cookie=outer.headers.get('set-cookie').split(';')[0];
const nonce=(await outer.text()).match(/index\.html\?t=([a-f0-9]{64})/)[1];
assert.equal((await get('/index.html?t='+nonce,cookie)).status,200);
assert.equal((await get('/index.html?t='+nonce,cookie)).status,403);
async function decrypt(response,activeCookie){
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-formula-encrypted'),'1');
 const payload=await response.json();
 const k=await (await get('/_entry/key',activeCookie)).json();
 const secret=await crypto.subtle.importKey('raw',Buffer.from(k.key,'base64'),'AES-GCM',false,['decrypt']);
 let plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(payload.iv,'base64')},secret,Buffer.from(payload.data,'base64'));
 if(payload.encoding==='gzip')plain=await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 return {text:new TextDecoder().decode(plain),bytes:JSON.stringify(payload).length};
}
const started=performance.now();
const page=await decrypt(await get('/api/home-board?type=5&board=zodiac&category=1&page=1',cookie),cookie);
const first=JSON.parse(page.text);assert.equal(first.posts.length,10);
const second=JSON.parse((await decrypt(await get('/api/home-board?type=5&board=zodiac&category=1&page=2',cookie),cookie)).text);
assert.equal(second.posts.length,10);assert.notEqual(first.posts[0].href,second.posts[0].href);
const opened=await get('/posts/pingte/269/001?type=5',cookie);assert.equal(opened.status,302);
const link=opened.headers.get('location');assert.ok(link.includes('s='));assert.ok(!link.includes(key));
const guest=await get(link);assert.equal(guest.status,200);
const guestCookie=guest.headers.get('set-cookie').split(';')[0];
const shell=await guest.text();
const path=JSON.parse(shell.match(/fetch\(("[^"\n]+"),\{credentials/)[1]);
const content=await decrypt(await get(path,guestCookie),guestCookie);
assert.match(content.text,/算法过程/);assert.match(content.text,/wuxing-native-label/);
assert.equal((await get(link)).status,200);
for(const denied of ['/_entry/home','/index.html','/posts/pingte/269/002?type=5','/api/home-board?type=5&board=zodiac&category=1&page=1'])assert.equal((await get(denied,guestCookie)).status,403);
const back=await get('/_entry/home',cookie);assert.equal(back.status,302);assert.equal((await get(back.headers.get('location'),cookie)).status,200);
console.log(JSON.stringify({domain:new URL(base).host,postsPerPage:first.posts.length,pageBytes:page.bytes,pages:first.pages,shareGuest:200,shareReusable:true,otherPostForbidden:true,historyLabels:(content.text.match(/wuxing-native-label/g)||[]).length,testMs:Math.round(performance.now()-started)}));
