import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const POPULAR_SKUS = ["SG001", "SG002", "SG003", "SG004"];

export default function SageProductBrowser({ onSelectImage }) {
  const [searchInput, setSearchInput] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [step, setStep] = useState("search"); // "search" | "colors"

  const handleSearch = async (skuList) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("sageProducts", {
        skus: skuList,
      });
      if (res.data.products?.length > 0) {
        setProducts(res.data.products);
        setSearched(true);
      } else {
        toast.error("No products found");
        setProducts([]);
      }
    } catch (err) {
      toast.error("Failed to load products");
    }
    setLoading(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const skus = searchInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (skus.length === 0) {
      toast.error("Enter at least one SKU");
      return;
    }
    handleSearch(skus);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setStep("colors");
  };

  const handleSelectColor = (color) => {
    if (onSelectImage) {
      onSelectImage(color.images.Front, `${selectedProduct.name} - ${color.colorName}`);
    }
  };

  const handleBack = () => {
    setStep("search");
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6">
      {step === "search" && (
        <>
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter SKU(s) (comma-separated)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </form>

          {/* Popular SKUs */}
          {!searched && !loading && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Or try popular items:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POPULAR_SKUS.map((sku) => (
                  <button
                    key={sku}
                    onClick={() => {
                      setSearchInput(sku);
                      handleSearch([sku]);
                    }}
                    className="px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all text-xs font-medium"
                  >
                    {sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Products Grid */}
          {!loading && searched && products.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Results ({products.length}):</p>
              <div className="grid grid-cols-1 gap-3">
                {products.map((product) => (
                  <button
                    key={product.sku}
                    onClick={() => handleSelectProduct(product)}
                    className="flex gap-4 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-left group"
                  >
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-20 h-20 object-contain rounded-lg border border-border bg-white"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{product.sku}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.name}</p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {product.inventory.available > 0 ? (
                          <span className="text-green-600">In stock: {product.inventory.available}</span>
                        ) : (
                          <span className="text-destructive">Out of stock</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searched && products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No products found. Try different SKUs.</p>
            </div>
          )}
        </>
      )}

      {step === "colors" && selectedProduct && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Button>
          <p className="text-sm font-medium mb-3">{selectedProduct.sku} — {selectedProduct.name} — Choose Color:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedProduct.colors.map((color, i) => (
              <button
                key={i}
                onClick={() => handleSelectColor(color)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
              >
                {color.colorSwatch ? (
                  <img src={color.colorSwatch} alt={color.colorName} className="w-8 h-8 rounded-full object-cover border border-border" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-border" style={{ background: color.colorCode || '#ccc' }} />
                )}
                <span className="text-xs font-medium">{color.colorName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}