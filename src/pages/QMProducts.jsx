import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Package, Loader2, Zap, Settings2 } from 'lucide-react';
import PageHeader from '@/components/qm/PageHeader';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/qm/ProductDetailModal';

const emptyProduct = { name: '', style_number: '', supplier_name: '', category: '', description: '', image_url: '', colors: '', sizes: '', base_price: '', keywords: '' };

function MarkupSettingsPanel({ globalMarkup, roundUp, onSave }) {
  const [markup, setMarkup] = useState(globalMarkup);
  const [ru, setRu] = useState(roundUp);
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-4">
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default Markup %</label>
        <div className="flex items-center gap-1 mt-1">
          <Input type="number" step="1" value={markup} onChange={e => setMarkup(parseFloat(e.target.value) || 0)} className="w-24 text-sm" />
          <span className="text-sm text-slate-500">%</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Round Up to Nearest $1</label>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setRu(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ru ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ru ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-slate-600">{ru ? 'On' : 'Off'}</span>
        </div>
      </div>
      <div className="text-xs text-slate-400">
        Example: cost $6 × {markup}% = <strong>${ru ? Math.ceil(6 * markup / 100) : (6 * markup / 100).toFixed(2)}</strong>
      </div>
      <Button onClick={() => onSave(markup, ru)} className="bg-blue-600 hover:bg-blue-700 text-white">Save Settings</Button>
    </div>
  );
}

export default function QMProducts() {
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [ssProducts, setSsProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ssLoading, setSsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('All');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const debounceRef = useRef(null);

  // Global markup settings (persisted in localStorage)
  const [globalMarkup, setGlobalMarkup] = useState(() => parseFloat(localStorage.getItem('qm_markup') || '125'));
  const [roundUp, setRoundUp] = useState(() => localStorage.getItem('qm_roundup') === 'true');
  const [showMarkupSettings, setShowMarkupSettings] = useState(false);

  const saveMarkupSettings = (markup, ru) => {
    localStorage.setItem('qm_markup', String(markup));
    localStorage.setItem('qm_roundup', String(ru));
    setGlobalMarkup(markup);
    setRoundUp(ru);
    toast.success('Markup settings saved!');
  };

  const loadCatalog = () =>
    base44.entities.Product.list('-created_date', 300).then(p => {
      setCatalogProducts(p);
      setLoading(false);
    });

  useEffect(() => {
    loadCatalog();
    const params = new URLSearchParams(window.location.search);
    const sup = params.get('supplier');
    if (sup) setSelectedSupplier(sup);
  }, []);

  // Live S&S search when user types
  const searchSS = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSsProducts([]); return; }
    setSsLoading(true);
    try {
      const res = await base44.functions.invoke('ssBrowse', { query: q.trim() });
      setSsProducts((res.data.styles || []).map(s => ({
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
    } catch {
      setSsProducts([]);
    }
    setSsLoading(false);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSS(val), 500);
  };

  // Filter catalog products
  const filteredCatalog = catalogProducts.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.style_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchSupplier = selectedSupplier === 'All' || p.supplier_name === selectedSupplier;
    return matchSearch && matchSupplier;
  });

  // Filter SS products (only show when searching, or when SS supplier is selected)
  const showSS = search.trim().length >= 2 || selectedSupplier === 'S&S Activewear';
  const filteredSS = showSS
    ? ssProducts.filter(p => selectedSupplier === 'All' || selectedSupplier === 'S&S Activewear' || p.supplier_name === selectedSupplier)
    : [];

  const allProducts = [...filteredCatalog, ...filteredSS];

  // Supplier sidebar: catalog suppliers + S&S as live option
  const catalogSupplierNames = [...new Set(catalogProducts.map(p => p.supplier_name).filter(Boolean))].sort();

  const save = async () => {
    if (!form.name || !form.style_number) { toast.error('Name and style # required'); return; }
    setSaving(true);
    const data = {
      ...form,
      base_price: parseFloat(form.base_price) || 0,
      colors: form.colors ? form.colors.split(',').map(c => c.trim()) : [],
      sizes: form.sizes ? form.sizes.split(',').map(s => s.trim()) : [],
    };
    await base44.entities.Product.create(data);
    toast.success('Product added!');
    setShowDialog(false);
    setForm(emptyProduct);
    loadCatalog();
    setSaving(false);
  };

  const totalCount = allProducts.length;

  return (
    <div className="p-6">
      <PageHeader
        title="Products"
        subtitle={`${totalCount} products${ssLoading ? ' · searching S&S...' : ssProducts.length > 0 ? ` (${filteredSS.length} live from S&S)` : ''}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMarkupSettings(v => !v)} className="gap-2">
              <Settings2 className="w-4 h-4" /> Markup Settings
            </Button>
            <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </div>
        }
      />

      {/* Markup settings panel */}
      {showMarkupSettings && (
        <MarkupSettingsPanel
          globalMarkup={globalMarkup}
          roundUp={roundUp}
          onSave={saveMarkupSettings}
        />
      )}

      <div className="flex gap-5">
        {/* Supplier sidebar filter */}
        <div className="w-44 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Supplier</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedSupplier('All')}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedSupplier === 'All' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All Suppliers
              <span className="ml-1 text-xs opacity-60">({catalogProducts.length}+)</span>
            </button>
            {catalogSupplierNames.map(name => {
              const count = catalogProducts.filter(p => p.supplier_name === name).length;
              return (
                <button
                  key={name}
                  onClick={() => { setSelectedSupplier(name); setSearch(''); setSsProducts([]); }}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedSupplier === name ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="truncate block">{name}</span>
                  <span className="text-xs opacity-60">({count})</span>
                </button>
              );
            })}
            {/* S&S as a live source */}
            <button
              onClick={() => { setSelectedSupplier('S&S Activewear'); setSearch(''); }}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1 ${selectedSupplier === 'S&S Activewear' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Zap className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">S&S Activewear</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={selectedSupplier === 'S&S Activewear' ? 'Search S&S live (e.g. Gildan, PC61)...' : 'Search products or search S&S live...'}
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 text-sm"
            />
            {ssLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
          </div>

          {selectedSupplier === 'S&S Activewear' && !search && (
            <div className="py-12 text-center text-slate-400">
              <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Type a style number or brand to search live S&S inventory</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-4 py-12 text-center text-slate-400">Loading...</div>
            ) : allProducts.length === 0 && search.trim().length < 2 ? (
              <div className="col-span-4 py-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No products found.</p>
              </div>
            ) : (
              allProducts.map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow relative cursor-pointer">
                  {p._source === 'ss' && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> S&S
                      </span>
                    </div>
                  )}
                  <div className="h-36 bg-slate-100 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="w-10 h-10 text-slate-200" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-mono text-slate-400">{p.style_number}</p>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.supplier_name}</p>
                    {p.cost_price > 0 ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400">Cost: ${Number(p.cost_price).toFixed(2)}</span>
                        <span className="text-sm text-blue-600 font-bold">
                          → ${roundUp
                            ? Math.ceil(p.cost_price * ((p.markup_percent || globalMarkup) / 100))
                            : (p.cost_price * ((p.markup_percent || globalMarkup) / 100)).toFixed(2)}
                        </span>
                      </div>
                    ) : p.base_price > 0 ? (
                      <p className="text-sm text-blue-600 font-bold mt-1">${Number(p.base_price).toFixed(2)}</p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSaved={(updated) => {
          setCatalogProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
          setSelectedProduct(null);
        }}
        globalMarkup={globalMarkup}
        roundUp={roundUp}
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { key: 'name', label: 'Product Name *', placeholder: "Women's Quarter-Zip Pullover", span: 2 },
              { key: 'style_number', label: 'Style Number *', placeholder: 'EXP15WPQ' },
              { key: 'supplier_name', label: 'Supplier', placeholder: 'S&S Activewear' },
              { key: 'category', label: 'Category', placeholder: 'Tops, T-Shirts...' },
              { key: 'base_price', label: 'Base Price', placeholder: '12.50', type: 'number' },
              { key: 'colors', label: 'Colors (comma separated)', placeholder: 'Smoke, Black, White', span: 2 },
              { key: 'sizes', label: 'Sizes (comma separated)', placeholder: 'XS, S, M, L, XL, 2XL', span: 2 },
              { key: 'image_url', label: 'Image URL', placeholder: 'https://...', span: 2 },
              { key: 'keywords', label: 'Search Keywords', placeholder: 'pullover fleece womens zip', span: 2 },
            ].map(({ key, label, placeholder, type, span }) => (
              <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                <label className="text-xs font-semibold text-slate-400">{label}</label>
                <Input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="mt-1 text-sm" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." className="mt-1 w-full border rounded-md px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Saving...' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}