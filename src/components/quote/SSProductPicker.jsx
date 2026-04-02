import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, ArrowLeft, ChevronRight, ShoppingBag, Check } from "lucide-react";

// Called with: onSelect({ product_name, color, product_image })
export default function SSProductPicker({ open, onClose, onSelect }) {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [step, setStep] = useState("browse"); // browse | styles | colors | confirm
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      base44.functions.invoke("ssActivewear", { action: "getBrands" }),
      base44.functions.invoke("ssActivewear", { action: "getCategories" }),
    ]).then(([b, c]) => {
      setBrands(b.data.brands || []);
      setCategories(c.data.categories || []);
    });
  }, [open]);

  const browseStyles = useCallback(async (brand, category, search) => {
    setLoading(true);
    setError(null);
    setStyles([]);
    setStep("styles");
    try {
      const res = await base44.functions.invoke("ssActivewear", {
        action: "browseStyles",
        brandName: brand?.name || undefined,
        categoryID: category?.categoryID || undefined,
        search: search || undefined,
      });
      const list = res.data.styles || [];
      setStyles(list);
      if (!list.length) setError("No styles found. Try a different search.");
    } catch {
      setError("Failed to load styles.");
    }
    setLoading(false);
  }, []);

  const loadColors = async (style) => {
    setLoading(true);
    setError(null);
    setProducts([]);
    try {
      const res = await base44.functions.invoke("ssActivewear", {
        styleNumber: style.styleName,
        brandName: style.brandName,
      });
      setProducts(res.data.products || []);
      setStep("colors");
    } catch {
      setError("Failed to load colors.");
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    browseStyles(null, null, searchText.trim());
  };

  const handleSelectColor = (color) => {
    setSelectedColor(color);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedColor) return;
    const frontImage = selectedColor.images?.Front || Object.values(selectedColor.images || {}).find(Boolean) || "";
    onSelect({
      product_name: `${selectedColor.brandName} ${selectedColor.styleName}`,
      color: selectedColor.colorName,
      product_image: frontImage,
    });
    handleReset();
    onClose();
  };

  const goBack = () => {
    if (step === "confirm") { setStep("colors"); setSelectedColor(null); }
    else if (step === "colors") { setStep("styles"); setProducts([]); }
    else if (step === "styles") { setStep("browse"); setStyles([]); setError(null); }
  };

  const handleReset = () => {
    setStep("browse");
    setStyles([]);
    setProducts([]);
    setSelectedColor(null);
    setSearchText("");
    setError(null);
  };

  const stepTitle = {
    browse: "Search S&S Activewear",
    styles: "Select Style",
    colors: products[0] ? `${products[0].brandName} ${products[0].styleName} — Colors` : "Select Color",
    confirm: selectedColor ? `${selectedColor.brandName} ${selectedColor.styleName} · ${selectedColor.colorName}` : "Confirm",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b flex flex-row items-center gap-3 shrink-0">
          {step !== "browse" && (
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ShoppingBag className="w-4 h-4 text-muted-foreground shrink-0" />
            <DialogTitle className="text-base truncate">{stepTitle[step]}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">

          {/* BROWSE */}
          {step === "browse" && (
            <div className="space-y-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder='Style code or name (e.g. "3001" or "Gildan Heavy Cotton")'
                  className="h-9"
                  autoFocus
                />
                <Button type="submit" size="sm" className="h-9 px-4 gap-1.5 shrink-0">
                  <Search className="w-4 h-4" /> Search
                </Button>
              </form>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Brand</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {brands.map((b) => (
                    <button
                      key={b.brandID}
                      onClick={() => browseStyles(b, null, null)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
                    >
                      {b.image && (
                        <img
                          src={`https://www.ssactivewear.com/${b.image.replace('_fm', '_fs')}`}
                          alt={b.name}
                          className="h-5 object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span className="text-xs font-medium truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.categoryID}
                      onClick={() => browseStyles(null, c, c.name)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-accent transition-all"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STYLES */}
          {step === "styles" && (
            <div>
              {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{error}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {styles.map((s) => (
                  <button
                    key={s.styleID}
                    onClick={() => loadColors(s)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-center"
                  >
                    {s.styleImage && (
                      <img
                        src={`https://www.ssactivewear.com/${s.styleImage.replace('_fl', '_fm')}`}
                        alt={s.title}
                        className="w-20 h-20 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <p className="text-xs font-semibold">{s.brandName} {s.styleName}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{s.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* COLORS */}
          {step === "colors" && (
            <div>
              {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading colors...</div>}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{error}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectColor(p)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
                  >
                    {p.colorSwatch ? (
                      <img src={p.colorSwatch} alt={p.colorName} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-border shrink-0" style={{ background: p.color1 || '#ccc' }} />
                    )}
                    <span className="text-xs font-medium">{p.colorName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && selectedColor && (
            <div className="space-y-5">
              <div className="flex gap-5 flex-wrap">
                {Object.entries(selectedColor.images || {}).filter(([, url]) => url).map(([view, url]) => (
                  <div key={view} className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">{view}</p>
                    <img src={url} alt={view} className="w-28 h-28 object-contain border border-border rounded-xl bg-white" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                ))}
              </div>

              <div className="bg-muted rounded-xl p-4 space-y-1">
                <p className="font-semibold">{selectedColor.brandName} {selectedColor.styleName}</p>
                <p className="text-sm text-muted-foreground">Color: {selectedColor.colorName}</p>
              </div>

              <Button onClick={handleConfirm} className="w-full gap-2" size="lg">
                <Check className="w-4 h-4" /> Add to Quote Line Item
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}