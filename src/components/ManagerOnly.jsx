import {useAuth} from '@/lib/AuthContext';
export default function ManagerOnly({children}) {
  const {membership}=useAuth();
  if(!['owner','manager'].includes(membership?.role))return <div className="p-10"><h1 className="text-2xl font-semibold">Manager access required</h1><p className="mt-3 text-slate-500">Your current role does not include financial records or management reports.</p></div>;
  return children;
}
