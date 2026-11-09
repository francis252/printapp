import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, MoreHorizontal, Trash2, Copy, Pencil } from 'lucide-react';
import PageHeader from '@/components/qm/PageHeader';
import StatusBadge from '@/components/qm/StatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TABS = ['Open', 'Awaiting Approval', 'Approved', 'Rejected', 'Expired', 'Closed', 'All'];

export default function QuotesList() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Awaiting Approval');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [copyingId, setCopyingId] = useState(null);

  useEffect(() => {
    base44.entities.Quote.list('-created_date', 300).then(data => {
      setQuotes(data);
      setLoading(false);
    });
  }, []);

  const filtered = quotes.filter(q => {
    const matchTab = activeTab === 'All' || q.status === activeTab;
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.job_name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (tab) => tab === 'All' ? quotes.length : quotes.filter(q => q.status === tab).length;

  const handleDelete = async (e, quoteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this quote? This cannot be undone.')) return;
    await base44.entities.Quote.delete(quoteId);
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    toast.success('Quote deleted.');
  };

  const handleCopy = async (e, quoteId) => {
    e.preventDefault();
    e.stopPropagation();
    const q = quotes.find(x => x.id === quoteId);
    if (!q) return;
    setCopyingId(quoteId);
    try {
      const { id, created_date, updated_date, approval_token, sent_at, approved_at, rejected_at, paid, paid_at, paid_amount_type, status, ...rest } = q;
      const copy = await base44.entities.Quote.create({
        ...rest,
        quote_number: `4R${Date.now().toString().slice(-5)}`,
        status: 'Open',
      });
      const items = await base44.entities.QuoteLineItem.filter({ quote_id: quoteId }, 'sort_order');
      for (let i = 0; i < (items || []).length; i++) {
        const { id: liId, ...li } = items[i];
        await base44.entities.QuoteLineItem.create({ ...li, quote_id: copy.id, sort_order: i });
      }
      setQuotes(prev => [copy, ...prev]);
      toast.success('Quote copied!');
      navigate(`/quotes/${copy.id}`);
    } catch (err) {
      toast.error('Failed to copy quote: ' + err.message);
    }
    setCopyingId(null);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Quotes"
        subtitle={`${quotes.length} total quotes`}
        action={
          <Link to="/quotes/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Add New Quote
            </Button>
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {tabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden bg-white rounded-lg border divide-y">
        {loading ? (
          <p className="text-center py-12 text-slate-400 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">
            No quotes found.{' '}
            <Link to="/quotes/new" className="text-blue-600 hover:underline">Create your first quote →</Link>
          </p>
        ) : filtered.map(q => (
          <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/quotes/${q.id}`} className="text-sm font-semibold text-slate-800">
                {q.job_name}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {q.quote_number || '—'} · {q.customer_name || 'No customer'}
              </p>
              <div className="mt-1.5"><StatusBadge status={q.status} /></div>
            </div>
            <div className="text-right flex-shrink-0 space-y-2">
              <p className="text-sm font-semibold text-slate-800">${(q.total || 0).toFixed(2)}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <Link to={`/quotes/${q.id}`}>
                  <button className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-xs font-medium text-blue-600 hover:bg-blue-50">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleCopy(e, q.id)} disabled={copyingId === q.id}>
                      <Copy className="w-4 h-4 mr-2" /> {copyingId === q.id ? 'Copying...' : 'Copy Quote'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDelete(e, q.id)} className="text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Quote
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Quote #', 'Job Name', 'Customer', 'Company', 'Status', 'Value', 'Outstanding', 'Created', 'Updated', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">
                No quotes found.{' '}
                <Link to="/quotes/new" className="text-blue-600 hover:underline">Create your first quote →</Link>
              </td></tr>
            ) : (
              filtered.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <Link to={`/quotes/${q.id}`} className="text-blue-600 font-mono font-medium hover:underline">
                      {q.quote_number || q.id?.slice(-6).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/quotes/${q.id}`} className="text-slate-800 font-medium hover:text-blue-600">
                      {q.job_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{q.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{q.company_name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 font-semibold text-slate-800">${(q.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">${(q.balance_due || q.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {q.created_date ? new Date(q.created_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {q.updated_date ? new Date(q.updated_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/quotes/${q.id}`)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleCopy(e, q.id)} disabled={copyingId === q.id}>
                          <Copy className="w-4 h-4 mr-2" /> {copyingId === q.id ? 'Copying...' : 'Copy Quote'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDelete(e, q.id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Quote
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}