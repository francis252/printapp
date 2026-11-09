import {useState} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {LayoutDashboard,FileText,Users,Package,Truck,Settings,Menu,X,ShoppingBag,CheckSquare,Briefcase,ShoppingCart,BarChart3,Presentation,Receipt,Wallet,UsersRound,LogOut,Trello} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
const groups=[
 ['WORKSPACE',[
  ['Dashboard',LayoutDashboard,'/dashboard'],['Presentations',Presentation,'/presentations'],['Quotes',FileText,'/quotes'],['Sales board',Trello,'/salesboard'],['Production',Briefcase,'/jobboard'],['Tasks & follow-ups',CheckSquare,'/tasks']]],
 ['DIRECTORY',[
  ['Customers',Users,'/customers'],['Products',Package,'/products'],['S&S Browse',ShoppingBag,'/ss-browse'],['Suppliers',Truck,'/suppliers'],['Purchase orders',ShoppingCart,'/purchase-orders']]],
 ['MANAGEMENT',[
  ['Invoices',Receipt,'/invoices'],['Expenses',Wallet,'/expenses'],['Reports',BarChart3,'/reports'],['Team & access',UsersRound,'/team'],['Settings',Settings,'/settings']]],
];
export default function Sidebar(){
 const [open,setOpen]=useState(false),[error,setError]=useState('');const {membership,user,logout}=useAuth();const manager=['owner','manager'].includes(membership?.role);
 const brand=<div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-[#19354d] text-[#e1c7a1] flex items-center justify-center text-xl font-bold">4R</div><div><p className="text-[#19354d] font-semibold text-sm tracking-wide">STITCHING CO.</p><p className="text-xs text-[#8c8275] mt-0.5">Shop Management</p></div></div>;
 const links=<>{groups.filter(([label])=>label!=='MANAGEMENT'||manager).map(([label,items])=><div key={label} className="mb-6"><p className="px-3 mb-2 text-[10px] font-semibold tracking-[.18em] text-[#9b9388]">{label}</p><div className="space-y-1">{items.map(([name,Icon,path])=><NavLink key={path} to={path} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${isActive?'bg-[#eae3d7] text-[#19354d] font-semibold':'text-[#63717a] hover:bg-[#f1ede5] hover:text-[#19354d]'}`}><Icon size={17}/>{name}</NavLink>)}</div></div>)}</>;
 const footer=<div className="border-t border-[#e8e1d6] p-4"><p className="text-xs font-medium text-[#19354d] truncate">{membership?.display_name||user?.email}</p><div className="flex justify-between mt-2 items-center"><span className="text-xs capitalize text-slate-500">{membership?.role}</span><button aria-label="Sign out" className="text-slate-500 hover:text-[#19354d]" onClick={async()=>{try{await logout();}catch(e){setError(e.message);}}}><LogOut size={15}/></button></div>{error&&<p role="alert" className="text-xs text-red-700 mt-2">{error}</p>}</div>;
 return <><aside className="hidden md:flex w-60 shrink-0 flex-col h-screen bg-[#fbfaf7] border-r border-[#e8e1d6] print:hidden"><div className="px-5 py-7">{brand}</div><nav className="flex-1 overflow-auto px-3 pt-2">{links}</nav>{footer}</aside><div className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-[#fbfaf7] border-b flex justify-between items-center px-4 print:hidden">{brand}<button aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu size={22}/></button></div>{open&&<div className="md:hidden fixed inset-0 z-50 flex print:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-slate-900/40" onClick={()=>setOpen(false)}/><aside className="relative bg-[#fbfaf7] w-72 flex flex-col h-full"><div className="p-5 flex justify-between items-center">{brand}<button aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={20}/></button></div><nav className="flex-1 overflow-auto px-3">{links}</nav>{footer}</aside></div>}</>;
}
