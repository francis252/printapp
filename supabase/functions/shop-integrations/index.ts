import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {projectKey} from '../_shared/keys.ts';
import {ssBrowse,ssGetStyle,ssProductSearch} from '../_shared/supplier.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json({error:'Sign in required'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,projectKey('publishable'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!user)return json({error:'Sign in required'},401);
  const text=await req.text();if(text.length>65536)return json({error:'Request too large'},413);
  const input=JSON.parse(text);
  if(typeof input.org_id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.org_id))return json({error:'Invalid shop'},400);
  const membership=await client.from('shop_members').select('role').eq('org_id',input.org_id).eq('user_id',user.id).maybeSingle();
  if(membership.error||!membership.data)return json({error:'Shop access denied'},403);
  const suppliers={ssBrowse,ssGetStyle,ssProductSearch};
  if(Object.hasOwn(suppliers,input.action)){
   if(input.action==='ssBrowse'&&(typeof input.query!=='string'||input.query.trim().length<2||input.query.length>100))return json({error:'Enter a search between 2 and 100 characters.'},400);
   if(input.action==='ssGetStyle'&&!/^\d+$/.test(String(input.styleID||'')))return json({error:'Invalid supplier style ID'},400);
   if(input.action==='ssProductSearch'&&(typeof input.style_number!=='string'||!input.style_number.trim()||input.style_number.length>100))return json({error:'Invalid style number'},400);
   const account=Deno.env.get('SS_ACCOUNT_NUMBER'),key=Deno.env.get('SS_API_KEY');
   if(!account||!key)return json({error:'S&S credentials have not been configured on the server.'},503);
   const handler=suppliers[input.action as keyof typeof suppliers];
   const result=await handler(input,{ssAuth:`Basic ${btoa(`${account}:${key}`)}`,fetch:(url:string,init:RequestInit)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})});
   return json(result.data,result.status);
  }
  if(input.action==='sendQuoteEmail'){
   const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('SHOP_EMAIL_FROM');
   if(!key||!from)return json({error:'Verified email sender and delivery credentials are not configured.'},503);
   const to=String(input.to||'').trim(),subject=String(input.subject||''),html=String(input.body||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||to.length>320||!subject||subject.length>200||!html||html.length>50000)return json({error:'Invalid email fields'},400);
   // Staff can send only to a contact already present in their own shop.
   const [customer,quote]=await Promise.all([
    client.from('shop_records').select('id').eq('org_id',input.org_id).eq('record_type','Customer').eq('data->>email',to).limit(1),
    client.from('shop_records').select('id').eq('org_id',input.org_id).eq('record_type','Quote').eq('data->>customer_email',to).limit(1),
   ]);
   if(customer.error||quote.error)return json({error:'Unable to verify email recipient'},503);
   if(!customer.data.length&&!quote.data.length)return json({error:'Select a saved customer or quote recipient in this shop.'},403);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([input.org_id,user.id,to,subject,html])));
   const idempotency=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify({from,to:[to],subject,html}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)return json({error:`Email provider rejected the request (${response.status}).`},502);
   const sent=await response.json();return json({success:true,id:sent.id});
  }
  if(input.action==='createStripePaymentLink'||input.action==='markQuotePaid')return json({error:'Payments remain disabled until a verified Stripe webhook and secure quote approval endpoint are deployed.'},503);
  return json({error:'Unsupported action'},400);
 }catch{return json({error:'The integration request failed. Check the configured server credentials and try again.'},502);}
});
