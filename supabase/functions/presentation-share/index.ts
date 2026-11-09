import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {projectKey} from '../_shared/keys.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const text=await request.text();if(text.length>8192)return json({error:'Request too large'},413);
  const input=JSON.parse(text);
  if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))return json({error:'Link unavailable'},404);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=createClient(url,projectKey('publishable'),{auth:{persistSession:false}});
  if(input.action==='feedback'){
   const {error}=await anon.rpc('shop_submit_presentation_feedback',{p_token:input.token,p_item_id:input.item_id,p_visitor_id:input.visitor_id,p_reaction:input.reaction??null,p_comment:input.comment??''});
   return error?json({error:error.message},400):json({ok:true});
  }
  const {data,error}=await anon.rpc('shop_get_presentation_share',{p_token:input.token});
  if(error)return json({error:'This link has expired or is unavailable.'},404);
  // Only sign paths selected by the token-protected database snapshot, never request paths.
  const admin=createClient(url,projectKey('secret'),{auth:{persistSession:false}});
  for(const item of data.presentation.items){
   item.images=await Promise.all((item.images||[]).map(async (image:unknown)=>{
    if(typeof image!=='string')return null;
    if(image.startsWith('shop-file://')){
     const path=image.slice('shop-file://'.length);
     if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\//i.test(path)||path.split('/').includes('..'))return null;
     const ttl=Math.min(600,Math.max(1,Math.floor((Date.parse(data.expires_at)-Date.now())/1000)));
     const {data:signed,error}=await admin.storage.from('shop-files').createSignedUrl(path,ttl);
     return error?null:signed.signedUrl;
    }
    return /^https:\/\//i.test(image)?image:null;
   }));
  }
  return json(data);
 }catch{return json({error:'Unable to open this presentation.'},400);}
});
