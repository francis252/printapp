import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function JdsProductBrowser({ onSelectImage = null }) {
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [step, setStep] = useState("brands"); // "brands" | "products" | "colors"
  const [loading, setLoading] = useState(true);

  // Load brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await base44.entities.CustomProduct.list();
        const uniqueBrands = [...new Set(res.map(p => p.brand))].filter(Boolean).sort();
        setBrands(uniqueBrands);
      } catch (err) {
        console.error("Failed to load brands:", err);
        toast.error("Failed to load JDS brands");
      }
      setLoading(false);
    };
    loadBrands();
  }, []);

  const handleBrandClick = async (brand) => {
    setLoading(true);
    try {
      const res = await base44.entities.CustomProduct.filter({ brand });
      if (res?.length > 0) {
        setProducts(res);
        setSelectedBrand(brand);
        setStep("products");
      } else {
        toast.error("No products found for this brand");
      }
    } catch (err) {
      toast.error("Failed to load products");
    }
    setLoading(false);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setStep("colors");
  };

  const handleColorClick = (color) => {
    setSelectedColor(color);
    setStep("views");
  };

  const handleBack = () => {
    if (step === "colors") {
      setStep("products");
      setSelectedProduct(null);
      setSelectedColor(null);
    } else if (step === "products") {
      setStep("brands");
      setProducts([]);
      setSelectedBrand(null);
    }
  };

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => handleBrandClick(brand)}
                className="flex items-center justify-center p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-center font-medium text-sm"
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: PRODUCTS */}
      {step === "products" && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Brands
          </Button>
          <p className="text-sm font-medium mb-3">{selectedBrand} — Products:</p>
          <div className="grid grid-cols-1 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="flex gap-4 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-left group"
              >
                {product.images?.Front && (
                  <img
                    src={product.images.Front}
                    alt={product.name}
                    className="w-20 h-20 object-contain rounded-lg border border-border bg-white"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.brand}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {product.color_swatches?.length > 0 && (
                      <span className="text-green-600">{product.color_swatches.length} colors available</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: COLORS */}
      {step === "colors" && selectedProduct && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Button>
          <div className="flex gap-4 mb-6">
            {selectedProduct.images?.Front && (
              <img
                src={selectedProduct.images.Front}
                alt={selectedProduct.name}
                className="w-24 h-24 object-contain rounded-lg border border-border bg-white"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div>
              <p className="text-sm font-semibold">{selectedProduct.name}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{selectedProduct.brand}</p>
            </div>
          </div>
          <p className="text-sm font-medium mb-4">Available Colors:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {selectedProduct.color_swatches?.map((color, i) => (
              <button
                key={i}
                onClick={() => {
                  if (onSelectImage) onSelectImage(color.swatch_url || selectedProduct.images?.Front, `${selectedProduct.name} - ${color.color_name}`);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
              >
                {color.swatch_url ? (
                  <img src={color.swatch_url} alt={color.color_name} className="w-12 h-12 rounded-lg object-cover border border-border" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg border-2 border-border" style={{ background: color.color_code || '#ccc' }} />
                )}
                <span className="text-xs font-medium text-center line-clamp-2">{color.color_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}