import { useMemo } from 'react';

export default function SalesReport({ quotes }) {
  const totals = useMemo(() => {
    return quotes.reduce((acc, q) => {
      acc.subtotal += q.subtotal || 0;
      acc.shipping += q.shipping || 0;
      acc.tax += (((q.subtotal || 0) * (q.tax_rate || 0)) / 100);
      acc.discount += q.discount || 0;
      acc.total += q.total || 0;
      acc.payments += q.payments || 0;
      acc.balance += q.balance_due || 0;
      return acc;
    }, { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0, payments: 0, balance: 0 });
  }, [quotes]);

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // Summary cards
  const cards = [
    { label: 'Gross Sales', value: fmt(totals.subtotal), color: 'text-blue-600' },
    { label: 'Shipping', value: fmt(totals.shipping), color: 'text-slate-600' },
    { label: 'Discounts', value: fmt(totals.discount), color: 'text-orange-500' },
    { label: 'Tax Collected', value: fmt(totals.tax), color: 'text-purple-600' },
    { label: 'Total Revenue', value: fmt(totals.total), color: 'text-green-600' },
    { label: 'Payments', value: fmt(totals.payments), color: 'text-emerald-600' },
    { label: 'Balance Due', value: fmt(totals.balance), color: 'text-red-500' },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-card border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-foreground">Sales Detail ({quotes.length} quotes)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Quote #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Rep</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Subtotal</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Shipping</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Discount</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Tax</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Payments</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-muted-foreground">No quotes match the selected filters.</td></tr>
              ) : quotes.map(q => {
                const tax = ((q.subtotal || 0) * (q.tax_rate || 0)) / 100;
                return (
                  <tr key={q.id} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(q.created_date)}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{q.quote_number || '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">{q.customer_name || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{q.company_name || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{q.sales_rep || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        q.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                        q.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{q.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">{fmt(q.subtotal)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(q.shipping)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-500">{q.discount ? fmt(q.discount) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-purple-600">{tax > 0 ? fmt(tax) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">{fmt(q.total)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{fmt(q.payments)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{fmt(q.balance_due)}</td>
                  </tr>
                );
              })}
            </tbody>
            {quotes.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/20 font-bold">
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-foreground">Totals</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmt(totals.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmt(totals.shipping)}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{fmt(totals.discount)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt(totals.tax)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(totals.total)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmt(totals.payments)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmt(totals.balance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}