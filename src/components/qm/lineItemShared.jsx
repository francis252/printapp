import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Loader2, Zap, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export const DECO_METHODS = ['Embroidery', 'DTF Printing', 'Screen Printing', 'Heat Transfer', 'Sublimation', 'Laser Engraving', 'Other'];

// Read pricing settings from localStorage
const getMarkupSettings = () => {
  const markup = parseFloat(localStorage.getItem('qm_markup') || '125');
  const roundUp = localStorage.getItem('qm_roundup') === 'true';
  let tiers = [];
  try { tiers = JSON.parse(localStorage.getItem('qm_markup_tiers') || '[]'); } catch {}
  return { markup, roundUp, tiers };
};

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

export const applyMarkup = (cost) => {
  if (!cost || cost <= 0) return 0;
  const { roundUp } = getMarkupSettings();
  const markupPct = getMarkupForCost(cost);
  const raw = cost * (markupPct / 100);
  return roundUp ? Math.ceil(raw) : parseFloat(raw.toFixed(2));
};

// Recalculate derived fields (qty, discounted price, line total) on an item
export const recalcItem = (updated) => {
  const qty = (updated.sizes || []).reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
  updated.total_quantity = qty;
  const discountFactor = 1 - ((parseFloat(updated.discount_percent) || 0) / 100);
  updated.discounted_unit_price = (parseFloat(updated.unit_price) || 0) * discountFactor;
  updated.line_total = qty * updated.discounted_unit_price;
  return updated;
};

export const totalQtyOf = (item) => (item.sizes || []).reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);

export const discountedPriceOf = (item) =>
  (parseFloat(item.unit_price) || 0) * (1 - ((parseFloat(item.discount_percent) || 0) / 100));

export const sizeSummaryOf = (item) => {
  if (!item.sizes || item.sizes.length === 0) return 'N/A';
  if (item.sizes.length === 1 && (item.sizes[0].size === 'ONE SIZE')) {
    return `ONE SIZE x ${item.sizes[0].quantity}`;
  }
  return item.sizes.map(s => `${s.size} x ${s.quantity}`).join(', ');
};

export const fetchSSColors = async (styleNumber) => {
  try {
    const res = await base44.functions.invoke('ssProductSearch', { style_number: styleNumber });
    return res.data?.colors || [];
  } catch { return []; }
};

// Product search input with catalog + live S&S dropdown (mobile-aware portal)
export function ProductSearchField({ item, onChange, placeholder = 'Select product...', className = 'text-xs h-7 border-slate-200' }) {
  const [search, setSearch] = useState(item.product_name || '');
  const [open, setOpen] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [catalogResults, setCatalogResults] = useState([]);
  const [ssResults, setSsResults] = useState([]);
  const [ssLoading, setSsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    base44.entities.Product.list('-created_date', 300).then(setLocalProducts);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setCatalogResults([]); setSsResults([]); return; }
    const q = val.toLowerCase();
    setCatalogResults(localProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.style_number?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      p.keywords?.toLowerCase().includes(q)
    ).slice(0, 5));
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setSsLoading(true);
        try {
          const res = await base44.functions.invoke('ssBrowse', { query: val.trim() });
          setSsResults((res.data.styles || []).slice(0, 6));
        } catch { setSsResults([]); }
        setSsLoading(false);
      }, 500);
    } else {
      setSsResults([]);
    }
  };

  const selectLocalProduct = async (product) => {
    const cost = product.cost_price || product.base_price || 0;
    const colors = product.style_number ? await fetchSSColors(product.style_number) : [];
    const updated = {
      ...item,
      product_id: product.id,
      product_name: product.name,
      style_number: product.style_number || '',
      supplier_name: product.supplier_name || '',
      cost_price: cost,
      unit_price: applyMarkup(cost) || product.base_price || 0,
      description: product.description || '',
      product_image_url: product.image_url || '',
      color: '',
      _ssColors: colors,
    };
    onChange(recalcItem(updated));
    setSearch(product.name);
    setOpen(false);
  };

  const selectSSProduct = async (ssStyle) => {
    setOpen(false);
    setSearch(ssStyle.title);
    setSsLoading(true);
    try {
      const res = await base44.functions.invoke('ssGetStyle', { styleID: ssStyle.styleID });
      const { product, colors } = res.data;
      const cost = product.lowestPrice || 0;
      const updated = {
        ...item,
        product_id: null,
        product_name: product.title,
        style_number: product.styleName || product.partNumber,
        supplier_name: product.brandName || 'S&S Activewear',
        cost_price: cost,
        unit_price: applyMarkup(cost) || cost,
        description: product.description || '',
        product_image_url: colors[0]?.frontImage || '',
        color: '',
        _ssColors: colors,
      };
      onChange(recalcItem(updated));
    } catch {
      toast.error('Failed to load S&S product details.');
    }
    setSsLoading(false);
  };

  const renderDropdown = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = Math.min(Math.max(288, rect.width), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(224, 8 + (catalogResults.length + ssResults.length + 1) * 40);
    const openUp = spaceBelow < dropdownHeight;
    const style = {
      position: 'fixed', left, width, zIndex: 9999, maxHeight: 224, overflowY: 'auto',
      ...(openUp ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
    };
    return createPortal(
      <div style={style} className="bg-white border rounded-md shadow-xl overflow-y-auto">
        {catalogResults.map(p => (
          <button key={p.id} onMouseDown={() => selectLocalProduct(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
              {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" alt="" /> : <Package className="w-3 h-3 text-slate-300 m-auto" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{p.name} - {p.supplier_name}</p>
              <p className="text-xs text-slate-400">{p.style_number}</p>
            </div>
          </button>
        ))}
        {ssResults.length > 0 && (
          <div className="px-3 py-1 bg-blue-50 border-b flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-blue-600 font-semibold">S&S Activewear — Live</span>
          </div>
        )}
        {ssResults.map(s => (
          <button key={s.styleID} onMouseDown={() => selectSSProduct(s)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
              {s.image ? <img src={s.image} className="w-full h-full object-cover" alt="" /> : <Package className="w-3 h-3 text-slate-300 m-auto" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">{s.title}</p>
              <p className="text-xs text-slate-400">{s.styleName} · {s.brandName}</p>
            </div>
            <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
          </button>
        ))}
        {ssLoading && (
          <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Searching S&S...
          </div>
        )}
        {catalogResults.length === 0 && ssResults.length === 0 && !ssLoading && search.length > 0 && (
          <div className="px-3 py-2 text-xs text-slate-400">No products found</div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={search}
        onChange={e => handleSearchChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {open && renderDropdown()}
    </div>
  );
}