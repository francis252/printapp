import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Search, MoreHorizontal, ShoppingCart, Check, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import JobStatusCell from '@/components/qm/JobStatusCell';
import QuoteDetailPanel from '@/components/qm/QuoteDetailPanel';
import { toast } from 'sonner';

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [existingPOs, setExistingPOs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [generatingPO, setGeneratingPO] = useState(null);
  const [quotePanel, setQuotePanel] = useState(null);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list('-created_date', 100),
      base44.entities.PurchaseOrder.list('-created_date', 200),
    ]).then(([jobData, poData]) => {
      setJobs(jobData || []);
      setExistingPOs(poData || []);
      setLoading(false);
    });
  }, []);

  const generatePOForJob = async (job) => {
    if (!job.quote_id) { toast.error('No quote linked to this job.'); return; }
    const alreadyExists = existingPOs.some(po => po.quote_id === job.quote_id);
    if (alreadyExists) { toast.info('PO already exists for this job.'); return; }

    setGeneratingPO(job.id);
    try {
      const items = await base44.entities.QuoteLineItem.filter({ quote_id: job.quote_id }, 'sort_order');
      if (!items || items.length === 0) { toast.error('No line items found on the linked quote.'); setGeneratingPO(null); return; }

      const bySupplier = {};
      for (const item of items) {
        const supplier = item.supplier_name || 'Unknown Supplier';
        if (!bySupplier[supplier]) bySupplier[supplier] = [];
        const sizeRows = (item.sizes || []).filter(s => s.quantity > 0);
        if (sizeRows.length > 0) {
          for (const s of sizeRows) {
            bySupplier[supplier].push({ product_name: item.product_name, style_number: item.style_number || '', supplier_name: supplier, color: item.color || '', size: s.size, quantity: s.quantity, rate: item.unit_price || 0, ordered: false, qty_ordered: 0, qty_on_backorder: 0, backorder_date: '', received: false });
          }
        } else {
          bySupplier[supplier].push({ product_name: item.product_name, style_number: item.style_number || '', supplier_name: supplier, color: item.color || '', size: '', quantity: item.total_quantity || 0, rate: item.unit_price || 0, ordered: false, qty_ordered: 0, qty_on_backorder: 0, backorder_date: '', received: false });
        }
      }

      let poCount = 1;
      const newPOs = [];
      for (const [supplier, lineItems] of Object.entries(bySupplier)) {
        const subtotal = lineItems.reduce((s, i) => s + (i.quantity * i.rate), 0);
        const created = await base44.entities.PurchaseOrder.create({
          po_number: `${job.quote_number || job.job_number}-PO${poCount}`,
          title: `PO related to ${job.customer_name} - ${job.title} - Quote ${job.quote_number || job.job_number}`,
          quote_id: job.quote_id,
          quote_number: job.quote_number || '',
          job_number: job.job_number || '',
          customer_name: job.customer_name,
          company_name: job.company_name || '',
          vendor_name: supplier,
          status: 'Created',
          line_items: lineItems,
          subtotal,
        });
        newPOs.push(created);
        poCount++;
      }
      setExistingPOs(prev => [...prev, ...newPOs]);
      toast.success(`Created ${newPOs.length} purchase order(s) for this job.`);
    } catch (e) {
      toast.error('Failed to generate PO: ' + e.message);
    }
    setGeneratingPO(null);
    setMenuOpen(null);
  };

  const sendPaymentLink = async (job) => {
    if (!job.quote_id) { toast.error('No quote linked to this job.'); return; }
    setSendingPaymentLink(job.id);
    setMenuOpen(null);
    try {
      const [q] = await base44.entities.Quote.filter({ id: job.quote_id });
      if (!q) { toast.error('Quote not found'); return; }
      if (!q.customer_email) { toast.error('No customer email on file'); return; }

      const res = await base44.functions.invoke('createStripePaymentLink', { quoteId: job.quote_id, amountType: 'full' });
      if (!res.data?.url) { toast.error('Failed to generate payment link'); return; }

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
              </p>
              <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:24px">
                <div style="display:flex;justify-content:space-between;font-size:15px">
                  <span style="color:#444;font-weight:600">Balance Due</span>
                  <strong style="color:#1e3a5f;font-size:17px">$${(q.balance_due > 0 ? q.balance_due : q.total).toFixed(2)}</strong>
                </div>
              </div>
              <div style="text-align:center;margin-bottom:24px">
                <a href="${res.data.url}" style="display:inline-block;background:#16a34a;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Pay Now →</a>
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

  const updateJobStatus = async (jobId, field, value) => {
    const updatedJobs = jobs.map(j => j.id === jobId ? { ...j, [field]: value } : j);
    setJobs(updatedJobs);
    await base44.entities.Job.update(jobId, { [field]: value });

    // Auto-delete when production + shipping both COMPLETE and quote is paid
    const job = updatedJobs.find(j => j.id === jobId);
    if (job && job.status_production === 'COMPLETE' && job.status_shipping === 'COMPLETE') {
      if (job.quote_id) {
        const [q] = await base44.entities.Quote.filter({ id: job.quote_id });
        if (q && q.paid) {
          // Delete everything
          await base44.entities.Job.delete(jobId);
          if (job.quote_id) {
            await base44.entities.Quote.delete(job.quote_id);
            const lineItems = await base44.entities.QuoteLineItem.filter({ quote_id: job.quote_id });
            for (const li of lineItems) await base44.entities.QuoteLineItem.delete(li.id);
            const pos = await base44.entities.PurchaseOrder.filter({ quote_id: job.quote_id });
            for (const po of pos) await base44.entities.PurchaseOrder.delete(po.id);
          }
          setJobs(prev => prev.filter(j => j.id !== jobId));
          toast.success('Job complete & paid — record archived.');
        }
      }
    }
  };

  const filtered = jobs.filter(j => {
    // Hide if explicitly marked as not in production
    if (j.in_production === false) return false;
    // Auto-remove when both production and shipping are COMPLETE
    if (j.status_production === 'COMPLETE' && j.status_shipping === 'COMPLETE') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.customer_name?.toLowerCase().includes(q) ||
      j.title?.toLowerCase().includes(q) ||
      j.job_number?.toLowerCase().includes(q)
    );
  });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    if (menuOpen) {
      const close = () => setMenuOpen(null);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [menuOpen]);

  return (
    <div className="p-4 md:p-6" onClick={() => menuOpen && setMenuOpen(null)}>
      {quotePanel && <QuoteDetailPanel job={quotePanel} onClose={() => setQuotePanel(null)} />}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Production Board</h1>
        <Link to="/quotes/new">
          <button className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-primary/90">
            + ADD JOB
          </button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
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
            <p className="px-4 py-12 text-center text-muted-foreground text-sm">No jobs yet. Approve a quote to get started.</p>
          ) : filtered.map((job) => (
            <div key={job.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-primary font-semibold text-sm">{job.job_number || job.id?.slice(-4)}</span>
                    {job.quote_id && (
                      <button onClick={() => setQuotePanel(job)} className="text-primary hover:underline text-xs font-medium">
                        Quote {job.quote_number || '—'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{job.customer_name}</p>
                  {job.company_name && <p className="text-xs text-muted-foreground truncate">{job.company_name}</p>}
                  {job.title && <p className="text-xs text-muted-foreground truncate">{job.title}</p>}
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === job.id ? null : job.id); }}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {menuOpen === job.id && (
                    <div className="absolute right-0 top-9 z-50 bg-white border rounded-lg shadow-xl min-w-48 py-1">
                      <button
                        onClick={() => sendPaymentLink(job)}
                        disabled={sendingPaymentLink === job.id}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {sendingPaymentLink === job.id ? 'Sending...' : 'Send Payment Link'}
                      </button>
                      <div className="border-t my-1" />
                      {existingPOs.some(po => po.quote_id === job.quote_id && job.quote_id) ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-600">
                          <Check className="w-4 h-4" /> PO already created
                        </div>
                      ) : (
                        <button
                          onClick={() => generatePOForJob(job)}
                          disabled={generatingPO === job.id}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50"
                        >
                          <ShoppingCart className="w-4 h-4 text-primary" />
                          {generatingPO === job.id ? 'Generating...' : 'Generate Purchase Order'}
                        </button>
                      )}
                      <Link
                        to="/purchase-orders"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-muted-foreground"
                        onClick={() => setMenuOpen(null)}
                      >
                        View Purchase Orders
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Production</p>
                  <JobStatusCell
                    value={job.status_production}
                    options={['', 'IN PRODUCTION', 'COMPLETE']}
                    columnKey="production"
                    onChange={v => updateJobStatus(job.id, 'status_production', v)}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Shipping</p>
                  <JobStatusCell
                    value={job.status_shipping}
                    options={['', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETE']}
                    columnKey="shipping"
                    onChange={v => updateJobStatus(job.id, 'status_shipping', v)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-16">Job #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-16">Quote #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-12">Rep</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-12">By</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Created Date</th>

                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-28">Production</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-28">Shipping</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No jobs yet. Approve a quote to get started.</td></tr>
              ) : filtered.map((job) => (
                <tr key={job.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-primary font-semibold">{job.job_number || job.id?.slice(-4)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {job.quote_id ? (
                      <button
                        onClick={() => setQuotePanel(job)}
                        className="text-primary hover:underline font-medium"
                      >
                        {job.quote_number || '—'}
                      </button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">FR</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">FR</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[140px]">{job.customer_name}</p>
                    {job.company_name && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{job.company_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{job.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(job.created_date)}</td>
                  <td className="px-2 py-2">
                    <JobStatusCell
                      value={job.status_production}
                      options={['', 'IN PRODUCTION', 'COMPLETE']}
                      columnKey="production"
                      onChange={v => updateJobStatus(job.id, 'status_production', v)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <JobStatusCell
                      value={job.status_shipping}
                      options={['', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETE']}
                      columnKey="shipping"
                      onChange={v => updateJobStatus(job.id, 'status_shipping', v)}
                    />
                  </td>
                  <td className="px-2 py-2 relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === job.id && (
                      <div className="absolute right-0 top-8 z-50 bg-white border rounded-lg shadow-xl min-w-48 py-1">
                        <button
                          onClick={() => sendPaymentLink(job)}
                          disabled={sendingPaymentLink === job.id}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {sendingPaymentLink === job.id ? 'Sending...' : 'Send Payment Link'}
                        </button>
                        <div className="border-t my-1" />
                        {existingPOs.some(po => po.quote_id === job.quote_id && job.quote_id) ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-600">
                            <Check className="w-4 h-4" /> PO already created
                          </div>
                        ) : (
                          <button
                            onClick={() => generatePOForJob(job)}
                            disabled={generatingPO === job.id}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50"
                          >
                            <ShoppingCart className="w-4 h-4 text-primary" />
                            {generatingPO === job.id ? 'Generating...' : 'Generate Purchase Order'}
                          </button>
                        )}
                        <Link
                          to={`/purchase-orders`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-muted-foreground"
                          onClick={() => setMenuOpen(null)}
                        >
                          View Purchase Orders
                        </Link>
                      </div>
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