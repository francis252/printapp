import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

export default function SSProductBrowser({ onSelectImage = null }) {
  const [brands, setBrands] = useState([]);
  const [styles, setStyles] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [step, setStep] = useState("brands"); // "brands" | "styles" | "colors" | "views"
  const [loading, setLoading] = useState(true);

  // Load brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await base44.functions.invoke("ssActivewear", {
          action: "getBrands",
        });
        if (res.data.brands?.length > 0) {
          setBrands(res.data.brands);
        }
      } catch (err) {
        console.error("Failed to load brands");
      }
      setLoading(false);
    };
    loadBrands();
  }, []);

  const handleBrandClick = async (brand) => {
    setLoading(true);
    try {
      const stylesRes = await base44.functions.invoke("ssActivewear", {
        action: "browseStyles",
        brandName: brand.name || brand,
      });
      if (stylesRes.data.styles?.length > 0) {
        setStyles(stylesRes.data.styles);
        setSelectedBrand(brand);
        setStep("styles");
      } else {
        toast.error("No styles found for this brand");
      }
    } catch (err) {
      toast.error("Failed to load styles");
    }
    setLoading(false);
  };

  const handleStyleClick = async (style) => {
    setLoading(true);
    try {
      const productRes = await base44.functions.invoke("ssActivewear", {
        styleNumber: style.styleName,
        brandName: style.brandName,
      });
      if (productRes.data.products) {
        setProducts(productRes.data.products);
        setSelectedStyle(style);
        setStep("colors");
      } else {
        toast.error("No products found for this style");
      }
    } catch (err) {
      toast.error("Failed to load products");
    }
    setLoading(false);
  };

  const handleColorClick = (color) => {
    setSelectedColor(color);
    setStep("views");
  };

  const handleBack = () => {
    if (step === "views") {
      setStep("colors");
      setSelectedColor(null);
      setSelectedView(null);
    } else if (step === "colors") {
      setStep("styles");
      setProducts([]);
      setSelectedStyle(null);
    } else if (step === "styles") {
      setStep("brands");
      setStyles([]);
      setSelectedBrand(null);
    }
  };

  const brandName = selectedBrand?.name || selectedBrand;

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* STEP: BRANDS */}
      {step === "brands" && !loading && (
        <div>
          <p className="text-sm font-medium mb-3">Select a brand:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {brands.map((brand) => {
              const name = brand.name || brand;
              return (
                <button
                  key={name}
                  onClick={() => handleBrandClick(brand)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
                >
                  {brand.image && (
                    <img
                      src={`https://www.ssactivewear.com/${brand.image.replace('_fm', '_fs')}`}
                      alt={name}
                      className="h-5 object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="text-xs font-medium truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: STYLES */}
      {step === "styles" && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Brands
          </Button>
          <p className="text-sm font-medium mb-3">{brandName} Styles:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {styles.map((style) => (
              <button
                key={style.styleID}
                onClick={() => handleStyleClick(style)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-center"
              >
                {style.styleImage && (
                  <img
                    src={`https://www.ssactivewear.com/${style.styleImage.replace('_fl', '_fm')}`}
                    alt={style.title}
                    className="w-20 h-20 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div>
                  <p className="text-xs font-semibold">{style.brandName} {style.styleName}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{style.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: COLORS */}
      {step === "colors" && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Styles
          </Button>
          <p className="text-sm font-medium mb-3">{selectedStyle?.brandName} {selectedStyle?.styleName} — Choose Color:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p, i) => (
              <button
                key={i}
                onClick={() => handleColorClick(p)}
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
      {step === "views" && selectedColor && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Colors
          </Button>
          <p className="text-sm font-medium mb-3">{selectedColor.colorName} — Available Views:</p>
          <div className="space-y-2">
            {VIEWS.map((view) => {
              const url = selectedColor.images?.[view];
              if (!url) return null;
              return (
                <button
                    key={view}
                    onClick={() => {
                      if (onSelectImage) onSelectImage(url);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all group"
                  >
                    <img src={url} alt={view} className="w-14 h-14 object-contain rounded-lg border border-border bg-white" onError={(e) => { e.target.style.display='none'; }} />
                    <span className="text-sm font-medium flex-1 text-left">{view}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}