import { supabase, requireClient } from './supabaseClient';
import { createEntityRepository, RECORD_TYPES } from './records.mjs';
import { createStorageAdapter } from './storage.mjs';
let activeMembership = null;
export function setActiveMembership(membership) { activeMembership=membership; }
async function getOrgId() {
  requireClient();
  if (!activeMembership) throw new Error('Choose an authorized shop first.');
  return activeMembership.org_id;
}
const storage = supabase ? createStorageAdapter(supabase,getOrgId,new URL(import.meta.env.VITE_SUPABASE_URL).origin) : null;
const unavailable = () => { throw new Error('Supabase is not configured.'); };
const entities = Object.fromEntries(RECORD_TYPES.map(type=>[type,supabase ? createEntityRepository(supabase,getOrgId,type,storage) : {list:unavailable,filter:unavailable,create:unavailable,update:unavailable,delete:unavailable}]));
const INTEGRATIONS = new Set(['ssBrowse','ssGetStyle','ssProductSearch','sendQuoteEmail','createStripePaymentLink']);
export const shop = {
  entities,
  auth: {
    async me() { const {data,error}=await requireClient().auth.getUser(); if(error)throw error; if(!data.user)throw new Error('Sign in required'); return {...data.user,role:activeMembership?.role,full_name:data.user.user_metadata?.full_name}; },
    async logout() { const {error}=await requireClient().auth.signOut(); if(error)throw error; activeMembership=null; },
    redirectToLogin() { window.location.assign('/login'); },
  },
  functions: {
    async invoke(name,body) {
      if(name==='markQuotePaid') throw new Error('Payment status can only be changed by a verified payment webhook.');
      if(!INTEGRATIONS.has(name)) throw new Error(`Backend function ${name} is not migrated.`);
      if(import.meta.env.VITE_SHOP_INTEGRATIONS_ENABLED!=='true') throw new Error('Supplier search, email and payments require migrated server functions. Saved catalog products remain available.');
      const {data,error}=await requireClient().functions.invoke('shop-integrations',{body:{action:name,org_id:await getOrgId(),...body}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      return {data};
    },
  },
  integrations: { Core: {UploadFile: storage?.UploadFile ?? unavailable, SendEmail:()=>{throw new Error('Email delivery has not been configured.');}} },
  async convertPresentation(id,itemIds,revision) {
    const org=await getOrgId();
    const {data,error}=await requireClient().rpc('shop_presentation_to_quote',{
      p_org_id:org,p_presentation_id:id,p_item_ids:itemIds,
      p_request_id:`${id}:${revision}:${[...itemIds].sort().join(',')}`,p_expected_version:revision,
    });
    if(error)throw error;
    return data;
  },
};
