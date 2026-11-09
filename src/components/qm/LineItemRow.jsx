import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, Wand2, Package, Loader2 } from 'lucide-react';
import SizeQtyModal from './SizeQtyModal';
import MockupBuilderModal from './MockupBuilderModal';
import PricingPopover from './PricingPopover';
import {
  DECO_METHODS, ProductSearchField, recalcItem, totalQtyOf,
  discountedPriceOf, sizeSummaryOf,
} from './lineItemShared';

// Desktop table row for a quote line item
export default function LineItemRow({ item, index, onChange, onRemove }) {
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showMockupBuilder, setShowMockupBuilder] = useState(false);
  const [ssColors, setSsColors] = useState(item._ssColors || []);
  const [ssLoading, setSsLoading] = useState(false);

  // Sync S&S colors from item (e.g. after product search selection)
  useEffect(() => {
    if ((item._ssColors || []).length) setSsColors(item._ssColors);
  }, [item._ssColors]);

  const setField = (key, val) => onChange(recalcItem({ ...item, [key]: val }));

  const handleSizeSave = (sizeArr) => onChange(recalcItem({ ...item, sizes: sizeArr }));

  const handleColorChange = (colorName) => {
    const colorObj = ssColors.find(c => c.colorName === colorName);
    const updated = { ...item, color: colorName };
    if (colorObj?.frontImage) updated.product_image_url = colorObj.frontImage;
    onChange(recalcItem(updated));
  };

  const totalQty = totalQtyOf(item);
  const discountedPrice = discountedPriceOf(item);
  const lineTotal = totalQty * discountedPrice;
  const sizeSummary = sizeSummaryOf(item);
  const isFreeflow = item.item_type === 'freeflow';

  return (
    <>
      <tr className="border-b hover:bg-slate-50 group">
        {/* # */}
        <td className="px-2 py-3 text-center text-xs text-slate-400 w-8">{index + 1}</td>

        {/* Thumbnail */}
        <td className="px-1 py-3 w-10">
          <div
            className="w-9 h-9 rounded border bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80"
            onClick={() => setShowMockupBuilder(true)}
            title="Open Mockup Builder"
          >
            {item.product_image_url ? (
              <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-slate-200" />
            )}
          </div>
        </td>

        {/* Name / product search */}
        <td className="px-2 py-3 min-w-[180px]">
          {isFreeflow ? (
            <Input
              value={item.product_name || ''}
              onChange={e => setField('product_name', e.target.value)}
              placeholder="Product name..."
              className="text-xs h-7 border-slate-200"
            />
          ) : (
            <ProductSearchField item={item} onChange={onChange} />
          )}
          {item.style_number && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.style_number} {item.supplier_name ? `· ${item.supplier_name}` : ''}</p>
          )}
        </td>

        {/* Color */}
        <td className="px-2 py-3 w-32">
          {ssColors.length > 0 ? (
            <select
              value={item.color || ''}
              onChange={e => handleColorChange(e.target.value)}
              className="w-full border rounded px-1.5 py-1 text-xs bg-white h-7"
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
                className="text-xs h-7 border-slate-200"
              />
              {ssLoading && <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />}
            </div>
          )}
        </td>

        {/* Size / Qty */}
        <td className="px-2 py-3 w-36">
          <button
            onClick={() => setShowSizeModal(true)}
            className="w-full text-left text-xs px-2 py-1 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors h-7 truncate"
          >
            {sizeSummary}
          </button>
        </td>

        {/* Decoration */}
        <td className="px-2 py-3 w-36">
          <div className="flex items-center gap-1">
            <select
              value={item.decoration_method || ''}
              onChange={e => setField('decoration_method', e.target.value)}
              className="flex-1 border rounded px-1.5 py-1 text-xs bg-white h-7"
            >
              <option value="">—</option>
              {DECO_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={() => setShowMockupBuilder(true)}
              title="Mockup Builder"
              className="p-1 rounded hover:bg-blue-100 text-blue-500 flex-shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>

        {/* Price (with popover for cost/markup/override) */}
        <td className="px-2 py-3 w-28">
          <PricingPopover
            item={item}
            onChange={(updated) => onChange(recalcItem(updated))}
          />
        </td>

        {/* Qty total */}
        <td className="px-2 py-3 text-center text-xs text-slate-700 w-12 font-medium">{totalQty}</td>

        {/* Line Total */}
        <td className="px-2 py-3 text-right text-xs font-medium text-slate-800 w-20">
          ${(totalQty * (parseFloat(item.unit_price) || 0)).toFixed(2)}
        </td>

        {/* Discount % */}
        <td className="px-2 py-3 w-20">
          <div className="flex items-center gap-0.5">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={item.discount_percent || ''}
              onChange={e => setField('discount_percent', parseFloat(e.target.value) || 0)}
              className="text-xs h-8 border-slate-200 w-full"
              placeholder="0"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        </td>

        {/* Discounted Unit Price */}
        <td className="px-2 py-3 text-right text-xs text-slate-700 w-20">
          ${discountedPrice.toFixed(2)}
        </td>

        {/* Discounted Total */}
        <td className="px-2 py-3 text-right text-xs font-semibold text-slate-800 w-20">
          ${lineTotal.toFixed(2)}
        </td>

        {/* Actions */}
        <td className="px-2 py-3 w-10">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onRemove}
              title="Remove"
              className="p-1 rounded hover:bg-red-100 text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Size/Qty Modal */}
      <SizeQtyModal
        open={showSizeModal}
        onClose={() => setShowSizeModal(false)}
        item={item}
        onSave={handleSizeSave}
      />

      {/* Mockup Builder Modal */}
      <MockupBuilderModal
        open={showMockupBuilder}
        onClose={() => setShowMockupBuilder(false)}
        item={item}
        ssColors={ssColors}
        onSave={({ product_image_url, mockups, decoration_colors }) => {
          onChange(recalcItem({ ...item, product_image_url, mockups, decoration_colors }));
        }}
      />
    </>
  );
}