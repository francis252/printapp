import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripMetadata,flattenRecord} from '../src/api/records.mjs';
import {privateFileReference} from '../src/api/storage.mjs';
import {makeCsv,inDateRange,outstanding,agingBand} from '../src/lib/reporting.mjs';
test('all original quote, pricing, product and mockup files are byte-identical',()=>{
 const files=JSON.parse(readFileSync(new URL('../migration/protected-files.json',import.meta.url)));
 for(const [file,hash]of Object.entries(files)) assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
test('metadata cannot overwrite authoritative record identity',()=>{
 assert.deepEqual(stripMetadata({id:'spoof',org_id:'other',created_by:'forged',_version:3,name:'Keep',_ssColors:[]}),{name:'Keep'});
 const row=flattenRecord({id:'real',org_id:'shop',data:{id:'spoof',org_id:'other'},version:2});assert.equal(row.id,'real');assert.equal(row.org_id,'shop');assert.equal(row._version,2);
});
test('only our signed storage URLs become durable private references',()=>{
 const origin='https://shop.supabase.co';
 assert.equal(privateFileReference(origin+'/storage/v1/object/sign/shop-files/org/art.png?token=secret',origin),'shop-file://org/art.png');
 assert.equal(privateFileReference('https://supplier.com/a.png',origin),'https://supplier.com/a.png');
 assert.equal(privateFileReference('https://evil.com/storage/v1/object/sign/shop-files/x',origin),'https://evil.com/storage/v1/object/sign/shop-files/x');
});
test('CSV treats formulas as text and escapes customer content',()=>{
 const csv=makeCsv([{label:'Name',key:'name'}],[{name:'=HYPERLINK("bad")'},{name:'Customer, Inc.'}]);
 assert.match(csv,/'=HYPERLINK/);assert.match(csv,/"Customer, Inc\."/);assert.match(csv,/""bad""/);
});
test('report dates use Chicago calendar boundaries through daylight savings',()=>{
 assert.equal(inDateRange({created_date:'2026-11-02T03:00:00Z'},'2026-11-01','2026-11-01'),true);
 assert.equal(inDateRange({created_date:'2026-11-02T07:00:00Z'},'2026-11-01','2026-11-01'),false);
 assert.equal(inDateRange({},'2026-11-01',''),false);
});
test('receivables exclude drafts/voids and correctly age outstanding balances',()=>{
 assert.equal(outstanding({amount:100,paid:25,status:'Issued'}),75);
 assert.equal(outstanding({amount:100,paid:25,status:'Draft'}),0);
 assert.equal(outstanding({amount:100,paid:200,status:'Paid'}),0);
 assert.equal(agingBand('2026-10-01','2026-11-08'),'31–60 days');
 assert.equal(agingBand('2026-11-09','2026-11-08'),'Current');
});
