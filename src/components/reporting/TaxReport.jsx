import { useMemo } from 'react';

export default function TaxReport({ quotes }) {
  // Only quotes that have a tax rate > 0
  const taxable = useMemo(() => quotes.filter(q => (q.tax_rate || 0) > 0), [quotes]);
  const nonTaxable = useMemo(() => quotes.filter(q => !(q.tax_rate || 0)), [quotes]);

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const totals = useMemo(() => taxable.reduce((acc, q) => {
    const gross = q.subtotal || 0;
    const tax = (gross * (q.tax_rate || 0)) / 100;
    acc.gross += gross;
    acc.tax += tax;
    acc.total += (q.total || 0);
    return acc;
  }, { gross: 0, tax: 0, total: 0 }), [taxable]);

  const allGross = useMemo(() => quotes.reduce((s, q) => s + (q.subtotal || 0), 0), [quotes]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Gross Sales</p>
          <p className="text-lg font-bold text-blue-600">{taxable.length > 0 ? fmt(allGross) : fmt(0)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Taxable Sales</p>
          <p className="text-lg font-bold text-orange-500">{fmt(totals.gross)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Non-Taxable Sales</p>
          <p className="text-lg font-bold text-slate-600">{fmt(allGross - totals.gross)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Tax Collected</p>
          <p className="text-lg font-bold text-purple-600">{fmt(totals.tax)}</p>
        </div>
      </div>

      {/* Taxable Transactions */}
      <div className="bg-card border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-foreground">Taxable Transactions ({taxable.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Quote #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Gross (Subtotal)</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Tax Rate</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Tax Amount</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {taxable.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No taxable transactions in this period.</td></tr>
              ) : taxable.map(q => {
                const gross = q.subtotal || 0;
                const tax = (gross * (q.tax_rate || 0)) / 100;
                return (
                  <tr key={q.id} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(q.created_date)}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{q.quote_number || '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">{q.customer_name || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{q.company_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        q.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                        'bg-blue-100 text-blue-700'
                      }`}>{q.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">{fmt(gross)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{q.tax_rate}%</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-purple-600">{fmt(tax)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">{fmt(q.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            {taxable.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/20 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-foreground">Totals</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmt(totals.gross)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt(totals.tax)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Non-Taxable summary */}
      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm font-semibold text-foreground mb-1">Non-Taxable Sales</p>
        <p className="text-xs text-muted-foreground">{nonTaxable.length} transactions · Gross total: <strong>{fmt(allGross - totals.gross)}</strong> · No tax collected.</p>
      </div>
    </div>
  );
}