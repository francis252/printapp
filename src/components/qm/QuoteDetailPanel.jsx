import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function QuoteDetailPanel({ job, onClose }) {
  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (!job?.quote_id) return;
    setLoading(true);
    Promise.all([
      base44.entities.Quote.filter({ id: job.quote_id }),
      base44.entities.QuoteLineItem.filter({ quote_id: job.quote_id }, 'sort_order'),
    ]).then(([quoteData, items]) => {
      setQuote(quoteData?.[0] || null);
      setLineItems(items || []);
      setLoading(false);
    });
  }, [job?.quote_id]);

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const subtotal = lineItems.reduce((s, i) => s + (i.line_total || 0), 0);
  const tax = quote ? (subtotal * (quote.tax_rate || 0)) / 100 : 0;
  const total = subtotal + tax + (quote?.shipping || 0) - (quote?.discount || 0);

  if (!job) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[560px] bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Quote #{quote?.quote_number || job.quote_number || '—'}
            </h2>
            {(quote?.company_name || job.company_name) && (
              <p className="text-sm text-muted-foreground">{quote?.company_name || job.company_name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Quote meta */}
              <div className="px-5 py-4 border-b bg-muted/20">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{quote?.customer_name || job.customer_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sales Rep</p>
                    <p className="font-medium">{quote?.sales_rep || job.sales_rep || '—'}</p>
                  </div>
                  {quote?.ship_by_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ship By</p>
                      <p className="font-medium">{new Date(quote.ship_by_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  )}
                  {quote?.customer_po && (
                    <div>
                      <p className="text-xs text-muted-foreground">Customer PO</p>
                      <p className="font-medium">{quote.customer_po}</p>
                    </div>
                  )}
                </div>
                {quote?.notes && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs font-semibold text-muted-foreground pb-2 border-b mb-2">
                  <span>Item</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right w-20">Rate (Ea)</span>
                  <span className="text-right w-20">Total</span>
                </div>

                {lineItems.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No line items on this quote.</p>
                )}

                {lineItems.map((item) => (
                  <div key={item.id} className="border rounded-lg mb-3 overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {/* Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-slate-50 rounded border flex items-center justify-center overflow-hidden">
                        {item.product_image_url ? (
                          <img src={item.product_image_url} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground leading-tight">{item.product_name}</p>
                        {item.color && <p className="text-xs text-muted-foreground">{item.color}</p>}
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                        {item.sizes?.some(s => s.quantity > 0) && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-xs text-primary mt-1 hover:underline"
                          >
                            {expandedItems[item.id] ? 'Hide Details' : 'Show Details'}
                          </button>
                        )}
                      </div>

                      {/* Qty / Price */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-medium">{item.total_quantity || 0}</span>
                        <span className="text-xs text-muted-foreground">${Number(item.unit_price || 0).toFixed(2)}</span>
                        <span className="text-sm font-semibold text-foreground">${Number(item.line_total || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Size breakdown */}
                    {expandedItems[item.id] && item.sizes?.some(s => s.quantity > 0) && (
                      <div className="border-t bg-slate-50 px-3 py-2">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs text-muted-foreground font-medium mb-1">
                          <span>Size</span>
                          <span>Color</span>
                          <span className="w-12 text-right">Qty</span>
                          <span className="w-16 text-right">Total</span>
                        </div>
                        {item.sizes.filter(s => s.quantity > 0).map((s, i) => (
                          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs py-0.5">
                            <span>{s.size}</span>
                            <span className="text-muted-foreground">{item.color || '—'}</span>
                            <span className="w-12 text-right">{s.quantity}</span>
                            <span className="w-16 text-right">${(s.quantity * (item.unit_price || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Totals footer */}
        {!loading && lineItems.length > 0 && (
          <div className="flex-shrink-0 border-t px-5 py-4 bg-white space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {(quote?.shipping || 0) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span>${Number(quote.shipping).toFixed(2)}</span>
              </div>
            )}
            {(quote?.tax_rate || 0) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({quote.tax_rate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-foreground border-t pt-2 mt-1">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}