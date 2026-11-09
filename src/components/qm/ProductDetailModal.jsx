import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import DrawerPanel from '@/components/ui/DrawerPanel';

function applyMarkup(cost, markupPct, roundUp) {
  if (!cost || !markupPct) return 0;
  const raw = cost * (markupPct / 100);
  return roundUp ? Math.ceil(raw) : raw;
}

export default function ProductDetailModal({ product, open, onClose, onSaved, globalMarkup, roundUp }) {
  const [costPrice, setCostPrice] = useState('');
  const [markupPct, setMarkupPct] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setCostPrice(product.cost_price != null ? String(product.cost_price) : '');
      setMarkupPct(product.markup_percent != null ? String(product.markup_percent) : String(globalMarkup || 125));
    }
  }, [product, globalMarkup]);

  const cost = parseFloat(costPrice) || 0;
  const markup = parseFloat(markupPct) || 0;
  const sellPrice = applyMarkup(cost, markup, roundUp);
  const isLive = product?._source === 'ss';

  const handleSave = async () => {
    if (!product?.id || isLive) {
      toast.error('Import this product to the catalog to set custom pricing.');
      return;
    }
    setSaving(true);
    await base44.entities.Product.update(product.id, { cost_price: cost, markup_percent: markup });
    toast.success('Pricing saved!');
    setSaving(false);
    onSaved?.({ ...product, cost_price: cost, markup_percent: markup });
    onClose();
  };

  return (
    <DrawerPanel
      open={open}
      onClose={onClose}
      title={product?.name || 'Product Detail'}
      subtitle={product ? `${product.style_number}${product.supplier_name ? ' · ' + product.supplier_name : ''}` : ''}
      width={440}
    >
      {product && (
        <div className="p-5 flex flex-col gap-5">
          {/* Image */}
          <div className="h-56 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <Package className="w-16 h-16 text-slate-200" />
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                <Zap className="w-3 h-3" /> Live S&S
              </span>
            )}
            {product.category && (
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{product.category}</span>
            )}
          </div>

          {/* Info */}
          {product.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>
          )}

          {/* Colors */}
          {(product.colors?.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Colors</p>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(product.colors) ? product.colors : product.colors.split(',')).map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-slate-50 border rounded-full text-slate-600">{typeof c === 'string' ? c.trim() : c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {(product.sizes?.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sizes</p>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(product.sizes) ? product.sizes : product.sizes.split(',')).map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-slate-50 border rounded-full text-slate-600 font-mono">{typeof s === 'string' ? s.trim() : s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">My Cost ($)</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <Input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="6.00" className="text-sm" disabled={isLive} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Markup (%)</label>
                <div className="flex items-center gap-1">
                  <Input type="number" step="1" value={markupPct} onChange={e => setMarkupPct(e.target.value)} placeholder="125" className="text-sm" disabled={isLive} />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            </div>

            {cost > 0 && markup > 0 && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg flex items-center justify-between">
                <span className="text-sm text-slate-600">Sell Price{roundUp ? <span className="text-xs text-slate-400 ml-1">(rounded)</span> : ''}</span>
                <span className="text-lg font-bold text-primary">${sellPrice.toFixed(2)}</span>
              </div>
            )}

            {isLive && (
              <p className="text-xs text-slate-400 mt-2 text-center">Import this product to the catalog to set custom pricing.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
            {!isLive && (
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Pricing'}
              </Button>
            )}
          </div>
        </div>
      )}
    </DrawerPanel>
  );
}