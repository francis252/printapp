import {useEffect,useState,useRef} from 'react';
import {supabase} from '@/api/supabaseClient';
import {useAuth} from '@/lib/AuthContext';
const defaults={qm_markup:'125',qm_roundup:'false',qm_markup_tiers:'[]',qm_company_info:'{}'};
let activeOrg=null;
function apply(values){for(const [key,fallback] of Object.entries(defaults))localStorage.setItem(key,values[key]??fallback);}
export async function savePreferences(patch){
 if(!activeOrg)throw new Error('No shop is selected.');
 if(patch.qm_markup!==undefined&&(!Number.isFinite(Number(patch.qm_markup))||Number(patch.qm_markup)<0))throw new Error('Enter a valid markup.');
 const org=activeOrg;const {data,error}=await supabase.rpc('shop_save_preferences',{p_org_id:org,p_patch:patch});if(error)throw error;if(activeOrg!==org)throw new Error('The selected shop changed. Reload before continuing.');apply(data);
}
export default function PreferencesBridge({children}){
 const {membership}=useAuth();const [ready,setReady]=useState(false),[error,setError]=useState('');const generation=useRef(0);
 async function load(){const epoch=++generation.current;setReady(false);setError('');try{
  apply(defaults);
  const {data,error}=await supabase.from('shop_records').select('data').eq('org_id',membership.org_id).eq('record_type','ShopSettings').eq('id','preferences').maybeSingle();if(epoch!==generation.current)return;if(error)throw error;
  apply(data?.data||defaults);activeOrg=membership.org_id;setReady(true);
 }catch(e){if(epoch===generation.current)setError(e.message);}}
 useEffect(()=>{load();return()=>{generation.current++;if(activeOrg===membership.org_id){activeOrg=null;apply(defaults);}};},[membership.org_id]);
 if(error)return <div className="p-10"><p className="shop-error" role="alert">Unable to load shop settings: {error}</p><button className="shop-button" onClick={load}>Retry</button></div>;
 if(!ready)return <div className="p-10 text-slate-500" role="status">Loading your shop settings…</div>;
 return children;
}
