const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, mocks={}) {
 const filename=resolve(__dirname,'..',path), module={exports:{}};
 vm.runInNewContext(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module,exports:module.exports,URL,require:id=>Object.hasOwn(mocks,id)?mocks[id]:createRequire(filename)(id)});
 return module.exports;
}
const model=load('lib/ads/direct-link.ts');
const media='https://example.supabase.co';
const valid={enabled:true,image_url:media+'/storage/v1/object/public/portal-media/editor/test.webp',title:'Criativo de teste',description:'Conteúdo exclusivo do teste automatizado.',target_url:model.DEFAULT_DIRECT_LINK,review_confirmed:true};
test('cards follow four news items, at most one in smaller nonempty feeds, and never remove news',()=>{
 for(let count=0;count<21;count++) {
  const news=Array.from({length:count},(_,i)=>i),feed=model.buildAdvertisingFeed(news,true);
  assert.equal(feed.filter(x=>x.kind==='ad').length,count===0?0:Math.max(1,Math.floor(count/4)));
  assert.deepEqual(Array.from(feed.filter(x=>x.kind==='news'),x=>x.item),news);
  if(count>=4) {let seen=0;for(const entry of feed) {if(entry.kind==='news')seen++;else assert.equal(seen%4,0);}}
  assert.equal(model.buildAdvertisingFeed(news,false).some(x=>x.kind==='ad'),false);
 }
});
test('only the intended HTTPS Direct Link shape is accepted',()=>{
 assert.equal(model.isDirectLink(model.DEFAULT_DIRECT_LINK),true);
 for(const url of ['javascript:alert(1)','http://uplcm.com/4/12272346','https://uplcm.com.evil.test/4/1','https://user:pass@uplcm.com/4/1','https://uplcm.com/4/0','https://other.test/4/1'])assert.equal(model.isDirectLink(url),false);
});
test('no active card without a complete reviewed creative and a portal-hosted image',()=>{
 assert.equal(model.creativeIssues(valid,media).length,0);
 assert.equal(model.creativeIssues(model.EMPTY_CREATIVE,media).length>0,true);
 for(const value of ['', 'https://external.test/tracking.jpg','data:image/svg+xml,test','/ads/../../test.jpg'])assert.equal(model.isCreativeImage(value,media),false);
 assert.equal(model.isCreativeImage('/ads/approved.webp',media),true);
 for(const field of ['title','description','image_url'])assert.equal(model.creativeIssues({...valid,[field]:''},media).length>0,true);
 assert.equal(model.creativeIssues({...valid,review_confirmed:false},media).length>0,true);
});
function route({origin=true,admin=true,backend=true,error=false}={}) {
 const writes=[];
 const {PATCH}=load('app/api/admin/advertising-creative/route.ts',{
  '@/lib/admin-auth':{isSameOrigin:()=>origin,getAdminSession:async()=>admin?{id:'test-admin'}:null},
  '@/lib/config':{getSupabaseUrl:()=>media,isAdminBackendConfigured:()=>backend},
  '@/lib/ads/direct-link':model,
  '@/lib/supabase/server':{createServiceSupabaseClient:()=>({from:table=>({upsert:async row=>{writes.push({table,row});return {error:error?{}:null};}})})},
 });
 return {writes,patch:body=>PATCH(new Request('https://portal.test/api/admin/advertising-creative',{method:'PATCH',body:JSON.stringify(body)}))};
}
test('admin writes validate origin, membership, creative and database availability',async()=>{
 for(const [options,status] of [[{origin:false},403],[{admin:false},401],[{backend:false},503],[{error:true},503]])assert.equal((await route(options).patch(valid)).status,status);
 const r=route();
 for(const input of [{...valid,title:''},{...valid,review_confirmed:false},{...valid,target_url:'javascript:alert(1)'},{...valid,script:'bad'}])assert.equal((await r.patch(input)).status,400);
 assert.equal(r.writes.length,0);
 assert.equal((await r.patch(valid)).status,200);assert.equal(r.writes[0].table,'advertising_creative');
 assert.equal(r.writes[0].row.target_url,model.DEFAULT_DIRECT_LINK);
 assert.equal((await r.patch(model.EMPTY_CREATIVE)).status,200);assert.equal(r.writes.at(-1).row.enabled,false);
});
