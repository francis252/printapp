import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, Package, Loader2, Wand2 } from 'lucide-react';
import SizeQtyModal from './SizeQtyModal';
import MockupBuilderModal from './MockupBuilderModal';
import PricingPopover from './PricingPopover';
import {
  DECO_METHODS, ProductSearchField, recalcItem, totalQtyOf,
  discountedPriceOf, sizeSummaryOf,
} from './lineItemShared';

// Mobile card layout for a quote line item (used on small screens)
export default function LineItemCard({ item, index, onChange, onRemove }) {
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showMockupBuilder, setShowMockupBuilder] = useState(false);
  const [ssColors, setSsColors] = useState(item._ssColors || []);
  const [ssLoading, setSsLoading] = useState(false);

  // Sync S&S colors from item (e.g. after product search selection)
  useEffect(() => {
    if ((item._ssColors || []).length) setSsColors(item._ssColors);
  }, [item._ssColors]);

  const setField = (key, val) => onChange(recalcItem({ ...item, [key]: val }));

  const handleColorChange = (colorName) => {
    const colorObj = ssColors.find(c => c.colorName === colorName);
    const updated = { ...item, color: colorName };
    if (colorObj?.frontImage) updated.product_image_url = colorObj.frontImage;
    onChange(recalcItem(updated));
  };

  const totalQty = totalQtyOf(item);
  const lineTotal = totalQty * discountedPriceOf(item);
  const isFreeflow = item.item_type === 'freeflow';

  return (
    <div className="p-3 space-y-3">
      {/* Header: thumb + product name + delete */}
      <div className="flex items-start gap-2">
        <div
          className="w-10 h-10 rounded border bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => setShowMockupBuilder(true)}
          title="Open Mockup Builder"
        >
          {item.product_image_url ? (
            <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-slate-200" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isFreeflow ? (
            <Input
              value={item.product_name || ''}
              onChange={e => setField('product_name', e.target.value)}
              placeholder="Product name..."
              className="text-sm h-9"
            />
          ) : (
            <ProductSearchField item={item} onChange={onChange} className="text-sm h-9" placeholder="Select product..." />
          )}
          {item.style_number && (
            <p className="text-xs text-slate-400 mt-1 truncate">{item.style_number} {item.supplier_name ? `· ${item.supplier_name}` : ''}</p>
          )}
        </div>
        <button onClick={onRemove} title="Remove" className="p-1.5 rounded hover:bg-red-100 text-red-400 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs text-slate-400 block mb-1">Color</span>
          {ssColors.length > 0 ? (
            <select
              value={item.color || ''}
              onChange={e => handleColorChange(e.target.value)}
              className="w-full border rounded px-2 py-2 text-sm bg-white h-9"
            >
              <option value="">Select...</option>
              {ssColors.map(c => <option key={c.colorName} value={c.colorName}>{c.colorName}</option>)}
            </select>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={item.color || ''}
                onChange={e => setField('color', e.target.value)}
                placeholder="Color..."
                className="text-sm h-9"
              />
              {ssLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
            </div>
          )}
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-1">Sizes / Qty</span>
          <button
            onClick={() => setShowSizeModal(true)}
            className="w-full text-left text-sm px-2 py-2 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors h-9 truncate bg-white"
          >
            {sizeSummaryOf(item)}
          </button>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-1">Decoration</span>
          <div className="flex items-center gap-1">
            <select
              value={item.decoration_method || ''}
              onChange={e => setField('decoration_method', e.target.value)}
              className="flex-1 border rounded px-2 py-2 text-sm bg-white h-9"
            >
              <option value="">—</option>
              {DECO_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setShowMockupBuilder(true)} title="Mockup Builder" className="p-2 rounded hover:bg-blue-100 text-blue-500 flex-shrink-0">
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-1">Price</span>
          <PricingPopover item={item} onChange={(updated) => onChange(recalcItem(updated))} />
        </div>
      </div>

      {/* Footer: discount + totals */}
      <div className="flex items-center gap-2 border-t pt-2">
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-slate-400">Disc</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={item.discount_percent || ''}
            onChange={e => setField('discount_percent', parseFloat(e.target.value) || 0)}
            className="text-xs h-8 w-16 text-right"
            placeholder="0"
          />
          <span className="text-xs text-slate-400">%</span>
        </div>
        <div className="flex-1 text-right">
          <span className="text-xs text-slate-400">Qty {totalQty} · </span>
          <span className="text-sm font-semibold text-slate-800">${lineTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Modals */}
      <SizeQtyModal
        open={showSizeModal}
        onClose={() => setShowSizeModal(false)}
        item={item}
        onSave={(sizeArr) => onChange(recalcItem({ ...item, sizes: sizeArr }))}
      />
      <MockupBuilderModal
        open={showMockupBuilder}
        onClose={() => setShowMockupBuilder(false)}
        item={item}
        ssColors={ssColors}
        onSave={({ product_image_url, mockups, decoration_colors }) => onChange(recalcItem({ ...item, product_image_url, mockups, decoration_colors }))}
      />
    </div>
  );
}