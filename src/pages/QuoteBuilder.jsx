import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import LineItemRow from '@/components/qm/LineItemRow';
import LineItemCard from '@/components/qm/LineItemCard';
import QuoteSidebar from '@/components/qm/QuoteSidebar';
import ProductPickerModal from '@/components/qm/ProductPickerModal';
import AddCustomerModal from '@/components/qm/AddCustomerModal';
import StatusBadge from '@/components/qm/StatusBadge';
import QuoteTotalsBar from '@/components/qm/QuoteTotalsBar';
import QuotePreviewModal from '@/components/qm/QuotePreviewModal';

const TERMS = ['No Terms', 'Net 30', 'Net 15', 'Due on Receipt', '50% Deposit Required', 'Custom'];

const newLineItem = (overrides = {}) => ({
  product_name: '', style_number: '', supplier_name: '', color: '', description: '',
  decoration_method: '', sizes: [], unit_price: 0, total_quantity: 0, line_total: 0,
  discount_percent: 0, discounted_unit_price: 0,
  notes: '', mockups: [], item_type: 'catalog', _ssColors: [], ...overrides,
});

export default function QuoteBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [quote, setQuote] = useState({
    quote_number: `4R${Date.now().toString().slice(-5)}`,
    job_name: '', sales_rep: '', expiration_date: '', ship_by_date: '',
    customer_po: '', store: '', notes: '', terms: 'No Terms',
    status: 'Open', shipping: 0, tax_rate: 0, discount: 0, deposit_percent: 50,
    payments: 0, internal_notes: '',
    customer_id: '', customer_name: '', customer_email: '', company_name: '',
    priority: false, requires_art_approval: false,
  });
  const [lineItems, setLineItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const customerDropdownRef = useRef(null);

  useEffect(() => {
    base44.entities.Customer.list('-created_date', 500).then(setCustomers);
    if (!isNew) {
      Promise.all([
        base44.entities.Quote.filter({ id }),
        base44.entities.QuoteLineItem.filter({ quote_id: id }, 'sort_order'),
      ]).then(([[q], items]) => {
        if (q) { setQuote(q); setCustomerSearch(q.customer_name || ''); }
        setLineItems((items || []).map(i => ({ ...i, _ssColors: [] })));
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    const handler = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const setQ = (updates) => setQuote(q => ({ ...q, ...updates }));

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.contact_name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q);
  });

  const selectCustomer = (c) => {
    setQ({ customer_id: c.id, customer_name: c.contact_name, customer_email: c.email, company_name: c.company_name });
    setCustomerSearch(c.contact_name || c.company_name || '');
    setShowCustomerDropdown(false);
  };

  const handleProductSelected = (product) => {
    setLineItems(items => [...items, newLineItem({
      product_id: product.id || null,
      product_name: product.product_name || product.name || '',
      style_number: product.style_number || product.styleName || '',
      supplier_name: product.supplier_name || '',
      color: product.color || '',
      unit_price: product.unit_price || product.base_price || 0,
      description: product.description || '',
      product_image_url: product.product_image_url || product.image_url || '',
      _ssColors: product._ssColors || [],
      item_type: 'catalog',
      sort_order: items.length,
    })]);
  };

  const addFreeFlow = () => {
    setLineItems(items => [...items, newLineItem({ item_type: 'freeflow', sort_order: items.length })]);
  };

  const addCatalogRow = () => {
    setLineItems(items => [...items, newLineItem({ item_type: 'catalog', sort_order: items.length })]);
  };

  const updateItem = (idx, updated) => setLineItems(items => items.map((item, i) => i === idx ? updated : item));
  const removeItem = (idx) => setLineItems(items => items.filter((_, i) => i !== idx));

  // Compute totals for save
  const computeTotals = () => {
    const subtotal = lineItems.reduce((s, i) => {
      const qty = (i.sizes || []).reduce((a, r) => a + (parseInt(r.quantity) || 0), 0);
      return s + qty * (parseFloat(i.unit_price) || 0);
    }, 0);
    const shipping = parseFloat(quote.shipping) || 0;
    const tax = subtotal * ((parseFloat(quote.tax_rate) || 0) / 100);
    const discount = parseFloat(quote.discount) || 0;
    const total = subtotal + shipping + tax - discount;
    const deposit = total * ((parseFloat(quote.deposit_percent) || 50) / 100);
    const balance = total - deposit;
    return { subtotal, total, deposit_required: deposit, balance_due: balance };
  };

  const doSave = async (newStatus) => {
    setSaving(true);
    const totals = computeTotals();
    const quoteData = {
      ...quote,
      ...totals,
      ...(newStatus ? { status: newStatus } : {}),
    };

    let quoteId = id;
    if (isNew) {
      const created = await base44.entities.Quote.create(quoteData);
      quoteId = created.id;
      for (let i = 0; i < lineItems.length; i++) {
        const { _ssColors, ...li } = lineItems[i];
        await base44.entities.QuoteLineItem.create({ ...li, quote_id: quoteId, sort_order: i });
      }
    } else {
      await base44.entities.Quote.update(id, quoteData);
      const existing = await base44.entities.QuoteLineItem.filter({ quote_id: id });
      for (const li of existing) await base44.entities.QuoteLineItem.delete(li.id);
      for (let i = 0; i < lineItems.length; i++) {
        const { _ssColors, ...li } = lineItems[i];
        await base44.entities.QuoteLineItem.create({ ...li, quote_id: id, sort_order: i });
      }
      if (newStatus) setQ({ status: newStatus });
    }
    setSaving(false);
    return quoteId;
  };

  const handleSaveDraft = async () => {
    await doSave();
    toast.success('Draft saved!');
    navigate('/quotes');
  };

  const handleSaveQuote = async () => {
    await doSave('Open');
    toast.success('Quote saved!');
    navigate('/quotes');
  };

  const handleManualApprove = async () => {
    setSaving(true);
    const quoteId = await doSave('Approved');
    await base44.entities.Quote.update(quoteId, { approved_at: new Date().toISOString() });

    // Fetch fresh line items from DB (most reliable source after save)
    const savedItems = await base44.entities.QuoteLineItem.filter({ quote_id: quoteId }, 'sort_order');

    // Create Job if not already existing
    const existingJobs = await base44.entities.Job.filter({ quote_id: quoteId });
    if (!existingJobs || existingJobs.length === 0) {
      await base44.entities.Job.create({
        quote_id: quoteId,
        quote_number: quote.quote_number || '',
        job_number: quote.quote_number || '',
        title: quote.job_name,
        customer_id: quote.customer_id || '',
        customer_name: quote.customer_name,
        customer_email: quote.customer_email || '',
        company_name: quote.company_name || '',
        sales_rep: quote.sales_rep || '',
        total_amount: quote.total || 0,
        status_job_printed: '', status_account: '', status_purchasing: '',
        status_artwork: '', status_production: '', status_shipping: '',
      });
    }

    // Create POs if not already existing — use fresh DB items
    const existingPOs = await base44.entities.PurchaseOrder.filter({ quote_id: quoteId });
    if (!existingPOs || existingPOs.length === 0) {
      const bySupplier = {};
      for (const item of savedItems) {
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
      for (const [supplier, poItems] of Object.entries(bySupplier)) {
        const subtotal = poItems.reduce((s, i) => s + (i.quantity * i.rate), 0);
        await base44.entities.PurchaseOrder.create({
          po_number: `${quote.quote_number}-PO${poCount}`,
          title: `PO related to ${quote.customer_name} - ${quote.job_name} - Quote ${quote.quote_number}`,
          quote_id: quoteId, quote_number: quote.quote_number || '', job_number: quote.quote_number || '',
          customer_name: quote.customer_name, company_name: quote.company_name || '',
          vendor_name: supplier, status: 'Created', deadline: quote.ship_by_date || '',
          line_items: poItems, subtotal,
        });
        poCount++;
      }
    }

    setSaving(false);
    toast.success('Quote manually approved! Job and POs created.');
    if (isNew) navigate(`/quotes/${quoteId}`);
  };

  const sendQuote = async () => {
    if (!quote.customer_email) { toast.error('Customer email required to send quote'); return; }
    setSaving(true);
    const quoteId = await doSave('Awaiting Approval');
    const token = Math.random().toString(36).slice(2);
    await base44.entities.Quote.update(quoteId, { approval_token: token, sent_at: new Date().toISOString() });

    const quoteUrl = `${window.location.origin}/quote-approval/${quoteId}/${token}`;
    const totals = computeTotals();

    const sendResult = await base44.functions.invoke('sendQuoteEmail', {
      to: quote.customer_email,
      subject: `Quote #${quote.quote_number} from 4 R Stitching Co. — ${quote.job_name}`,
      body: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#333">
          <div style="background:#1e3a5f;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center">
            <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px">4 R Stitching Co.</h1>
            <p style="color:#a0c4ff;margin:6px 0 0;font-size:13px">Custom Embroidery &amp; Screen Printing</p>
          </div>
          <div style="background:white;padding:32px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 6px;font-size:15px">Hi ${quote.customer_name || 'there'},</p>
            <p style="margin:0 0 20px;color:#555;line-height:1.6">
              We've put together a quote for your order — <strong>${quote.job_name}</strong>. 
              Click the button below to review the details and let us know if you'd like to move forward.
            </p>

            <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:24px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
                <span style="color:#666">Quote #</span>
                <strong>${quote.quote_number}</strong>
              </div>
              ${quote.expiration_date ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:#666">Valid Until</span><strong>${quote.expiration_date}</strong></div>` : ''}
              <div style="display:flex;justify-content:space-between;font-size:15px;border-top:1px solid #e5e7eb;margin-top:10px;padding-top:10px">
                <span style="color:#444;font-weight:600">Grand Total</span>
                <strong style="color:#1e3a5f;font-size:17px">$${totals.total.toFixed(2)}</strong>
              </div>
            </div>

            <div style="text-align:center;margin-bottom:24px">
              <a href="${quoteUrl}" style="display:inline-block;background:#0ea5c8;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
                View &amp; Respond to Your Quote →
              </a>
            </div>

            <p style="font-size:12px;color:#999;text-align:center;margin:0">
              Questions? Reply to this email or call us at (210) 854-7939.
            </p>
          </div>
        </div>`
    });
    setSaving(false);
    const sendError = sendResult?.data?.error || sendResult?.error;
    if (sendError) {
      toast.error(`Email not sent: ${sendError}`);
      return;
    }
    toast.success(`Quote sent to ${quote.customer_email}!`);
    if (isNew) navigate(`/quotes/${quoteId}`);
  };

  const handleSendQuote = async () => {
    try {
      await sendQuote();
    } catch (e) {
      setSaving(false);
      toast.error('Email failed: ' + (e.message || e));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading quote...</div>;

  return (
    <div className="flex flex-col min-h-full bg-slate-100">
      {/* ── Top bar ── */}
      <div className="bg-white border-b px-3 md:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 flex-shrink-0">
        <Link to="/quotes">
          <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        {/* Draft badge + Quote # */}
        <div className="flex items-center gap-2 border rounded px-2 py-1 text-xs text-slate-500 bg-slate-50">
          <span>In Draft</span>
        </div>
        <span className="text-sm font-bold text-slate-700">Quote #{quote.quote_number}</span>
        <Input
          value={quote.job_name}
          onChange={e => setQ({ job_name: e.target.value })}
          placeholder="Job Name"
          className="max-w-xs min-w-[140px] flex-1 sm:flex-none text-sm h-8"
        />
        <div className="flex-1" />
        <span className="text-xs text-slate-500">Sales Team Member</span>
        <Input
          value={quote.sales_rep}
          onChange={e => setQ({ sales_rep: e.target.value })}
          placeholder="Sales rep..."
          className="w-36 text-xs h-8"
        />
        <StatusBadge status={quote.status} />
      </div>

      {/* ── Sub-header row ── */}
      <div className="bg-white border-b px-3 md:px-4 py-2 flex items-center gap-x-4 gap-y-2 flex-shrink-0 flex-wrap text-xs text-slate-600">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={quote.priority || false} onChange={e => setQ({ priority: e.target.checked })} className="rounded" />
          <Star className="w-3.5 h-3.5 text-yellow-400" /> Is Priority Quote?
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={quote.requires_art_approval || false} onChange={e => setQ({ requires_art_approval: e.target.checked })} className="rounded" />
          Requires Art Approval?
        </label>
        <div className="flex items-center gap-1.5">
          <span>Customer PO</span>
          <Input value={quote.customer_po} onChange={e => setQ({ customer_po: e.target.value })} className="w-28 h-7 text-xs" placeholder="PO #" />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Quote Expires</span>
          <Input type="date" value={quote.expiration_date} onChange={e => setQ({ expiration_date: e.target.value })} className="w-36 h-7 text-xs" />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Ship By Date</span>
          <Input type="date" value={quote.ship_by_date} onChange={e => setQ({ ship_by_date: e.target.value })} className="w-36 h-7 text-xs" />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Store</span>
          <Input value={quote.store} onChange={e => setQ({ store: e.target.value })} className="w-36 h-7 text-xs" placeholder="www.4rstitchingco.com" />
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex-1">
        <div className="flex flex-col lg:flex-row gap-3 p-3 md:p-4">

          {/* ── Left / Main content ── */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Customer Details */}
            <div className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-700">Customer Details</h2>
                <Button size="sm" onClick={() => setShowAddCustomer(true)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  Add New Customer
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3" ref={customerDropdownRef}>
                <span className="text-xs text-slate-500 w-32 flex-shrink-0">Selected Customer:</span>
                <div className="relative flex-1 max-w-xs">
                  <Input
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="select customer"
                    className="text-sm h-8"
                  />
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-white border rounded-md shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {filteredCustomers.slice(0, 10).map(c => (
                        <button key={c.id} onMouseDown={() => selectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0">
                          <p className="text-xs font-medium text-slate-800">{c.contact_name} {c.company_name ? `— ${c.company_name}` : ''}</p>
                          <p className="text-xs text-slate-400">{c.email} {c.phone ? `· ${c.phone}` : ''}</p>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400">No customers found</div>
                      )}
                    </div>
                  )}
                </div>
                {quote.customer_name && (
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span><strong>{quote.customer_name}</strong></span>
                    {quote.company_name && <span className="text-slate-400">{quote.company_name}</span>}
                    {quote.customer_email && <span className="text-slate-400">{quote.customer_email}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white border rounded-lg">
              {/* Line item toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-700">Line Items</h2>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" onClick={addCatalogRow} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
                    <Plus className="w-3 h-3" /> Add New Product
                  </Button>
                  <Button size="sm" variant="outline" onClick={addFreeFlow} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Add Free Form Product
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowProductPicker(true)} className="h-7 text-xs gap-1 text-slate-500">
                    <Plus className="w-3 h-3" /> Browse Catalog
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-slate-400" disabled>
                    Add Extra Charge
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-slate-400" disabled>
                    Add Divider
                  </Button>
                </div>
              </div>

              {/* Line item table (desktop) */}
              <div className="hidden md:block overflow-x-visible">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-2 py-2 text-center w-8">#</th>
                      <th className="px-1 py-2 w-10"></th>
                      <th className="px-2 py-2 text-left min-w-[180px]">Name</th>
                      <th className="px-2 py-2 text-left w-32">Color</th>
                      <th className="px-2 py-2 text-left w-36">Size / Qty</th>
                      <th className="px-2 py-2 text-left w-32">Decorations</th>
                      <th className="px-2 py-2 text-left w-28">Price</th>
                      <th className="px-2 py-2 text-center w-12">Qty</th>
                      <th className="px-2 py-2 text-right w-20">Line Total</th>
                      <th className="px-2 py-2 text-left w-20">Discount</th>
                      <th className="px-2 py-2 text-right w-20">Disc. Price</th>
                      <th className="px-2 py-2 text-right w-20">Disc. Total</th>
                      <th className="px-2 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400 text-sm">
                          No products added yet. Use the buttons above to add products.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, idx) => (
                        <LineItemRow
                          key={idx}
                          item={item}
                          index={idx}
                          onChange={(updated) => updateItem(idx, updated)}
                          onRemove={() => removeItem(idx)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Line item cards (mobile) */}
              <div className="md:hidden divide-y">
                {lineItems.length === 0 ? (
                  <p className="py-10 text-center text-slate-400 text-sm">No products added yet. Use the buttons above to add products.</p>
                ) : (
                  lineItems.map((item, idx) => (
                    <LineItemCard
                      key={idx}
                      item={item}
                      index={idx}
                      onChange={(updated) => updateItem(idx, updated)}
                      onRemove={() => removeItem(idx)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Terms and Notes */}
            <div className="bg-white border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Terms and Conditions</label>
                <select
                  value={quote.terms}
                  onChange={e => setQ({ terms: e.target.value })}
                  className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-white h-8"
                >
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
                <textarea
                  value={quote.notes}
                  onChange={e => setQ({ notes: e.target.value })}
                  placeholder="Notes visible to customer..."
                  className="mt-1 w-full border rounded px-2 py-1.5 text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Totals Bar */}
            <QuoteTotalsBar quote={quote} lineItems={lineItems} onChange={setQ} />

          </div>

          {/* ── Sidebar ── */}
          <QuoteSidebar
            quote={quote}
            onChange={setQ}
            onSaveDraft={handleSaveDraft}
            onSaveQuote={handleSaveQuote}
            onSendQuote={handleSendQuote}
            onManualApprove={handleManualApprove}
            onPreview={() => setShowPreview(true)}
            saving={saving}
          />

        </div>
      </div>

      {/* Modals */}
      <QuotePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        quote={quote}
        lineItems={lineItems}
      />
      <ProductPickerModal
        open={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={handleProductSelected}
      />
      <AddCustomerModal
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSaved={(customer) => {
          setCustomers(prev => [customer, ...prev]);
          selectCustomer(customer);
          setShowAddCustomer(false);
        }}
      />
    </div>
  );
}