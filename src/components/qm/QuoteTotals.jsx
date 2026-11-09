import { Input } from '@/components/ui/input';

export default function QuoteTotals({ quote, onChange }) {
  const subtotal = quote._subtotal || 0;
  const shipping = parseFloat(quote.shipping) || 0;
  const tax = subtotal * ((parseFloat(quote.tax_rate) || 0) / 100);
  const discount = parseFloat(quote.discount) || 0;
  const total = subtotal + shipping + tax - discount;
  const deposit = total * ((parseFloat(quote.deposit_percent) || 50) / 100);
  const balance = total - deposit;

  const row = (label, value, bold) => (
    <div className={`flex justify-between py-1.5 ${bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm">${value.toFixed(2)}</span>
    </div>
  );

  return (
    <div className="bg-white border rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Quote Summary</h3>

      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <label className="text-slate-400 font-semibold uppercase tracking-wide">Shipping ($)</label>
          <Input type="number" step="0.01" value={quote.shipping || ''} onChange={e => onChange({ shipping: e.target.value })} className="mt-0.5 h-8 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="text-slate-400 font-semibold uppercase tracking-wide">Tax (%)</label>
          <Input type="number" step="0.1" value={quote.tax_rate || ''} onChange={e => onChange({ tax_rate: e.target.value })} className="mt-0.5 h-8 text-sm" placeholder="0" />
        </div>
        <div>
          <label className="text-slate-400 font-semibold uppercase tracking-wide">Discount ($)</label>
          <Input type="number" step="0.01" value={quote.discount || ''} onChange={e => onChange({ discount: e.target.value })} className="mt-0.5 h-8 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="text-slate-400 font-semibold uppercase tracking-wide">Deposit (%)</label>
          <Input type="number" step="1" value={quote.deposit_percent ?? 50} onChange={e => onChange({ deposit_percent: e.target.value })} className="mt-0.5 h-8 text-sm" placeholder="50" />
        </div>
      </div>

      <div className="border-t pt-2 divide-y">
        {row('Subtotal', subtotal)}
        {row('Shipping', shipping)}
        {row('Tax', tax)}
        {row('Discount', -discount)}
        {row('Grand Total', total, true)}
      </div>

      <div className="border-t pt-2 space-y-1 bg-blue-50 rounded-md p-2 mt-1">
        <div className="flex justify-between text-sm text-blue-800">
          <span>Deposit Required ({quote.deposit_percent ?? 50}%)</span>
          <span className="font-bold">${deposit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-700">
          <span>Balance Due</span>
          <span className="font-semibold">${balance.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}