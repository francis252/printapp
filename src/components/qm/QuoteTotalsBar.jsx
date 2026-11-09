import { Input } from '@/components/ui/input';

export default function QuoteTotalsBar({ quote, lineItems, onChange }) {
  const subtotal = lineItems.reduce((s, i) => {
    const qty = (i.sizes || []).reduce((a, r) => a + (parseInt(r.quantity) || 0), 0);
    const discountFactor = 1 - ((parseFloat(i.discount_percent) || 0) / 100);
    return s + qty * (parseFloat(i.unit_price) || 0) * discountFactor;
  }, 0);
  const shipping = parseFloat(quote.shipping) || 0;
  const tax = subtotal * ((parseFloat(quote.tax_rate) || 0) / 100);
  const finalDiscount = parseFloat(quote.discount) || 0;
  const total = subtotal + shipping + tax - finalDiscount;
  const payments = parseFloat(quote.payments) || 0;
  const balance = total - payments;
  const totalQty = lineItems.reduce((s, i) => s + (i.sizes || []).reduce((a, r) => a + (parseInt(r.quantity) || 0), 0), 0);

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="grid grid-cols-3 gap-y-4 gap-x-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">

        {/* Total Qty */}
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Total Qty</span>
          <span className="text-lg font-bold text-slate-800">{totalQty}</span>
        </div>

        <div className="w-px h-10 bg-slate-200 hidden sm:block" />

        {/* Subtotal */}
        <div className="flex flex-col items-center min-w-[80px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Subtotal</span>
          <span className="text-sm font-semibold text-slate-700">${subtotal.toFixed(2)}</span>
        </div>

        {/* Shipping */}
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Shipping</span>
          <div className="flex items-center gap-0.5">
            <span className="text-xs text-slate-400">$</span>
            <Input
              type="number" step="0.01"
              value={quote.shipping || ''}
              onChange={e => onChange({ shipping: e.target.value })}
              className="w-20 h-7 text-xs text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Final Discount */}
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Final Discount</span>
          <div className="flex items-center gap-0.5">
            <span className="text-xs text-slate-400">$</span>
            <Input
              type="number" step="0.01"
              value={quote.discount || ''}
              onChange={e => onChange({ discount: e.target.value })}
              className="w-20 h-7 text-xs text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Tax */}
        <div className="flex flex-col items-center min-w-[80px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Tax</span>
          <div className="flex items-center gap-0.5">
            <Input
              type="number" step="0.1"
              value={quote.tax_rate || ''}
              onChange={e => onChange({ tax_rate: e.target.value })}
              className="w-16 h-7 text-xs text-right"
              placeholder="0"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        </div>

        {/* Payments */}
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Payments</span>
          <div className="flex items-center gap-0.5">
            <span className="text-xs text-slate-400">$</span>
            <Input
              type="number" step="0.01"
              value={quote.payments || ''}
              onChange={e => onChange({ payments: e.target.value })}
              className="w-20 h-7 text-xs text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="hidden sm:block flex-1" />

        {/* Grand Total */}
        <div className="flex flex-col items-end min-w-[100px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Grand Total</span>
          <span className="text-xl font-bold text-slate-800">${total.toFixed(2)}</span>
        </div>

        <div className="w-px h-10 bg-slate-200 hidden sm:block" />

        {/* Balance Due */}
        <div className="flex flex-col items-end min-w-[100px]">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Balance Due</span>
          <span className="text-xl font-bold text-blue-700">${balance.toFixed(2)}</span>
        </div>

      </div>
    </div>
  );
}