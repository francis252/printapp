import {useEffect,useState} from 'react';
import {shop} from '@/api/shopClient';
import {useAuth} from '@/lib/AuthContext';
import ManagerOnly from '@/components/ManagerOnly';
import {money} from '@/lib/reporting.mjs';
import {Plus, Search, X} from 'lucide-react';
const empty={number:'',name:'',customer_id:'',customer_name:'',vendor_name:'',quote_id:'',amount:'',paid:0,status:'Draft',due_date:'',date:'',category:'',notes:''};
export default function Operations({kind}){return <ManagerOnly><Records key={kind} kind={kind}/></ManagerOnly>;}
function Records({kind}) {
 const [rows,setRows]=useState([]),[customers,setCustomers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const {membership}=useAuth();const invoice=kind==='Invoice';const title=invoice?'Invoices':'Expenses';
 async function load(){setLoading(true);setError('');try{const [r,c]=await Promise.all([shop.entities[kind].list(),shop.entities.Customer.list()]);setRows(r);setCustomers(c);}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[kind,membership.org_id]);
 const patch=(k,v)=>setForm(f=>({...f,[k]:v}));
 async function save(e){e.preventDefault();setBusy(true);setError('');try{
  if(!form.name.trim()||!Number.isFinite(Number(form.amount))||Number(form.amount)<0||Number(form.paid)<0)throw new Error('Enter a description and valid nonnegative amounts.');
  const input={...form,amount:Number(form.amount),paid:Number(form.paid)||0};
  if(form.id)await shop.entities[kind].update(form.id,input);else await shop.entities[kind].create(input);
  setForm(null);await load();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 const filtered=rows.filter(r=>[r.name,r.number,r.customer_name,r.vendor_name].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className="shop-page"><header className="shop-page-header"><div><p className="shop-eyebrow">Shop finances</p><h1>{title}</h1><p className="text-slate-500 mt-2">{invoice?'Track issued invoices and manually recorded payments.':'Record supplier bills and operating expenses.'}</p></div><button className="shop-button" onClick={()=>setForm({...empty,status:invoice?'Draft':'Unpaid'})}><Plus size={16}/>New {kind.toLowerCase()}</button></header>
 <p className="text-xs text-slate-500 mb-5">These records do not charge a card, send an invoice, or sync with your accounting software.</p>
 {error&&<div className="shop-error" role="alert">{error} <button onClick={load} className="underline">Retry</button></div>}
 <div className="relative max-w-md mb-6"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input className="shop-input pl-10" placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="shop-panel overflow-x-auto"><table className="shop-table"><thead><tr><th>Reference / description</th><th>{invoice?'Customer':'Supplier'}</th><th>Due</th><th>Status</th><th>Amount</th><th>{invoice?'Recorded paid':'Paid'}</th><th/></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.number||'—'}</strong><div className="text-slate-500">{r.name}</div></td><td>{invoice?r.customer_name:r.vendor_name}</td><td>{r.due_date||'—'}</td><td><span className="shop-pill">{r.status}</span></td><td>{money(r.amount)}</td><td>{money(r.paid)}</td><td><button className="underline" onClick={()=>setForm({...empty,...r})}>Edit</button></td></tr>)}</tbody></table>{loading?<p className="shop-empty">Loading records…</p>:!filtered.length&&<p className="shop-empty">No {title.toLowerCase()} match this view.</p>}</div>
 {form&&<div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-center items-center p-4"><form onSubmit={save} className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-auto"><div className="flex justify-between items-center mb-5"><h2 className="text-xl font-semibold">{form.id?'Edit':'New'} {kind.toLowerCase()}</h2><button type="button" aria-label="Close" disabled={busy} onClick={()=>{if(window.confirm('Close this editor? Unsaved changes will be discarded.'))setForm(null);}}><X/></button></div><div className="grid sm:grid-cols-2 gap-4">
 {['number','name',...(invoice?[]:['vendor_name','category']),'date','due_date','amount','paid'].map(key=><label className={`text-sm ${key==='name'?'sm:col-span-2':''}`} key={key}>{({number:'Reference',name:'Description',vendor_name:'Supplier',due_date:'Due date',paid:'Recorded paid',date:'Record date'})[key]||key[0].toUpperCase()+key.slice(1)}<input className="shop-input mt-1" required={['name','amount'].includes(key)} min={['amount','paid'].includes(key)?0:undefined} step="0.01" type={['amount','paid'].includes(key)?'number':key.includes('date')?'date':'text'} value={form[key]??''} onChange={e=>patch(key,e.target.value)}/></label>)}
 {invoice&&<label className="text-sm sm:col-span-2">Customer<select className="shop-input mt-1" value={form.customer_id} onChange={e=>{const c=customers.find(c=>c.id===e.target.value);setForm(f=>({...f,customer_id:c?.id||'',customer_name:c?.company_name||c?.contact_name||''}));}}><option value="">Select a customer</option>{customers.map(c=><option value={c.id} key={c.id}>{c.company_name||c.contact_name}</option>)}</select></label>}
 <label className="text-sm">Status<select className="shop-input mt-1" value={form.status} onChange={e=>patch('status',e.target.value)}>{(invoice?['Draft','Issued','Partially Paid','Paid','Void']:['Unpaid','Partially Paid','Paid','Void']).map(s=><option key={s}>{s}</option>)}</select></label><label className="text-sm sm:col-span-2">Internal notes<textarea className="shop-input mt-1" value={form.notes} onChange={e=>patch('notes',e.target.value)}/></label></div>{error&&<p className="shop-error mt-3" role="alert">{error}</p>}<button className="shop-button mt-6 w-full" disabled={busy}>{busy?'Saving…':'Save record'}</button></form></div>}
 </div>;
}
