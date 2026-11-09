import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { ChevronDown, Check } from 'lucide-react';

// Read markup settings from localStorage
const getMarkupSettings = () => {
  const markup = parseFloat(localStorage.getItem('qm_markup') || '125');
  const roundUp = localStorage.getItem('qm_roundup') === 'true';
  let tiers = [];
  try { tiers = JSON.parse(localStorage.getItem('qm_markup_tiers') || '[]'); } catch {}
  return { markup, roundUp, tiers };
};

// Get the markup % that applies to a given cost (checks tiers first)
const getMarkupForCost = (cost) => {
  const { markup, tiers } = getMarkupSettings();
  if (!tiers || tiers.length === 0) return markup;
  for (const tier of tiers) {
    const from = parseFloat(tier.from) || 0;
    const to = tier.to === '' || tier.to === null || tier.to === undefined ? Infinity : parseFloat(tier.to);
    if (cost >= from && cost <= to) return parseFloat(tier.markup) || markup;
  }
  return markup;
};

const applyMarkupToCost = (cost, markupPct) => {
  if (!cost || cost <= 0) return 0;
  const { roundUp } = getMarkupSettings();
  const raw = cost * (markupPct / 100);
  return roundUp ? Math.ceil(raw) : parseFloat(raw.toFixed(2));
};

export default function PricingPopover({ item, onChange }) {
  const [open, setOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [localMarkup, setLocalMarkup] = useState('');
  const [localSellPrice, setLocalSellPrice] = useState('');
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const costPrice = parseFloat(item.cost_price) || 0;
  const sellPrice = parseFloat(item.unit_price) || 0;
  const defaultMarkupForCost = getMarkupForCost(costPrice);
  const effectiveMarkup = costPrice > 0 && sellPrice > 0
    ? ((sellPrice / costPrice) * 100).toFixed(1)
    : defaultMarkupForCost.toFixed(1);

  // Sync local state when popover opens
  useEffect(() => {
    if (open) {
      setLocalMarkup(effectiveMarkup);
      setLocalSellPrice(sellPrice.toFixed(2));
      setOverrideMode(false);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkupChange = (val) => {
    setLocalMarkup(val);
    const pct = parseFloat(val);
    if (costPrice > 0 && pct > 0) {
      const newPrice = applyMarkupToCost(costPrice, pct);
      setLocalSellPrice(newPrice.toFixed(2));
    }
  };

  const handleSellPriceChange = (val) => {
    setLocalSellPrice(val);
    const price = parseFloat(val);
    if (costPrice > 0 && price > 0) {
      setLocalMarkup(((price / costPrice) * 100).toFixed(1));
    }
  };

  const handleApply = () => {
    const newPrice = parseFloat(localSellPrice) || sellPrice;
    onChange({ ...item, unit_price: newPrice });
    setOpen(false);
  };

  // Position the popover below the button
  const getPopoverStyle = () => {
    if (!btnRef.current) return {};
    const rect = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 228));
    const openUp = window.innerHeight - rect.bottom < 240;
    return {
      position: 'fixed',
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      left,
      zIndex: 9999,
      minWidth: 220,
    };
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition-colors w-full min-w-[72px]"
      >
        <span className="flex-1 text-left">${sellPrice > 0 ? sellPrice.toFixed(2) : '0.00'}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={getPopoverStyle()}
          className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 space-y-2.5"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pricing Details</p>

          {/* Cost */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0">Cost (API)</span>
            <span className="text-xs font-medium text-slate-700">
              {costPrice > 0 ? `$${costPrice.toFixed(2)}` : <span className="text-slate-300">—</span>}
            </span>
          </div>

          {/* Markup */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0">Markup %</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                value={localMarkup}
                onChange={e => handleMarkupChange(e.target.value)}
                className="text-xs h-7 w-20 border-slate-200"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>

          {/* Sale Price */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0">Sale Price</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                value={localSellPrice}
                onChange={e => handleSellPriceChange(e.target.value)}
                className="text-xs h-7 w-20 border-slate-200"
              />
            </div>
          </div>

          <div className="pt-1 border-t flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 font-medium"
            >
              <Check className="w-3 h-3" /> Apply
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 text-xs text-slate-500 hover:text-slate-700 border rounded px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}