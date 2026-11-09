import {useEffect,useMemo,useState} from 'react';
import {shop} from '@/api/shopClient';
import ManagerOnly from '@/components/ManagerOnly';
import {makeCsv,money,inDateRange,outstanding,agingBand} from '@/lib/reporting.mjs';
import {Download,ArrowUpRight} from 'lucide-react';
import {Link} from 'react-router-dom';
const reports={
 'Quotes':{entity:'Quote',columns:['quote_number','job_name','customer_name','status','total','sales_rep','created_date']},
 'Presentations':{entity:'Presentation',columns:['name','customer_name','status','sales_rep','follow_up_date','expiration_date','created_date']},
 'Open orders':{entity:'Job',columns:['job_number','title','customer_name','status_production','status_shipping','total_amount','created_date']},
 'Purchase orders':{entity:'PurchaseOrder',columns:['po_number','vendor_name','customer_name','status','deadline','subtotal','created_date']},
 'Invoices':{entity:'Invoice',columns:['number','name','customer_name','status','due_date','amount','paid','created_date']},
 'Receivables & aging':{entity:'Invoice',columns:['number','customer_name','due_date','amount','paid','outstanding','aging']},
 'Expenses':{entity:'Expense',columns:['number','name','vendor_name','category','status','amount','paid','created_date']},
 'Customers':{entity:'Customer',columns:['company_name','contact_name','email','phone','created_date']},
 'Suppliers':{entity:'Supplier',columns:['name','contact_name','email','phone','created_date']},
};
export default function ShopReports(){return <ManagerOnly><Reports/></ManagerOnly>;}
function Reports(){
 const [report,setReport]=useState('Quotes'),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState('');
 const spec=reports[report];const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 useEffect(()=>{let live=true;setLoading(true);setError('');setRows([]);setStatus('');shop.entities[spec.entity].list().then(data=>{if(live)setRows(data);}).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false;};},[report]);
 const filtered=useMemo(()=>rows.filter(r=>inDateRange(r,start,end)&&(!status||r.status===status)&&Object.values(r).some(v=>typeof v==='string'&&v.toLowerCase().includes(search.toLowerCase()))).filter(r=>report==='Open orders'?!['Completed','Shipped','Cancelled'].includes(r.status_shipping||r.status):report==='Receivables & aging'?outstanding(r)>0:true).map(r=>({...r,outstanding:outstanding(r),aging:agingBand(r.due_date,today)})),[rows,start,end,search,status,report,today]);
 const columns=spec.columns.map(key=>({key,label:key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}));
 function download(){const blob=new Blob([makeCsv(columns,filtered)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`4R-${report.replaceAll(' ','-')}-${today}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="shop-page"><header className="shop-page-header"><div><p className="shop-eyebrow">A clearer view of your shop</p><h1>Reports</h1><p className="mt-2 text-slate-500">Filter your records and export exactly what you see.</p></div><button className="shop-button" disabled={loading||!!error||!filtered.length} onClick={download}><Download size={16}/>Export CSV</button></header>
 <div className="shop-panel p-5 flex flex-wrap gap-4 items-end mb-6"><label className="text-xs font-semibold text-slate-500">Report<select className="shop-input mt-2 min-w-48" value={report} onChange={e=>setReport(e.target.value)}>{Object.keys(reports).map(r=><option key={r}>{r}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Created from<input aria-label="Created from" type="date" className="shop-input mt-2" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="text-xs font-semibold text-slate-500">Created through<input aria-label="Created through" type="date" className="shop-input mt-2" value={end} min={start||undefined} onChange={e=>setEnd(e.target.value)}/></label><label className="text-xs font-semibold text-slate-500">Status<select className="shop-input mt-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{[...new Set(rows.map(r=>r.status).filter(Boolean))].map(s=><option key={s}>{s}</option>)}</select></label><label className="text-xs font-semibold text-slate-500 flex-1">Search<input className="shop-input mt-2" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Customer, rep or reference"/></label></div>
 {report==='Receivables & aging'&&<p className="mb-5 text-lg font-semibold">Outstanding in this view: {money(filtered.reduce((s,r)=>s+r.outstanding,0))}</p>}
 <p className="text-xs text-slate-500 mb-3">{filtered.length} records · Chicago calendar dates · {report==='Receivables & aging'?'Aging as of '+today:'Based on stored records'}</p>
 {error&&<p className="shop-error" role="alert">{error}</p>}
 <div className="shop-panel overflow-x-auto"><table className="shop-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.id}>{columns.map(c=><td key={c.key}>{['amount','paid','outstanding','total','total_amount','subtotal'].includes(c.key)?money(r[c.key]):String(r[c.key]??'—')}</td>)}</tr>)}</tbody></table>{loading?<p className="shop-empty">Loading report…</p>:!filtered.length&&<p className="shop-empty">No matching records.</p>}</div>
 <div className="mt-8 flex flex-wrap gap-5"><Link to="/reporting" className="text-sm underline flex gap-1 items-center">Existing sales & tax reports<ArrowUpRight size={14}/></Link></div><div className="mt-8 shop-panel p-6"><h2 className="font-semibold mb-2">Accounting & commission reports</h2><p className="text-sm text-slate-500 leading-relaxed">Profit and loss, balance sheet, trial balance, general ledger, job gross profit, QuickBooks exports and commissions need verified accounting mappings, costs and commission rules. These reports are not enabled yet. Quote totals and manual invoice records are not a general ledger.</p></div>
 </div>;
}
