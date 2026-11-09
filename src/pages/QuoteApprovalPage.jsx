import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Loader2, MessageSquare, Check, X, CreditCard } from 'lucide-react';
import QuoteDocument from '@/components/qm/QuoteDocument';

export default function QuoteApprovalPage() {
  const { quoteId, token } = useParams();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading');
  // states: loading | view | awaiting_payment | approved | rejected | already_done | error
  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineComment, setDeclineComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);

  const paidSuccess = searchParams.get('paid') === '1';
  const paidAmountType = searchParams.get('amountType');

  useEffect(() => {
    const load = async () => {
      const [foundQuote] = await base44.entities.Quote.filter({ id: quoteId });
      if (!foundQuote) { setState('error'); return; }
      if (foundQuote.approval_token !== token) { setState('error'); return; }

      // Mark as paid if coming back from Stripe
      if (paidSuccess && !foundQuote.paid) {
        await base44.functions.invoke('markQuotePaid', { quoteId, amountType: paidAmountType || 'full' });
        foundQuote.paid = true;
        foundQuote.paid_amount_type = paidAmountType || 'full';
      }

      setQuote(foundQuote);

      if (foundQuote.rejected_at) {
        setState('already_done');
        return;
      }

      // Already fully approved & paid (or has terms that don't need upfront payment)
      if (foundQuote.approved_at) {
        const needsPayment = !foundQuote.terms || foundQuote.terms === 'No Terms';
        if (needsPayment && !foundQuote.paid) {
          // Load line items so we can show payment screen
          const items = await base44.entities.QuoteLineItem.filter({ quote_id: quoteId }, 'sort_order');
          setLineItems(items || []);
          setState('awaiting_payment');
        } else {
          setState('already_done');
        }
        return;
      }

      const items = await base44.entities.QuoteLineItem.filter({ quote_id: quoteId }, 'sort_order');
      setLineItems(items || []);
      setState('view');
    };
    load().catch(() => setState('error'));
  }, []);

  const handleApprove = async () => {
    setProcessing(true);
    await base44.entities.Quote.update(quoteId, { status: 'Approved', approved_at: new Date().toISOString() });

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

    const existingPOs = await base44.entities.PurchaseOrder.filter({ quote_id: quoteId });
    if (!existingPOs || existingPOs.length === 0) {
      const bySupplier = {};
      for (const item of lineItems) {
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

    setProcessing(false);

    // If No Terms → require payment now
    const needsPayment = !quote.terms || quote.terms === 'No Terms';
    if (needsPayment) {
      setState('awaiting_payment');
    } else {
      setState('approved');
    }
  };

  const handlePayNow = async (amountType) => {
    setPaymentLoading(amountType);
    const res = await base44.functions.invoke('createStripePaymentLink', { quoteId, amountType });
    setPaymentLoading(null);
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
  };

  const handleDecline = async (withComment) => {
    setProcessing(true);
    const updates = { status: 'Rejected', rejected_at: new Date().toISOString() };
    if (withComment && declineComment) updates.internal_notes = `Customer declined with comment: ${declineComment}`;
    await base44.entities.Quote.update(quoteId, updates);
    setState('rejected');
    setShowDeclineModal(false);
    setProcessing(false);
  };

  const subtotal = lineItems.reduce((s, i) => {
    const qty = (i.sizes || []).reduce((a, r) => a + (parseInt(r.quantity) || 0), 0);
    return s + qty * (parseFloat(i.unit_price) || 0);
  }, 0);
  const shipping = parseFloat(quote?.shipping) || 0;
  const taxRate = parseFloat(quote?.tax_rate) || 0;
  const tax = subtotal * (taxRate / 100);
  const discount = parseFloat(quote?.discount) || 0;
  const total = subtotal + shipping + tax - discount;
  const depositPct = parseFloat(quote?.deposit_percent) || 50;
  const depositRequired = total * (depositPct / 100);

  // ── Full-screen states ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-700">Invalid or expired link</p>
        </div>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center bg-white rounded-xl shadow p-10">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <p className="text-2xl font-bold text-slate-800">Quote Declined</p>
          <p className="text-slate-500 mt-2">We'll reach out to discuss next steps.</p>
        </div>
      </div>
    );
  }

  if (state === 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <p className="text-2xl font-bold text-slate-800">Quote Accepted!</p>
          <p className="text-slate-500 mt-2">Thank you — we'll be in touch shortly to get started.</p>
        </div>
      </div>
    );
  }

  if (state === 'already_done') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
          {quote?.approved_at
            ? <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />}
          <p className="text-2xl font-bold text-slate-800">
            {quote?.approved_at ? 'Quote Already Accepted' : 'Quote Already Declined'}
          </p>
          {quote?.paid && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-semibold">
              <CheckCircle className="w-5 h-5" /> Payment Received
            </div>
          )}
          <p className="text-slate-500 mt-2">This quote has already been responded to.</p>
        </div>
      </div>
    );
  }

  // ── Awaiting Payment (No Terms) ─────────────────────────────────────────────
  if (state === 'awaiting_payment') {
    const isPaid = paidSuccess || quote?.paid;
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          {isPaid ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-slate-800">Payment Received!</p>
              <p className="text-slate-500 mt-2">Thank you — your quote is confirmed and we'll be in touch shortly.</p>
            </>
          ) : (
            <>
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-slate-800">Quote Approved!</p>
              <p className="text-slate-600 mt-2 mb-6">
                Thanks for approving your quote. To get started, please complete payment below.
              </p>

              <div className="bg-slate-50 rounded-lg p-4 text-left mb-6 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Job</span>
                  <span className="font-medium text-slate-800">{quote?.job_name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total</span>
                  <span className="font-bold text-slate-800">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary font-semibold">
                  <span>Deposit ({depositPct}%)</span>
                  <span>${depositRequired.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handlePayNow('deposit')}
                  disabled={!!paymentLoading}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow"
                >
                  {paymentLoading === 'deposit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pay Deposit — ${depositRequired.toFixed(2)}
                </button>
                <button
                  onClick={() => handlePayNow('full')}
                  disabled={!!paymentLoading}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800 transition-colors shadow"
                >
                  {paymentLoading === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pay Full Balance — ${total.toFixed(2)}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
                🔒 Secure payment powered by Stripe
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main quote view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Sticky action bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500 font-medium">Please review your quote below</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeclineModal(true)}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Decline with Comment
            </button>
            <button
              onClick={() => handleDecline(false)}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Accept Quote
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <QuoteDocument quote={quote} lineItems={lineItems} onApprove={handleApprove} processing={processing} />
      </div>

      {/* Decline with Comment Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Decline Quote</h2>
            <p className="text-sm text-slate-500 mb-4">Optionally leave a comment so we can better understand your needs.</p>
            <textarea
              value={declineComment}
              onChange={e => setDeclineComment(e.target.value)}
              placeholder="Your comment (optional)..."
              className="w-full border rounded-lg px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecline(true)}
                disabled={processing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Submit Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}