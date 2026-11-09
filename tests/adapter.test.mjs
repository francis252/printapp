import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEntityRepository} from '../src/api/records.mjs';
import {createStorageAdapter} from '../src/api/storage.mjs';
test('adapter scopes every page, uses numeric JSON order and honors legacy limits',async()=>{
 const calls=[];const row=i=>({id:String(i),org_id:'A',record_type:'QuoteLineItem',data:{sort_order:i},version:1});
 const client={from(table){const c={table,eq:[],orders:[]};calls.push(c);const query={select(){return this;},eq(k,v){c.eq.push([k,v]);return this;},contains(k,v){c.contains=[k,v];return this;},order(k,v){c.orders.push([k,v]);return this;},async range(a,b){c.range=[a,b];return{data:Array.from({length:Math.max(0,Math.min(b,620)-a+1)},(_,i)=>row(a+i)),error:null};}};return query;}};
 const repo=createEntityRepository(client,async()=>'A','QuoteLineItem');
 const all=await repo.filter({quote_id:'legacy-quote'},'sort_order');
 assert.equal(all.length,621);assert.equal(calls.length,2);
 for(const c of calls){assert.deepEqual(c.eq,[['org_id','A'],['record_type','QuoteLineItem']]);assert.deepEqual(c.contains,['data',{quote_id:'legacy-quote'}]);assert.equal(c.orders[0][0],'data->sort_order');}
 calls.length=0;assert.equal((await repo.list('-created_date',10)).length,10);assert.deepEqual(calls[0].range,[0,9]);
 await assert.rejects(()=>repo.list('malicious,other'),/Invalid sort field/);
});
test('storage persists stable refs and re-signs after reload without changing mockup source',async()=>{
 let signed=0;
 const client={storage:{from(bucket){assert.equal(bucket,'shop-files');return{async createSignedUrl(path){signed++;return {data:{signedUrl:'https://shop.supabase.co/storage/v1/object/sign/shop-files/'+path+'?token=new'},error:null};}};}}};
 const adapter=createStorageAdapter(client,async()=>'A','https://shop.supabase.co');
 const saved={mockups:[{url:'shop-file://A/user/art.png',name:'Front'}]};
 const hydrated=await adapter.hydrate(saved);assert.match(hydrated.mockups[0].url,/token=new/);assert.deepEqual(adapter.dehydrate(hydrated),saved);
 await adapter.hydrate(saved);assert.equal(signed,1);
 await assert.rejects(()=>adapter.hydrate('shop-file://B/user/secret.png'),/Invalid private file/);
});
