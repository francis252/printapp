import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '@/api/supabaseClient';
import { setActiveMembership } from '@/api/shopClient';
const AuthContext = createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(null),[membership,setMembership]=useState(null),[memberships,setMemberships]=useState([]);
  const [isLoadingAuth,setLoading]=useState(true),[authError,setError]=useState(null);
  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    let live=true;let generation=0;
    async function load(session){
      const current=++generation;
      setLoading(true);setError(null);setMembership(null);setActiveMembership(null);
      setUser(session?.user??null);
      if(!session){setMemberships([]);setLoading(false);return;}
      const {data,error}=await supabase.from('shop_members').select('org_id,role,display_name,shop_organizations(name)').eq('user_id',session.user.id);
      if(!live||current!==generation)return;
      if(error)setError(error.message);else{
        setMemberships(data);
        if(data.length===1){setMembership(data[0]);setActiveMembership(data[0]);}
      }
      setLoading(false);
    }
    // Schedule outside the auth callback to avoid locking Supabase's auth client.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>live&&load(session));});
    supabase.auth.getSession().then(({data,error})=>{if(live){if(error){setError(error.message);setLoading(false);}else load(data.session);}});
    return()=>{live=false;subscription.unsubscribe();setActiveMembership(null);};
  },[]);
  const chooseMembership=m=>{setActiveMembership(m);setMembership(m);};
  const logout=async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;};
  return <AuthContext.Provider value={{user,membership,memberships,chooseMembership,isLoadingAuth,isLoadingPublicSettings:false,authError,isConfigured,isAuthenticated:!!user,logout,navigateToLogin:()=>window.location.assign('/login')}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
export function AccessGate({children}) {
  const a=useAuth();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function login(e){e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function resendVerification(){
    if(!email.trim()){setError('Enter your email address first.');return;}
    setBusy(true);setError('');setNotice('');
    try{const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:window.location.origin+'/dashboard'}});if(error)throw error;setNotice('Verification email requested. Open the email, then return here to sign in.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  let content;
  if(!a.isConfigured)content=<><h1 className="text-3xl font-semibold">Your shop, ready for its next chapter.</h1><p className="mt-4 text-slate-600">The migration build is ready to connect. Configure the Supabase project URL and publishable key, then apply the reviewed staging migration.</p><p className="mt-4 text-sm text-slate-500">Your existing Base44 data has not been imported. No sample records have been added.</p></>;
  else if(a.isLoadingAuth)content=<p role="status">Opening your shop…</p>;
  else if(a.authError)content=<><h1>Unable to open your shop</h1><p role="alert" className="my-4 text-red-700">{a.authError}</p><button className="shop-button" onClick={()=>window.location.reload()}>Retry</button></>;
  else if(!a.user)content=<form onSubmit={login} className="space-y-5"><div><h1 className="text-3xl font-semibold">Welcome back.</h1><p className="mt-2 text-slate-500">Sign in to 4R Shop Management.</p></div><label className="block text-sm">Email<input className="shop-input mt-2" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm">Password<input className="shop-input mt-2" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className="shop-button w-full" disabled={busy}>{busy?'Please wait…':'Sign in'}</button><button type="button" className="text-sm underline text-slate-600" disabled={busy} onClick={resendVerification}>Resend verification email</button>{notice&&<p role="status" className="text-sm text-slate-600">{notice}</p>}<p className="text-xs text-slate-500">Access is provided by your shop owner.</p></form>;
  else if(!a.membership)content=<><h1 className="text-2xl font-semibold">{a.memberships.length?'Choose your shop':'Your account needs shop access'}</h1><div className="space-y-3 mt-5">{a.memberships.map(m=><button key={m.org_id} className="shop-button block w-full" onClick={()=>a.chooseMembership(m)}>{m.shop_organizations?.name||m.org_id}</button>)}</div>{!a.memberships.length&&<p className="my-4 text-slate-500">Ask your owner to add this account to the shop. Signing in does not grant shop access.</p>}<button className="mt-6 underline text-sm" onClick={a.logout}>Sign out</button></>;
  else return children;
  return <main className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-6"><section className="w-full max-w-lg bg-white border border-[#e7dfd3] rounded-2xl p-8 md:p-12 shadow-sm"><p className="text-xs uppercase tracking-[.25em] text-[#9b7b52] font-bold mb-8">4R Stitching Co. / Shop Management</p>{content}</section></main>;
}
