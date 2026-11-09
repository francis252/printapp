import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Package, Loader2, ChevronRight, Import, Check, X } from 'lucide-react';
import PageHeader from '@/components/qm/PageHeader';
import { toast } from 'sonner';

export default function SSBrowse() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [styles, setStyles] = useState([]);
  const [searched, setSearched] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [styleDetail, setStyleDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedIds, setImportedIds] = useState(new Set());
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) return;
    setSearching(true);
    setStyles([]);
    setSearched(false);
    try {
      const res = await base44.functions.invoke('ssBrowse', { query: q.trim() });
      setStyles(res.data.styles || []);
    } catch (e) {
      toast.error('S&S search failed. Check API credentials.');
    }
    setSearching(false);
    setSearched(true);
  };

  const handleSearchChange = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 600);
    }
  };

  const openDetail = async (style) => {
    setSelectedStyle(style);
    setStyleDetail(null);
    setLoadingDetail(true);
    try {
      const res = await base44.functions.invoke('ssGetStyle', { styleID: style.styleID });
      setStyleDetail(res.data);
    } catch (e) {
      toast.error('Failed to load product details.');
    }
    setLoadingDetail(false);
  };

  const importProduct = async () => {
    if (!styleDetail) return;
    setImporting(true);
    const { product, colors } = styleDetail;
    const colorNames = colors.map(c => c.colorName).filter(Boolean);
    const firstImage = colors[0]?.frontImage || '';
    try {
      await base44.entities.Product.create({
        name: product.title,
        style_number: product.styleName || product.partNumber,
        supplier_name: product.brandName || 'S&S Activewear',
        description: product.description || '',
        base_price: product.lowestPrice || 0,
        colors: colorNames,
        sizes: product.sizes || [],
        image_url: firstImage,
        keywords: `${product.brandName} ${product.styleName} ${product.title}`.toLowerCase(),
      });
      setImportedIds(prev => new Set([...prev, selectedStyle.styleID]));
      toast.success(`"${product.title}" imported to catalog!`);
      setSelectedStyle(null);
    } catch (e) {
      toast.error('Import failed.');
    }
    setImporting(false);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="S&S Activewear — Browse & Import"
        subtitle="Search live S&S inventory and import products into your catalog"
      />

      {/* Search bar */}
      <div className="relative max-w-lg mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          autoFocus
          placeholder="Search by style number, brand, or product name (e.g. Gildan, PC61, G2000)..."
          value={query}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          className="pl-9 pr-12 text-sm"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>

      {/* Results */}
      {!searched && !searching && (
        <div className="py-16 text-center text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Type a style number or brand name to search S&S Activewear live inventory</p>
        </div>
      )}

      {searched && styles.length === 0 && !searching && (
        <div className="py-16 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No products found for "{query}"</p>
        </div>
      )}

      {styles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {styles.map(s => {
            const isImported = importedIds.has(s.styleID);
            return (
              <div
                key={s.styleID}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                onClick={() => !isImported && openDetail(s)}
              >
                <div className="h-40 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                  {s.image ? (
                    <img src={s.image} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <Package className="w-12 h-12 text-slate-200" />
                  )}
                  {isImported && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <div className="bg-green-500 text-white rounded-full p-2">
                        <Check className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-mono text-slate-400">{s.styleName}</p>
                  <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.brandName}</p>
                  {s.basePrice && <p className="text-sm text-blue-600 font-bold mt-1">from ${s.basePrice.toFixed(2)}</p>}
                  <div className="mt-2">
                    {isImported ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> In Catalog</span>
                    ) : (
                      <span className="text-xs text-primary flex items-center gap-1 group-hover:underline">View & Import <ChevronRight className="w-3 h-3" /></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selectedStyle} onOpenChange={() => setSelectedStyle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedStyle?.title || 'Product Details'}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : styleDetail ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex gap-4">
                {/* First color image */}
                <div className="w-32 h-32 rounded-lg border bg-slate-50 overflow-hidden flex-shrink-0">
                  {styleDetail.colors?.[0]?.frontImage ? (
                    <img src={styleDetail.colors[0].frontImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-slate-200 m-auto mt-10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-mono mb-1">{styleDetail.product?.styleName} · {styleDetail.product?.brandName}</p>
                  <p className="text-base font-bold text-slate-800">{styleDetail.product?.title}</p>
                  {styleDetail.product?.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-3">{styleDetail.product.description}</p>
                  )}
                  {styleDetail.product?.lowestPrice && (
                    <p className="text-lg font-bold text-blue-600 mt-2">from ${styleDetail.product.lowestPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Sizes */}
              {styleDetail.product?.sizes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Available Sizes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {styleDetail.product.sizes.map(sz => (
                      <span key={sz} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border">{sz}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {styleDetail.colors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Colors ({styleDetail.colors.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                    {styleDetail.colors.map(c => (
                      <div key={c.colorName} className="flex flex-col items-center gap-1 p-2 border rounded-lg bg-slate-50">
                        <div className="w-12 h-12 rounded overflow-hidden border bg-white">
                          {c.frontImage ? (
                            <img src={c.frontImage} alt={c.colorName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-200" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 text-center leading-tight">{c.colorName}</p>
                        {c.customerPrice && <p className="text-xs text-blue-500 font-medium">${c.customerPrice.toFixed(2)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-2 pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setSelectedStyle(null)} className="flex-1">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={importProduct}
              disabled={importing || !styleDetail}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Import className="w-4 h-4 mr-1" />}
              {importing ? 'Importing...' : 'Import to My Catalog'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}