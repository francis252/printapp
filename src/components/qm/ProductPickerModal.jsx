import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Search, Package, Loader2, Zap, X, ChevronRight, Check } from 'lucide-react';
import DrawerPanel from '@/components/ui/DrawerPanel';

// ── Product card ────────────────────────────────────────────────────────────
function ProductCard({ product, onClick }) {
  const isLive = product._source === 'ss';
  return (
    <button
      onClick={onClick}
      className="bg-white border rounded-xl overflow-hidden hover:border-primary hover:shadow-md transition-all text-left group relative cursor-pointer"
    >
      {isLive && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" /> S&S
          </span>
        </div>
      )}
      <div className="h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
        ) : (
          <Package className="w-10 h-10 text-slate-200" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[10px] font-mono text-slate-400 leading-none mb-0.5">{product.style_number}</p>
        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{product.supplier_name}</p>
        {product.base_price > 0 && (
          <p className="text-xs text-primary font-bold mt-1">${Number(product.base_price).toFixed(2)}</p>
        )}
      </div>
    </button>
  );
}

// ── Product Detail Drawer (inside the picker) ───────────────────────────────
function ProductDetailPane({ product, ssColors, onAdd, onClose }) {
  const [previewColor, setPreviewColor] = useState(ssColors?.[0] || null);
  const [selectedColors, setSelectedColors] = useState([]);

  // Keep previewColor in sync when ssColors load
  useEffect(() => {
    if (ssColors?.length > 0 && !previewColor) setPreviewColor(ssColors[0]);
  }, [ssColors]);

  if (!product) return null;
  const isLive = product._source === 'ss';
  const previewImage = previewColor?.frontImage || product.image_url || null;

  const toggleColor = (c) => {
    setSelectedColors(prev => {
      const exists = prev.find(x => x.colorName === c.colorName);
      return exists ? prev.filter(x => x.colorName !== c.colorName) : [...prev, c];
    });
    setPreviewColor(c);
  };

  const handleAdd = () => {
    if (isLive && selectedColors.length > 0) {
      // Add one line item per selected color
      for (const c of selectedColors) {
        onAdd({
          product_name: product.name || product.title || '',
          style_number: product.style_number || product.styleName || '',
          supplier_name: product.supplier_name || product.brandName || '',
          color: c.colorName || '',
          product_image_url: c.frontImage || product.image_url || '',
          unit_price: c.customerPrice || product.base_price || 0,
          _ssColors: ssColors || [],
          description: product.description || '',
          item_type: 'catalog',
        });
      }
    } else {
      // Catalog product or no color selected — add single item
      onAdd({
        product_name: product.name || product.title || '',
        style_number: product.style_number || product.styleName || '',
        supplier_name: product.supplier_name || product.brandName || '',
        color: previewColor?.colorName || '',
        product_image_url: previewImage || '',
        unit_price: previewColor?.customerPrice || product.base_price || 0,
        _ssColors: ssColors || [],
        description: product.description || '',
        item_type: 'catalog',
      });
    }
    onClose();
  };

  const addCount = isLive ? (selectedColors.length || 1) : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Image */}
      <div className="h-52 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden border-b">
        {previewImage ? (
          <img src={previewImage} alt={product.name} className="h-full w-full object-contain" />
        ) : (
          <Package className="w-16 h-16 text-slate-200" />
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-[10px] font-mono text-slate-400">{product.style_number || product.styleName}</p>
          <h3 className="text-base font-bold text-slate-800 leading-tight">{product.name || product.title}</h3>
          <p className="text-sm text-slate-400">{product.supplier_name || product.brandName}</p>
        </div>

        {product.description && (
          <p className="text-xs text-slate-500 leading-relaxed">{product.description}</p>
        )}

        {/* S&S color selector — multi-select with checkboxes */}
        {isLive && ssColors?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Colors ({ssColors.length})</p>
              {selectedColors.length > 0 && (
                <span className="text-[10px] text-primary font-medium">{selectedColors.length} selected</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mb-2">Click to preview · Check to add as separate line items</p>
            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pr-1">
              {ssColors.map((c, i) => {
                const isChecked = selectedColors.some(x => x.colorName === c.colorName);
                const isPreviewing = previewColor?.colorName === c.colorName;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${isPreviewing ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => setPreviewColor(c)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColor(c)}
                      onClick={e => e.stopPropagation()}
                      className="rounded flex-shrink-0"
                    />
                    {c.frontImage && (
                      <img src={c.frontImage} alt={c.colorName} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-700 font-medium truncate">{c.colorName}</p>
                      {c.customerPrice > 0 && <p className="text-[10px] text-primary">${c.customerPrice.toFixed(2)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Local product colors */}
        {!isLive && product.colors?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Colors</p>
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(product.colors) ? product.colors : product.colors.split(',')).map((c, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-50 border rounded-full text-slate-600">{typeof c === 'string' ? c.trim() : c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {product.sizes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sizes</p>
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(product.sizes) ? product.sizes : product.sizes.split(',')).map((s, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-slate-50 border rounded-full text-slate-600">{typeof s === 'string' ? s.trim() : s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Add button */}
      <div className="flex-shrink-0 p-4 border-t bg-white">
        <Button onClick={handleAdd} className="w-full">
          <Check className="w-4 h-4 mr-1" />
          {addCount > 1 ? `Add ${addCount} Colors to Quote` : 'Add to Quote'}
        </Button>
        {isLive && selectedColors.length === 0 && ssColors?.length > 0 && (
          <p className="text-[10px] text-slate-400 text-center mt-1.5">Check colors above to add multiple at once</p>
        )}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function ProductPickerModal({ open, onClose, onSelect }) {
  const [tab, setTab] = useState('ss');
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');

  // S&S state
  const [ssResults, setSsResults] = useState([]);
  const [ssLoading, setSsLoading] = useState(false);
  const [ssDetailColors, setSsDetailColors] = useState([]);
  const [ssDetailLoading, setSsDetailLoading] = useState(false);

  // Catalog state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // Detail drawer
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const debounceRef = useRef(null);

  // Load catalog once
  useEffect(() => {
    if (open && tab === 'catalog' && catalogProducts.length === 0) {
      setCatLoading(true);
      Promise.all([
        base44.entities.Product.list('-created_date', 200),
        base44.entities.Supplier.list()
      ]).then(([p, s]) => {
        setCatalogProducts(p || []);
        setSuppliers(s || []);
        setCatLoading(false);
      });
    }
  }, [open, tab]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch('');
      setSupplierFilter('All');
      setSsResults([]);
      setSelectedProduct(null);
      setDetailOpen(false);
    }
  }, [open]);

  const searchSS = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSsResults([]); return; }
    setSsLoading(true);
    try {
      const res = await base44.functions.invoke('ssBrowse', { query: q.trim() });
      setSsResults((res.data.styles || []).map(s => ({
        _source: 'ss',
        id: `ss_${s.styleID}`,
        name: s.title,
        style_number: s.styleName,
        supplier_name: s.brandName,
        base_price: s.basePrice,
        image_url: s.image,
        styleID: s.styleID,
        description: s.description,
      })));
    } catch { setSsResults([]); }
    setSsLoading(false);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (tab === 'ss') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchSS(val), 500);
    }
  };

  const openProductDetail = async (product) => {
    setSelectedProduct(product);
    setSsDetailColors([]);
    setDetailOpen(true);
    if (product._source === 'ss' && product.style_number) {
      setSsDetailLoading(true);
      try {
        const res = await base44.functions.invoke('ssProductSearch', { style_number: product.style_number });
        setSsDetailColors(res.data.colors || []);
      } catch {}
      setSsDetailLoading(false);
    }
  };

  const filteredCatalog = catalogProducts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(q) ||
      p.style_number?.toLowerCase().includes(q) ||
      p.keywords?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q);
    const matchSupplier = supplierFilter === 'All' || p.supplier_name === supplierFilter;
    return matchSearch && matchSupplier;
  });

  const catalogSupplierNames = [...new Set(catalogProducts.map(p => p.supplier_name).filter(Boolean))].sort();
  const displayProducts = tab === 'ss' ? ssResults : filteredCatalog;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
            <button
              onClick={() => { setTab('ss'); setSearch(''); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'ss' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />S&S Activewear</span>
            </button>
            <button
              onClick={() => { setTab('catalog'); setSearch(''); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'catalog' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              My Catalog
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              placeholder={tab === 'ss' ? 'Style # or brand (e.g. Gildan, PC61)...' : 'Search products...'}
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 text-sm"
            />
            {ssLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
          </div>

          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Filter sidebar (catalog only) */}
          {tab === 'catalog' && (
            <div className="w-44 flex-shrink-0 border-r bg-slate-50 overflow-y-auto p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier</p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSupplierFilter('All')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${supplierFilter === 'All' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  All Suppliers
                </button>
                {catalogSupplierNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setSupplierFilter(name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate ${supplierFilter === name ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* S&S empty state */}
            {tab === 'ss' && !ssLoading && ssResults.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-slate-400">
                <div>
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-slate-500">Search S&S Activewear</p>
                  <p className="text-sm mt-1">Type a style number or brand above</p>
                </div>
              </div>
            )}

            {/* Catalog empty/loading */}
            {tab === 'catalog' && catLoading && (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            {tab === 'catalog' && !catLoading && filteredCatalog.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-slate-400">
                <div>
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{catalogProducts.length === 0 ? 'No products in catalog yet.' : 'No products match your search.'}</p>
                </div>
              </div>
            )}

            {displayProducts.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {displayProducts.map(product => (
                  <ProductCard key={product.id} product={product} onClick={() => openProductDetail(product)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product detail drawer (inside the modal) */}
        {detailOpen && selectedProduct && (
          <>
            <div
              className="absolute inset-0 bg-black/20 z-10"
              onClick={() => setDetailOpen(false)}
            />
            <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-20 flex flex-col border-l">
              <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700 truncate">Product Detail</p>
                <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {ssDetailLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ProductDetailPane
                  product={selectedProduct}
                  ssColors={ssDetailColors}
                  onAdd={onSelect}
                  onClose={onClose}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}