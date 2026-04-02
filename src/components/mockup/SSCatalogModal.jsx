import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, ChevronRight, X, ArrowLeft } from "lucide-react";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

export default function SSCatalogModal({ open, onClose, onSelectImage }) {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedViews, setSelectedViews] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [step, setStep] = useState("browse"); // "browse" | "styles" | "colors" | "views"

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load brands & categories on open
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [b, c] = await Promise.all([
        base44.functions.invoke("ssActivewear", { action: "getBrands" }),
        base44.functions.invoke("ssActivewear", { action: "getCategories" }),
      ]);
      setBrands(b.data.brands || []);
      setCategories(c.data.categories || []);
    };
    load();
  }, [open]);

  const handleBrowse = useCallback(async (brand, category, search) => {
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
      setStyles(res.data.styles || []);
      if (!res.data.styles?.length) setError("No styles found.");
    } catch {
      setError("Failed to load styles.");
    }
    setLoading(false);
  }, []);

  const handleSelectStyle = async (style) => {
    setLoading(true);
    setError(null);
    setProducts([]);
    setSelectedColor(null);
    try {
      const res = await base44.functions.invoke("ssActivewear", { styleNumber: style.styleName, brandName: style.brandName });
      setProducts(res.data.products || []);
      setStep("colors");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load colors.");
    }
    setLoading(false);
  };

  const handleSelectColor = (color) => {
    setSelectedColor(color);
    setSelectedViews([]);
    setStep("views");
  };

  const handleSelectView = (view) => {
    setSelectedViews((prev) =>
      prev.includes(view) ? prev.filter((v) => v !== view) : [...prev, view]
    );
  };

  const handleConfirmViews = () => {
    selectedViews.forEach((view) => {
      const url = selectedColor.images?.[view];
      if (url) onSelectImage(view, url);
    });
    onClose();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    setSelectedBrand(null);
    setSelectedCategory(null);
    handleBrowse(null, null, searchText.trim());
  };

  const goBack = () => {
    if (step === "views") { setStep("colors"); setSelectedColor(null); setSelectedViews([]); }
    else if (step === "colors") { setStep("styles"); setProducts([]); }
    else if (step === "styles") { setStep("browse"); setStyles([]); setError(null); }
  };

  const reset = () => {
    setStep("browse");
    setStyles([]);
    setProducts([]);
    setSelectedColor(null);
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSearchText("");
    setError(null);
    setSelectedViews([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b flex flex-row items-center gap-3 shrink-0">
          {step !== "browse" && (
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <DialogTitle className="flex-1 text-base">
            {step === "browse" && "S&S Activewear Catalog"}
            {step === "styles" && `${selectedBrand?.name || searchText || "Styles"}`}
            {step === "colors" && `${products[0]?.brandName} ${products[0]?.styleName} — Choose Color`}
            {step === "views" && `${selectedColor?.colorName} — Choose View`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP: BROWSE */}
          {step === "browse" && (
            <div className="space-y-5">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder='Search style (e.g. "3001" or "Gildan 2000")'
                  className="h-9"
                />
                <Button type="submit" size="sm" className="h-9 px-4 gap-1.5">
                  <Search className="w-4 h-4" /> Search
                </Button>
              </form>

              {/* Brands */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Brand</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {brands.map((b) => (
                    <button
                      key={b.brandID}
                      onClick={() => { setSelectedBrand(b); setSelectedCategory(null); handleBrowse(b, null, null); }}
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

              {/* Categories */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Browse by Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.categoryID}
                      onClick={() => { setSelectedCategory(c); setSelectedBrand(null); handleBrowse(null, c, c.name); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-accent transition-all"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: STYLES */}
          {step === "styles" && (
            <div>
              {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading styles...</div>}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {styles.map((s) => (
                  <button
                    key={s.styleID}
                    onClick={() => handleSelectStyle(s)}
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

          {/* STEP: COLORS */}
          {step === "colors" && (
            <div>
              {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading colors...</div>}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectColor(p)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
                  >
                    {p.colorSwatch ? (
                      <img src={p.colorSwatch} alt={p.colorName} className="w-8 h-8 rounded-full object-cover border border-border" onError={(e) => { e.target.style.display='none'; }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-border" style={{ background: p.color1 || '#ccc' }} />
                    )}
                    <span className="text-xs font-medium">{p.colorName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: VIEWS */}
           {step === "views" && selectedColor && (
             <div className="space-y-4">
               <p className="text-sm text-muted-foreground">Select one or more views to load:</p>
               <div className="space-y-2">
                 {VIEWS.map((view) => {
                   const url = selectedColor.images?.[view];
                   if (!url) return null;
                   const isSelected = selectedViews.includes(view);
                   return (
                     <button
                       key={view}
                       onClick={() => handleSelectView(view)}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                         isSelected
                           ? "border-primary bg-primary/5"
                           : "border-border hover:border-primary/50 hover:bg-accent"
                       }`}
                     >
                       <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                         {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                       </div>
                       <img src={url} alt={view} className="w-14 h-14 object-contain rounded-lg border border-border bg-white" onError={(e) => { e.target.style.display='none'; }} />
                       <span className="text-sm font-medium flex-1 text-left">{view}</span>
                     </button>
                   );
                 })}
               </div>
               <Button
                 onClick={handleConfirmViews}
                 disabled={selectedViews.length === 0}
                 className="w-full"
               >
                 Load {selectedViews.length > 0 ? selectedViews.length : ""} View{selectedViews.length !== 1 ? "s" : ""}
               </Button>
             </div>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}