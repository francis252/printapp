import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChevronLeft, RefreshCw, AlertCircle } from "lucide-react";

export default function PSRestfulProductBrowser({ onSelectImage }) {
  const [allProducts, setAllProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [step, setStep] = useState("suppliers"); // suppliers | products | detail
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadLocalProducts();
  }, []);

  const loadLocalProducts = async () => {
    setLoading(true);
    const products = await base44.entities.PSRestfulProduct.list("-created_date", 5000);
    setAllProducts(products);

    // Build supplier list from stored data
    const supplierMap = {};
    products.forEach(p => {
      if (p.supplier_code && !supplierMap[p.supplier_code]) {
        supplierMap[p.supplier_code] = p.supplier_name || p.supplier_code;
      }
    });
    setSuppliers(Object.entries(supplierMap).map(([code, name]) => ({ code, name })));
    setLoading(false);
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setSearch("");
    const supplierProducts = allProducts.filter(p => p.supplier_code === supplier.code);
    setFiltered(supplierProducts);
    setStep("products");
  };

  const handleSearch = (val) => {
    setSearch(val);
    const supplierProducts = allProducts.filter(p => p.supplier_code === selectedSupplier?.code);
    if (!val.trim()) {
      setFiltered(supplierProducts);
    } else {
      const q = val.toLowerCase();
      setFiltered(supplierProducts.filter(p =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_id?.toLowerCase().includes(q)
      ));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await base44.functions.invoke("syncPSRestful", {});
    setSyncResult(res.data);
    setSyncing(false);
    await loadLocalProducts();
  };

  const viewSlots = ["Front", "Back", "Left", "Right"];

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.code?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // --- SUPPLIERS ---
  if (step === "suppliers") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{allProducts.length} products cached</span>
          {user?.role === "admin" && (
            <Button
              size="sm" variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="gap-1.5 text-xs h-7"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {syncing ? "Syncing..." : "Sync All"}
            </Button>
          )}
        </div>

        {syncResult && (
          <div className="text-xs p-2 rounded-lg bg-accent text-accent-foreground">
            Synced {syncResult.synced} products ({syncResult.errors} errors)
          </div>
        )}

        {allProducts.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No products cached yet.</p>
            {user?.role === "admin" && (
              <p className="text-xs text-muted-foreground">Click "Sync All" to import products from PSRestful.</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Input
              placeholder="Search suppliers..."
              value={supplierSearch}
              onChange={e => setSupplierSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {filteredSuppliers.map(s => (
                <button
                  key={s.code}
                  onClick={() => handleSelectSupplier(s)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{s.code}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- PRODUCTS ---
  if (step === "products") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep("suppliers")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium truncate">{selectedSupplier?.name}</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <Button size="icon" variant="outline" onClick={() => handleSearch(search)}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedProduct(p); setStep("detail"); }}
              className="rounded-lg border border-border hover:border-primary/60 overflow-hidden text-left transition-all"
            >
              {p.primary_image_url && (
                <img src={p.primary_image_url} alt={p.product_name} className="w-full h-20 object-contain bg-white" />
              )}
              <div className="p-1.5">
                <p className="text-xs font-medium truncate">{p.product_name}</p>
                <p className="text-xs text-muted-foreground">{p.product_id}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">{filtered.length} products</p>
      </div>
    );
  }

  // --- DETAIL ---
  if (step === "detail" && selectedProduct) {
    const images = selectedProduct.media_urls || [];
    const handleAddAll = () => {
      images.slice(0, 4).forEach((img, i) => onSelectImage(viewSlots[i], img.url));
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep("products")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium truncate flex-1">{selectedProduct.product_name}</span>
          {images.length > 1 && (
            <Button size="sm" variant="outline" onClick={handleAddAll} className="text-xs shrink-0">
              Add All Views
            </Button>
          )}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {images.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No images available</p>
          )}
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-3 border border-border rounded-lg p-2">
              <img src={img.url} alt={img.view} className="w-16 h-16 object-contain rounded bg-white shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{img.view}</p>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {viewSlots.map(view => (
                  <button
                    key={view}
                    onClick={() => onSelectImage(view, img.url)}
                    className="text-xs px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium"
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}