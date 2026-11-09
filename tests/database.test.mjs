import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const O1='10000000-0000-0000-0000-000000000001',O2='10000000-0000-0000-0000-000000000002';
const U1='20000000-0000-0000-0000-000000000001',U2='20000000-0000-0000-0000-000000000002',EMP='20000000-0000-0000-0000-000000000003';
test('database isolation, revision checks and transactional presentation conversion',async t=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/202611080001_shop.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/202611080002_presentation_sharing.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users values ($1),($2),($3)',[U1,U2,EMP]);
 await db.query("insert into shop_organizations(id,name) values($1,'Shop A'),($2,'Shop B')",[O1,O2]);
 await db.query("insert into shop_members values($1,$2,'owner','A'),($3,$4,'owner','B'),($1,$5,'employee','E')",[O1,U1,O2,U2,EMP]);
 async function user(id,role='authenticated'){await db.exec(`reset role;set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
 async function insert(org,type,id,data){return db.query('insert into shop_records(org_id,record_type,id,data) values($1,$2,$3,$4) returning *',[org,type,id,data]);}
 await user(U1);
 await insert(O1,'Customer','legacy-customer',{contact_name:'Real customer'});
 await insert(O1,'Presentation','p1',{name:'Uniform ideas',customer_id:'legacy-customer',items:[{id:'item-a',product_name:'Polo',unit_price:18.75,sizes:[{size:'L',quantity:12}],mockups:[{url:'shop-file://'+O1+'/'+U1+'/mockup.png'}],decoration_colors:['navy']},{id:'item-b',product_name:'Cap',unit_price:12}]});
 await insert(O1,'Invoice','i1',{amount:100,paid:25,status:'Issued'});
 await t.test('cross-shop writes and identity forgery fail',async()=>{
  await assert.rejects(()=>insert(O2,'Customer','bad',{}),/row-level security/);
  await assert.rejects(()=>db.query('update shop_records set org_id=$1 where id=$2',[O2,'p1']));
  await assert.rejects(()=>db.query("update shop_members set role='owner' where user_id=$1",[EMP]),/permission denied/);
 });
 await t.test('metadata is stamped and records keep legacy text ids',async()=>{
  const r=(await db.query("select * from shop_records where id='legacy-customer'")).rows[0];
  assert.equal(r.created_by,U1);assert.equal(r.id,'legacy-customer');assert.equal(r.version,1);
 });
 await t.test('patches merge and reject stale revisions',async()=>{
  await db.query("select shop_patch_record($1,'Presentation','p1',$2,1)",[O1,{notes:'Internal'}]);
  await assert.rejects(()=>db.query("select shop_patch_record($1,'Presentation','p1','{}',1)",[O1]),/changed/);
  const r=(await db.query("select data,version from shop_records where id='p1'")).rows[0];
  assert.equal(r.data.items.length,2);assert.equal(r.data.notes,'Internal');assert.equal(r.version,2);
 });
 await t.test('conversion preserves original picker prices, sizes and mockup output',async()=>{
  const params=[O1,'p1',['item-a'],'p1:2:item-a',2];
  const first=(await db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5) id',params)).rows[0].id;
  const second=(await db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5) id',params)).rows[0].id;
  assert.equal(first,second);
  const items=(await db.query("select data from shop_records where record_type='QuoteLineItem'")).rows;
  assert.equal(items.length,1);assert.equal(items[0].data.unit_price,18.75);assert.equal(items[0].data.sizes[0].quantity,12);assert.equal(items[0].data.mockups[0].url,'shop-file://'+O1+'/'+U1+'/mockup.png');
  const q=(await db.query('select data from shop_records where id=$1',[first])).rows[0];assert.equal(q.data.status,'Open');assert.equal(q.data.total,0);
 });
 await t.test('missing selection and stale conversion cannot leave partial quotes',async()=>{
  const before=(await db.query("select count(*) n from shop_records where record_type='Quote'")).rows[0].n;
  await assert.rejects(()=>db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5)',[O1,'p1',['missing'],'p1:2:missing',2]),/missing/);
  await assert.rejects(()=>db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5)',[O1,'p1',['item-b'],'p1:1:item-b',1]),/changed/);
  assert.equal((await db.query("select count(*) n from shop_records where record_type='Quote'")).rows[0].n,before);
 });
 await t.test('foreign customer references cannot cross shops',async()=>{
  await user(U2);await insert(O2,'Customer','shop-b-customer',{contact_name:'B'});await user(U1);
  await assert.rejects(()=>insert(O1,'Quote','bad-ref',{customer_id:'shop-b-customer'}),/another shop/);
 });
 await t.test('employee cannot read financials or another employee presentation',async()=>{
  await user(EMP);
  assert.equal((await db.query("select count(*) n from shop_records where record_type in ('Invoice','Expense','Presentation')")).rows[0].n,0);
  await assert.rejects(()=>insert(O1,'Expense','bad-expense',{amount:1}),/row-level security/);
  await assert.rejects(()=>db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5)',[O1,'p1',['item-a'],'p1:2:item-a',2]),/access denied/);
 });
 await t.test('another shop cannot read or convert shop A records',async()=>{
  await user(U2);assert.equal((await db.query("select count(*) n from shop_records where org_id=$1",[O1])).rows[0].n,0);
  await assert.rejects(()=>db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5)',[O1,'p1',['item-a'],'p1:2:item-a',2]),/access denied/);
 });
 await t.test('anonymous users have no records or conversion access',async()=>{
  await user('', 'anon');await assert.rejects(()=>db.query('select * from shop_records'),/permission denied/);
  await assert.rejects(()=>db.query('select shop_presentation_to_quote($1,$2,$3,$4,$5)',[O1,'p1',['item-a'],'p1:2:item-a',2]),/permission denied/);
 });
 await t.test('private storage rejects a cross-shop upload path',async()=>{
  await user(U1);await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['shop-files',`${O1}/${U1}/new.png`]);
  await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['shop-files',`${O2}/${U1}/new.png`]),/row-level security/);
  await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['shop-files',`${O1}/${U2}/new.png`]),/row-level security/);
 });
 await t.test('pricing settings are shared but only managers can change them',async()=>{
  await user(U1);await db.query('select shop_save_preferences($1,$2)',[O1,{qm_markup:'125',qm_roundup:'false'}]);
  await db.query('select shop_save_preferences($1,$2)',[O1,{qm_company_info:'{}'}]);
  await user(EMP);const settings=(await db.query("select data from shop_records where record_type='ShopSettings'")).rows[0].data;
  assert.equal(settings.qm_markup,'125');assert.equal(settings.qm_roundup,'false');
  await assert.rejects(()=>db.query('select shop_save_preferences($1,$2)',[O1,{qm_markup:'999'}]),/row-level security/);
  await assert.rejects(()=>db.query('select shop_save_preferences($1,$2)',[O1,{secret_key:'not allowed'}]),/Invalid settings/);
 });
 await t.test('customer sharing only releases a whitelisted snapshot',async()=>{
  await user(U1);
  await db.query("select shop_patch_record($1,'Presentation','p1',$2,2)",[O1,{notes:'Do not expose',customer_email:'private@example.com',items:[{id:'item-a',product_name:'Polo',cost_price:5,markup_percent:200,notes:'Private line note',supplier_name:'Private supplier',unit_price:18.75,mockups:[{url:'shop-file://'+O1+'/'+U1+'/mockup.png'}]}]}]);
  const grant=(await db.query("select shop_create_presentation_share($1,'p1',3,false) result",[O1])).rows[0].result;
  await user('', 'anon');
  const shared=(await db.query('select shop_get_presentation_share($1) result',[grant.token])).rows[0].result;
  assert.equal(shared.presentation.items[0].product_name,'Polo');
  const serialized=JSON.stringify(shared);for(const secret of ['Do not expose','private@example.com','Private line note','Private supplier','cost_price','markup_percent'])assert.equal(serialized.includes(secret),false);
  assert.equal(shared.presentation.items[0].unit_price,null);
  await assert.rejects(()=>db.query('select * from shop_presentation_shares'),/permission denied/);
  await db.query('select shop_submit_presentation_feedback($1,$2,$3,$4,$5)',[grant.token,'item-a',U2,'like','Looks good']);
  await assert.rejects(()=>db.query('select shop_submit_presentation_feedback($1,$2,$3,$4,$5)',[grant.token,'fake',U2,'like','x']),/Item unavailable/);
  await user(U2);
  await assert.rejects(()=>db.query('select shop_revoke_presentation_share($1)',[grant.id]),/access denied/);
  await user(U1);
  assert.equal((await db.query('select * from shop_presentation_feedback')).rows[0].reaction,'like');
  await db.query('select shop_revoke_presentation_share($1)',[grant.id]);await user('', 'anon');
  await assert.rejects(()=>db.query('select shop_get_presentation_share($1)',[grant.token]),/expired or unavailable/);
  await assert.rejects(()=>db.query('select shop_submit_presentation_feedback($1,$2,$3,$4,$5)',[grant.token,'item-a',U2,'like','x']),/expired or unavailable/);
 });
 await t.test('sharing cannot sign another shop artwork path',async()=>{
  await user(U1);await insert(O1,'Presentation','bad-art',{name:'Bad ref',items:[{id:'a',product_name:'Polo',mockups:[{url:'shop-file://'+O2+'/'+U2+'/private.png'}]}]});
  await assert.rejects(()=>db.query("select shop_create_presentation_share($1,'bad-art',1,false)",[O1]),/another shop/);
 });
 await db.close();
});
