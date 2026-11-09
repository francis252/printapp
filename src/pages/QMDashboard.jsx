import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/qm/StatusBadge';

export default function QMDashboard() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Quote.list('-created_date', 200).then(data => { setQuotes(data); setLoading(false); });
  }, []);

  const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0);
  const awaiting = quotes.filter(q => q.status === 'Awaiting Approval').length;
  const approved = quotes.filter(q => q.status === 'Approved').length;
  const recent = quotes.slice(0, 8);

  const stats = [
    { label: 'Total Quotes', value: quotes.length, icon: FileText, color: 'bg-blue-500' },
    { label: 'Total Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Awaiting Approval', value: awaiting, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Approved', value: approved, icon: CheckCircle, color: 'bg-teal-500' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">4 R Stitching Co. — Quote Manager</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border rounded-lg p-3 md:p-4 flex items-center gap-3">
            <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">{label}</p>
              <p className="text-base md:text-xl font-bold text-slate-800 truncate">{loading ? '—' : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-700 text-sm">Recent Quotes</h2>
          <Link to="/quotes" className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {loading ? (
            <p className="text-center py-8 text-slate-400 text-sm">Loading...</p>
          ) : recent.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">
              No quotes yet. <Link to="/quotes/new" className="text-blue-600 hover:underline">Create your first quote →</Link>
            </p>
          ) : recent.map(q => (
            <Link to={`/quotes/${q.id}`} key={q.id} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{q.job_name || 'Untitled'}</p>
                <p className="text-xs text-slate-400 truncate">
                  {q.quote_number || '—'} · {q.customer_name || 'No customer'}
                </p>
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <p className="text-sm font-semibold text-slate-800">${(q.total || 0).toFixed(2)}</p>
                <StatusBadge status={q.status} />
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Quote #', 'Job Name', 'Customer', 'Status', 'Total', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : recent.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                No quotes yet. <Link to="/quotes/new" className="text-blue-600 hover:underline">Create your first quote →</Link>
              </td></tr>
            ) : recent.map(q => (
              <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/quotes/${q.id}`} className="font-mono text-blue-600 font-medium hover:underline text-xs">{q.quote_number || q.id?.slice(-6)}</Link>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/quotes/${q.id}`} className="font-medium text-slate-800 hover:text-blue-600 text-sm">{q.job_name}</Link>
                </td>
                <td className="px-4 py-3 text-slate-500 text-sm">{q.customer_name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3 font-semibold text-slate-800">${(q.total || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{q.created_date ? new Date(q.created_date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}