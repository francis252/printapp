import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ssBrowse,ssGetStyle,ssProductSearch} from '../supabase/functions/_shared/supplier.mjs';
const response=data=>({ok:true,json:async()=>data});
test('supplier browse preserves the exported picker response and validates short searches',async()=>{
 let called=false;
 const short=await ssBrowse({query:'x'},{fetch(){called=true;}});assert.equal(short.status,400);assert.equal(called,false);
 const result=await ssBrowse({query:'Polo & Cap'},{ssAuth:'Basic test',fetch:async(url,init)=>{
  assert.match(url,/search=Polo%20%26%20Cap/);assert.equal(init.headers.Authorization,'Basic test');
  return response([{styleID:1,styleName:'P1',brandName:'Brand',colorFrontImage:'image.jpg'}]);
 }});
 assert.equal(result.data.styles[0]._source,'ss');assert.equal(result.data.styles[0].styleID,1);
 assert.equal(result.data.styles[0].image,'https://www.ssactivewear.com/image.jpg');
});
test('style lookup retains color deduplication, size order and lowest supplier cost',async()=>{
 const result=await ssGetStyle({styleID:1},{ssAuth:'Basic test',fetch:async url=>response(url.includes('/products/')?[
 {colorName:'Navy',sizeName:'XL',customerPrice:10,colorFrontImage:'navy.jpg'},
 {colorName:'Navy',sizeName:'S',customerPrice:8,colorFrontImage:'navy.jpg'},
 {colorName:'Tan',sizeName:'L',customerPrice:9,colorFrontImage:'tan.jpg'},
 ]:[{title:'Polo',styleID:1}])});
 assert.equal(result.data.colors.length,2);assert.deepEqual(result.data.product.sizes,['S','L','XL']);assert.equal(result.data.product.lowestPrice,8);
});
test('style-number lookup preserves original mockup color/image field names',async()=>{
 const result=await ssProductSearch({style_number:'112'},{ssAuth:'Basic test',fetch:async url=>response(url.includes('/styles/')?[{styleID:7,title:'Cap'}]:[{colorName:'Navy',colorCode:'N',colorBackImage:'back.jpg',color1:'000080'}])});
 assert.equal(result.data.colors[0].backImage,'https://www.ssactivewear.com/back.jpg');assert.equal(result.data.colors[0].color1,'000080');
});
