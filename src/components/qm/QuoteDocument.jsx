// The customer-facing quote document — shared by the public approval page
// and the in-builder Customer Preview so both show exactly the same thing.
export default function QuoteDocument({ quote, lineItems = [], onApprove, processing }) {
  const isImage = (url) => url && /\.(png|jpg|jpeg|gif|webp)$/i.test(url);

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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">

      {/* Company header */}
      <div className="p-8 border-b">
        <p className="text-xl font-bold text-slate-800">4 R Stitching Co.</p>
        <p className="text-slate-500 text-sm mt-0.5">3307 Wurzbach Rd, San Antonio, Texas 78238</p>
        <p className="text-slate-500 text-sm">(210) 854-7939 · francis@4rstitchingco.com</p>
      </div>

      {/* Quote meta */}
      <div className="p-8 border-b">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Quote</h1>
        <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm mb-6">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Quote #</p>
            <p className="font-semibold text-slate-700">{quote.quote_number || '—'}</p>
          </div>
          {quote.expiration_date && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Valid Until</p>
              <p className="font-semibold text-slate-700">{quote.expiration_date}</p>
            </div>
          )}
          {quote.ship_by_date && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Ship By</p>
              <p className="font-semibold text-slate-700">{quote.ship_by_date}</p>
            </div>
          )}
          {quote.sales_rep && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Sales Rep</p>
              <p className="font-semibold text-slate-700">{quote.sales_rep}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Prepared For</p>
          <p className="text-xl font-bold text-slate-800">{quote.company_name || quote.customer_name}</p>
          {quote.company_name && <p className="text-slate-600">{quote.customer_name}</p>}
          {quote.customer_email && <p className="text-slate-500 text-sm">{quote.customer_email}</p>}
        </div>

        <div className="mt-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Job</p>
          <p className="text-lg font-semibold text-slate-700">{quote.job_name}</p>
        </div>
      </div>

      {/* Line items table */}
      <div className="border-b">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-8 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate (Ex Tax)</th>
              <th className="text-right px-8 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => {
              const qty = (item.sizes || []).reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
              const lineTotal = qty * (parseFloat(item.unit_price) || 0);
              const sizesList = (item.sizes || []).filter(s => s.quantity > 0);
              return (
                <tr key={item.id || i} className="border-t align-top">
                  <td className="px-8 py-5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{item.product_name}{item.style_number ? ` — ${item.style_number}` : ''}</p>
                      {item.color && <p className="text-slate-500 text-xs mt-0.5">Color: {item.color}</p>}
                      {item.decoration_method && <p className="text-slate-500 text-xs mt-0.5">{item.decoration_method}</p>}
                      {item.description && <p className="text-slate-400 text-xs mt-1">{item.description}</p>}
                      {sizesList.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Size breakdown</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {sizesList.map(s => (
                              <span key={s.size} className="text-xs text-slate-500">{s.size} × {s.quantity}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(item.decoration_colors || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.decoration_colors.map((c, ci) => (
                            <span key={ci} className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded px-1.5 py-0.5">
                              {c.hex && <span className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block" style={{ backgroundColor: c.hex }} />}
                              {c.name || c.code}
                            </span>
                          ))}
                        </div>
                      )}
                      {(item.mockups || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {item.mockups.map((m, mi) => (
                            isImage(m.url)
                              ? <a key={mi} href={m.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">📎 View Mockup: {m.name || `File ${mi + 1}`}</a>
                              : <a key={mi} href={m.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">📄 {m.name}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-right px-4 py-5 text-slate-700 align-top pt-6">{qty}</td>
                  <td className="text-right px-4 py-5 text-slate-700 align-top pt-6">${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                  <td className="text-right px-8 py-5 font-semibold text-slate-800 align-top pt-6">${lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="p-8">
        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({taxRate}%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-slate-800 border-t pt-2">
            <span>Grand Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {quote.terms && quote.terms !== 'No Terms' ? (
            <div className="flex justify-between text-slate-500 text-xs">
              <span>Payment Terms</span>
              <span className="font-medium">{quote.terms}</span>
            </div>
          ) : (
            <div className="flex justify-between text-primary font-semibold">
              <span>Deposit Required ({depositPct}%)</span>
              <span>${depositRequired.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes / Terms */}
      {(quote.notes || quote.terms) && (
        <div className="px-8 pb-8 grid grid-cols-2 gap-6 border-t pt-6">
          {quote.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-600">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Terms</p>
              <p className="text-sm text-slate-600">{quote.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="bg-slate-50 border-t px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">Ready to move forward? Accept the quote above.</p>
        <button
          onClick={onApprove}
          disabled={processing || !onApprove}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow disabled:opacity-60"
        >
          {processing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-sm leading-none">✓</span>}
          Accept Quote
        </button>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t text-center text-xs text-slate-400">
        4 R Stitching Co. · 3307 Wurzbach Rd, San Antonio, Texas 78238 · www.4rstitchingco.com
      </div>
    </div>
  );
}