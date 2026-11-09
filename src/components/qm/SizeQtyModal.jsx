import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export default function SizeQtyModal({ open, onClose, item, onSave }) {
  const [sizes, setSizes] = useState(() => {
    const existing = {};
    (item?.sizes || []).forEach(s => { existing[s.size] = s.quantity; });
    return existing;
  });
  const [unspecifiedQty, setUnspecifiedQty] = useState(() => {
    const u = (item?.sizes || []).find(s => s.size === 'ONE SIZE' || s.size === 'UNSPECIFIED');
    return u?.quantity || 0;
  });

  // Detect if this is a "one size" type product (hat/cap keywords)
  const isOneSize = /hat|cap|beanie|visor|bucket/i.test(item?.product_name || '');

  const setSize = (size, val) => {
    const qty = parseInt(val) || 0;
    setSizes(prev => ({ ...prev, [size]: qty }));
  };

  const totalQty = isOneSize
    ? (parseInt(unspecifiedQty) || 0)
    : Object.values(sizes).reduce((s, v) => s + (parseInt(v) || 0), 0);

  const handleSave = () => {
    let sizeArr;
    if (isOneSize) {
      sizeArr = unspecifiedQty > 0 ? [{ size: 'ONE SIZE', quantity: parseInt(unspecifiedQty) }] : [];
    } else {
      sizeArr = APPAREL_SIZES
        .filter(s => sizes[s] > 0)
        .map(s => ({ size: s, quantity: parseInt(sizes[s]) }));
      if (sizes['unspecified'] > 0) {
        sizeArr.push({ size: 'unspecified', quantity: parseInt(sizes['unspecified']) });
      }
    }
    onSave(sizeArr);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Size / Qty — {item?.product_name || 'Product'}</DialogTitle>
        </DialogHeader>

        {isOneSize ? (
          <div className="py-4">
            <p className="text-xs text-slate-500 mb-3">This appears to be a one-size product.</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-24">ONE SIZE</span>
              <Input
                type="number"
                min="0"
                value={unspecifiedQty}
                onChange={e => setUnspecifiedQty(e.target.value)}
                className="w-24 text-sm h-8"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="grid grid-cols-1 gap-0 border rounded-md overflow-hidden text-sm">
              <div className="grid grid-cols-4 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                <span>Size</span>
                <span>Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
              </div>
              {APPAREL_SIZES.map(size => (
                <div key={size} className="grid grid-cols-4 items-center px-3 py-2 border-t">
                  <span className="font-medium text-slate-700">{size}</span>
                  <Input
                    type="number"
                    min="0"
                    value={sizes[size] || ''}
                    onChange={e => setSize(size, e.target.value)}
                    className="w-16 h-7 text-sm"
                    placeholder="0"
                  />
                  <span className="col-span-2 text-right text-slate-400 text-xs">
                    ${parseFloat(item?.unit_price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-4 items-center px-3 py-2 border-t bg-slate-50">
                <span className="text-slate-500 text-xs">unspecified</span>
                <Input
                  type="number"
                  min="0"
                  value={sizes['unspecified'] || ''}
                  onChange={e => setSize('unspecified', e.target.value)}
                  className="w-16 h-7 text-sm"
                  placeholder="0"
                />
                <span className="col-span-2 text-right text-slate-400 text-xs">
                  ${parseFloat(item?.unit_price || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-slate-500">Total Qty: <strong>{totalQty}</strong></span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">OK</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}