import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Search, MoreHorizontal, ChevronDown, Trash2, Send, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function ProductionDropdown({ row, jobs, onAdd, onToggleProduction, loading }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const job = jobs.find(j => j.quote_id === row.quote_id && row.quote_id);
  const isOnBoard = !!job;
  const isInProduction = isOnBoard && job.in_production !== false;

  let label, colorClass;
  if (!isOnBoard) {
    label = 'Not Ready';
    colorClass = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
  } else if (isInProduction) {
    label = 'In Production';
    colorClass = 'bg-green-50 text-green-700 border-green-200';
  } else {
    label = 'Not In Production';
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const handleOpen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(o => !o);
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${colorClass}`}
      >
        <span>{label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="fixed z-[101] bg-white border rounded-lg shadow-xl min-w-44 py-1" style={{ top: pos.top, left: pos.left }}>
            {!isOnBoard ? (
              <button
                onClick={() => { setOpen(false); onAdd(row); }}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add to Production Board'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setOpen(false); onToggleProduction(job.id, true); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${isInProduction ? 'text-green-700 font-semibold' : 'text-slate-700'}`}
                >
                  {isInProduction && <span>✓</span>} In Production
                </button>
                <button
                  onClick={() => { setOpen(false); onToggleProduction(job.id, false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${!isInProduction ? 'text-amber-700 font-semibold' : 'text-slate-700'}`}
                >
                  {!isInProduction && <span>✓</span>} Not In Production
                </button>
                <div className="border-t my-1" />
                <Link
                  to="/jobboard"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-primary hover:bg-slate-50"
                >
                  View Production Board →
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PaymentBadge({ terms, paid }) {
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" /> Paid
      </span>
    );
  }
  if (!terms || terms === 'No Terms') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Payment Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      {terms}
    </span>
  );
}

export default function SalesBoard() {
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingToProduction, setAddingToProduction] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(null);

  const deleteRow = async (row) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      if (row.type === 'job') {
        await base44.entities.Job.delete(row.id);
        setJobs(prev => prev.filter(j => j.id !== row.id));
      } else {
        await base44.entities.Quote.delete(row.id);
        setQuotes(prev => prev.filter(q => q.id !== row.id));
      }
      toast.success('Deleted successfully.');
    } catch (e) {
      toast.error('Failed to delete: ' + e.message);
    }
    setMenuOpen(null);
  };

  const sendPaymentLink = async (row) => {
    setSendingPaymentLink(row.id);
    setMenuOpen(null);
    try {
      // Get the quote for this row
      const quoteId = row.quote_id || row.id;
      const [q] = await base44.entities.Quote.filter({ id: quoteId });
      if (!q) { toast.error('Quote not found'); return; }
      if (!q.customer_email) { toast.error('No customer email on file'); return; }

      // Generate a Stripe payment link for the full balance
      const res = await base44.functions.invoke('createStripePaymentLink', { quoteId, amountType: 'full' });
      if (!res.data?.url) { toast.error('Failed to generate payment link'); return; }

      // Send the email
      await base44.functions.invoke('sendQuoteEmail', {
        to: q.customer_email,
        subject: `Payment Link — Quote #${q.quote_number} from 4 R Stitching Co.`,
        body: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#333">
            <div style="background:#1e3a5f;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px">4 R Stitching Co.</h1>
            </div>
            <div style="background:white;padding:32px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 16px;font-size:15px">Hi ${q.customer_name || 'there'},</p>
              <p style="margin:0 0 24px;color:#555;line-height:1.6">
                Your order <strong>${q.job_name}</strong> (Quote #${q.quote_number}) is ready for payment. 
                Please click the button below to pay securely online.
              </p>
              <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:24px">
                <div style="display:flex;justify-content:space-between;font-size:15px">
                  <span style="color:#444;font-weight:600">Balance Due</span>
                  <strong style="color:#1e3a5f;font-size:17px">$${(q.balance_due > 0 ? q.balance_due : q.total).toFixed(2)}</strong>
                </div>
              </div>
              <div style="text-align:center;margin-bottom:24px">
                <a href="${res.data.url}" style="display:inline-block;background:#16a34a;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
                  Pay Now →
                </a>
              </div>
              <p style="font-size:12px;color:#999;text-align:center;margin:0">🔒 Secure payment powered by Stripe</p>
            </div>
          </div>`
      });

      toast.success(`Payment link sent to ${q.customer_email}`);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
    setSendingPaymentLink(null);
  };

  const toggleProduction = async (jobId, inProduction) => {
    await base44.entities.Job.update(jobId, { in_production: inProduction });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, in_production: inProduction } : j));
    toast.success(inProduction ? 'Marked as In Production' : 'Marked as Not In Production');
  };

  const addToProduction = async (row) => {
    setAddingToProduction(row.id);
    try {
      const existing = await base44.entities.Job.filter({ quote_id: row.quote_id });
      if (existing && existing.length > 0) {
        toast.info('Already on Production Board.');
        setAddingToProduction(null);
        return;
      }
      let quoteData = null;
      if (row.type === 'quote') {
        const [q] = await base44.entities.Quote.filter({ id: row.quote_id });
        quoteData = q;
      }
      await base44.entities.Job.create({
        quote_id: row.quote_id,
        quote_number: row.doc_num,
        job_number: row.doc_num,
        title: quoteData?.job_name || row.doc_num,
        customer_name: row.customer_name,
        customer_email: quoteData?.customer_email || '',
        company_name: row.company_name || '',
        sales_rep: row.sales_rep || '',
        total_amount: quoteData?.total || 0,
        status_job_printed: '', status_account: '', status_purchasing: '',
        status_artwork: '', status_production: '', status_shipping: '',
      });
      toast.success('Added to Production Board!');
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
    setAddingToProduction(null);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list('-created_date', 100),
      base44.entities.Quote.filter({ status: 'Approved' }, '-created_date', 100),
    ]).then(([jobsData, quotesData]) => {
      setJobs(jobsData || []);
      setQuotes(quotesData || []);
      setLoading(false);
    });
  }, []);

  const jobQuoteIds = new Set(jobs.map(j => j.quote_id).filter(Boolean));
  const orphanQuotes = quotes.filter(q => !jobQuoteIds.has(q.id));

  // Map quoteId → quote for payment info
  const quoteMap = Object.fromEntries(quotes.map(q => [q.id, q]));

  const rows = [
    ...jobs.map(j => ({
      id: j.id,
      doc_num: j.job_number || j.id?.slice(-4),
      job_num: j.quote_number || '—',
      doc_type: 'Job',
      customer_name: j.customer_name,
      company_name: j.company_name,
      sales_rep: j.sales_rep || 'FR',
      created_date: j.created_date,
      quote_id: j.quote_id,
      job_id: j.id,
      type: 'job',
      terms: quoteMap[j.quote_id]?.terms || '',
      paid: quoteMap[j.quote_id]?.paid || false,
    })),
    ...orphanQuotes.map(q => ({
      id: q.id,
      doc_num: q.quote_number || q.id?.slice(-4),
      job_num: '—',
      doc_type: 'Quote',
      customer_name: q.customer_name,
      company_name: q.company_name,
      sales_rep: q.sales_rep || 'FR',
      created_date: q.created_date,
      quote_id: q.id,
      job_id: null,
      type: 'quote',
      terms: q.terms || '',
      paid: q.paid || false,
    })),
  ];

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.customer_name?.toLowerCase().includes(q) ||
      r.company_name?.toLowerCase().includes(q) ||
      r.doc_num?.toLowerCase().includes(q) ||
      r.doc_type?.toLowerCase().includes(q)
    );
  });

  const initials = (name) => {
    if (!name) return 'FR';
    const parts = name.trim().split(' ');
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">SalesBoard</h1>
        <Link to="/quotes/new">
          <button className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-primary/90">
            + ADD NEW
          </button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-3 md:px-4 py-3 border-b">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {loading ? (
            <p className="px-4 py-12 text-center text-muted-foreground text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-muted-foreground text-sm">No records found</p>
          ) : filtered.map((row) => (
            <div key={row.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    {row.job_id ? (
                      <Link to={`/jobboard/${row.job_id}`} className="text-primary font-semibold text-sm">{row.doc_num}</Link>
                    ) : (
                      <Link to={`/quotes/${row.quote_id}`} className="text-primary font-semibold text-sm">{row.doc_num}</Link>
                    )}
                    <span className="text-xs text-muted-foreground">{row.doc_type}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{row.customer_name || '—'}</p>
                  {row.company_name && <p className="text-xs text-muted-foreground truncate">{row.company_name}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(row.created_date)}</p>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuOpen(menuOpen?.id === row.id ? null : { id: row.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    }}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {menuOpen?.id === row.id && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(null)} />
                      <div className="fixed z-[101] bg-white border rounded-lg shadow-xl min-w-44 py-1" style={{ top: menuOpen.top, right: menuOpen.right }}>
                        {!row.paid && (
                          <button
                            onClick={() => sendPaymentLink(row)}
                            disabled={sendingPaymentLink === row.id}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {sendingPaymentLink === row.id ? 'Sending...' : 'Send Payment Link'}
                          </button>
                        )}
                        <button
                          onClick={() => deleteRow(row)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <PaymentBadge terms={row.terms} paid={row.paid} />
                <ProductionDropdown
                  row={row}
                  jobs={jobs}
                  onAdd={addToProduction}
                  onToggleProduction={toggleProduction}
                  loading={addingToProduction === row.id}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-20">SalesDoc #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-20">Job #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Document</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-20">Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-20">Created By</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Created Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-28">Payment</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-36">Production</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No records found</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {row.job_id ? (
                      <Link to={`/jobboard/${row.job_id}`} className="text-primary font-semibold hover:underline">
                        {row.doc_num}
                      </Link>
                    ) : (
                      <span className="text-primary font-semibold">{row.doc_num}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.quote_id && row.doc_type === 'Job' ? (
                      <Link to={`/quotes/${row.quote_id}`} className="text-primary hover:underline">
                        {row.job_num}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{row.job_num}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.doc_type}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[160px]">{row.customer_name || '—'}</p>
                    {row.company_name && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.company_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{initials(row.sales_rep)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">FR</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.created_date)}</td>
                  <td className="px-4 py-3">
                    <PaymentBadge terms={row.terms} paid={row.paid} />
                  </td>
                  <td className="px-4 py-3">
                    <ProductionDropdown
                      row={row}
                      jobs={jobs}
                      onAdd={addToProduction}
                      onToggleProduction={toggleProduction}
                      loading={addingToProduction === row.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuOpen(menuOpen?.id === row.id ? null : { id: row.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen?.id === row.id && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(null)} />
                        <div className="fixed z-[101] bg-white border rounded-lg shadow-xl min-w-44 py-1" style={{ top: menuOpen.top, right: menuOpen.right }}>
                          {!row.paid && (
                            <button
                              onClick={() => sendPaymentLink(row)}
                              disabled={sendingPaymentLink === row.id}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {sendingPaymentLink === row.id ? 'Sending...' : 'Send Payment Link'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteRow(row)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}