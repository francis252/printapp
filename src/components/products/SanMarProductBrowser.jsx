import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

// Full SanMar brand list — alphabetized
const SANMAR_BRANDS = [
  { name: "A4", logo: "https://cdnm.sanmar.com/catalog/images/a4header.jpg" },
  { name: "Alternative Apparel", logo: "https://cdnm.sanmar.com/catalog/images/alternativeheader.jpg" },
  { name: "Allmade", logo: "https://cdnm.sanmar.com/catalog/images/allmadeheader.jpg" },
  { name: "Anvil", logo: "https://cdnm.sanmar.com/catalog/images/anvilheader.jpg" },
  { name: "Bella+Canvas", logo: "https://cdnm.sanmar.com/catalog/images/bellacanvasheader.jpg" },
  { name: "Brooks Brothers", logo: "https://cdnm.sanmar.com/catalog/images/brooksbrosheader.jpg" },
  { name: "Bulwark", logo: "https://cdnm.sanmar.com/catalog/images/bulwarkheader.jpg" },
  { name: "Carhartt", logo: "https://cdnm.sanmar.com/catalog/images/carharttbrandheader.jpg" },
  { name: "Champion", logo: "https://cdnm.sanmar.com/catalog/images/championheader.jpg" },
  { name: "Comfort Colors", logo: "https://cdnm.sanmar.com/catalog/images/comfortcolorsheader.jpg" },
  { name: "CornerStone", logo: "https://cdnm.sanmar.com/catalog/images/cornerstoneheader.jpg" },
  { name: "Cotopaxi", logo: "https://cdnm.sanmar.com/catalog/images/cotopaxiheader.jpg" },
  { name: "District", logo: "https://cdnm.sanmar.com/catalog/images/districtheader.jpg" },
  { name: "Eddie Bauer", logo: "https://cdnm.sanmar.com/catalog/images/eddiebauerbrandheader.jpg" },
  { name: "Gildan", logo: "https://cdnm.sanmar.com/catalog/images/gildanheader.jpg" },
  { name: "Hanes", logo: "https://cdnm.sanmar.com/catalog/images/hanesheader.jpg" },
  { name: "Jerzees", logo: "https://cdnm.sanmar.com/catalog/images/jerzeesbrandheader.jpg" },
  { name: "Mercer+Mettle", logo: "https://cdnm.sanmar.com/catalog/images/mercerheader.jpg" },
  { name: "New Era", logo: "https://cdnm.sanmar.com/catalog/images/neeraheader.jpg" },
  { name: "Next Level", logo: "https://cdnm.sanmar.com/catalog/images/nextlevelheader.jpg" },
  { name: "Nike", logo: "https://cdnm.sanmar.com/catalog/images/nikeheader.jpg" },
  { name: "OGIO", logo: "https://cdnm.sanmar.com/catalog/images/ogioheader.jpg" },
  { name: "Outdoor Research", logo: "https://cdnm.sanmar.com/catalog/images/outdoorresearchheader.jpg" },
  { name: "Port & Co", logo: "https://cdnm.sanmar.com/catalog/images/portandcompanyheader.jpg" },
  { name: "Port Authority", logo: "https://cdnm.sanmar.com/catalog/images/portauthorityheader.jpg" },
  { name: "Precious Cargo", logo: "https://cdnm.sanmar.com/catalog/images/preciouscargo.jpg" },
  { name: "Puma", logo: "https://cdnm.sanmar.com/catalog/images/pumaheader.jpg" },
  { name: "Rabbit Skins", logo: "https://cdnm.sanmar.com/catalog/images/rabbitskinsheader.jpg" },
  { name: "Red House", logo: "https://cdnm.sanmar.com/catalog/images/redhouseheader.jpg" },
  { name: "Red Kap", logo: "https://cdnm.sanmar.com/catalog/images/redkapheader.jpg" },
  { name: "Russell Outdoors", logo: "https://cdnm.sanmar.com/catalog/images/russelloutdoorsheader.jpg" },
  { name: "Spacecraft", logo: "https://cdnm.sanmar.com/catalog/images/spacecraftheader.jpg" },
  { name: "Sport-Tek", logo: "https://cdnm.sanmar.com/catalog/images/sporttekheader.jpg" },
  { name: "Stanley/Stella", logo: "https://cdnm.sanmar.com/catalog/images/stanleystemlaheader.jpg" },
  { name: "tentree", logo: "https://cdnm.sanmar.com/catalog/images/tentreeheader.jpg" },
  { name: "The North Face", logo: "https://cdnm.sanmar.com/catalog/images/northfaceheader.jpg" },
  { name: "Tommy Bahama", logo: "https://cdnm.sanmar.com/catalog/images/tommybahamaheader.jpg" },
  { name: "TravisMathew", logo: "https://cdnm.sanmar.com/catalog/images/travismathewheader.jpg" },
  { name: "Volunteer Knitwear", logo: "https://cdnm.sanmar.com/catalog/images/volunteerknitwearheader.jpg" },
  { name: "Wink", logo: "https://cdnm.sanmar.com/catalog/images/winkheader.jpg" },
];

export default function SanMarProductBrowser({ onSelectImage = null }) {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [styles, setStyles] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [step, setStep] = useState("brands");
  const [loading, setLoading] = useState(false);

  const handleBrandClick = async (brand) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("sanmarProducts", {
        action: "getStylesByBrand",
        brandName: brand.name,
      });
      if (res.data.styles?.length > 0) {
        setStyles(res.data.styles);
        setSelectedBrand(brand);
        setStep("styles");
      } else {
        toast.error("No styles found for this brand");
      }
    } catch {
      toast.error("Failed to load styles");
    }
    setLoading(false);
  };

  const handleStyleClick = async (style) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("sanmarProducts", {
        styleNumber: style.style,
      });
      if (res.data.products?.length > 0) {
        setProducts(res.data.products);
        setSelectedStyle(style);
        setStep("colors");
      } else {
        toast.error("No colors found for this style");
      }
    } catch {
      toast.error("Failed to load colors");
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

  return (
    <div className="space-y-4">
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
            {SANMAR_BRANDS.map((brand) => (
              <button
                key={brand.name}
                onClick={() => handleBrandClick(brand)}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-8 object-contain max-w-full"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="text-xs text-muted-foreground font-medium text-center">{brand.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: STYLES */}
      {step === "styles" && !loading && (
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Brands
          </Button>
          <div className="flex items-center gap-3 mb-4">
            {selectedBrand?.logo && (
              <img src={selectedBrand.logo} alt={selectedBrand.name} className="h-7 object-contain" onError={(e) => { e.target.style.display='none'; }} />
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {styles.map((style) => (
              <button
                key={style.style}
                onClick={() => handleStyleClick(style)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
              >
                {style.image ? (
                  <img
                    src={style.image}
                    alt={style.style}
                    className="w-20 h-20 object-contain rounded-lg border border-border bg-white"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-border bg-muted" />
                )}
                <div className="text-center">
                  <p className="text-xs font-semibold">{style.style}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{style.productTitle?.replace(/\s*\.\s*\S+$/, '')}</p>
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
          <p className="text-sm font-medium mb-3">{selectedStyle?.style} — Choose a color:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p, i) => (
              <button
                key={i}
                onClick={() => handleColorClick(p)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
              >
                {p.images?.Front ? (
                  <img
                    src={p.images.Front}
                    alt={p.colorName}
                    className="w-20 h-20 object-contain rounded-lg border border-border bg-white"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : p.colorSwatch ? (
                  <img src={p.colorSwatch} alt={p.colorName} className="w-12 h-12 rounded-full object-cover border border-border" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-12 h-12 rounded-full border border-border bg-muted" />
                )}
                <span className="text-xs font-medium text-center">{p.colorName}</span>
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
          <p className="text-sm font-medium mb-3">{selectedStyle?.style} — {selectedColor.colorName}</p>
          <div className="space-y-2">
            {VIEWS.map((view) => {
              const url = selectedColor.images?.[view];
              if (!url) return null;
              return (
                <button
                  key={view}
                  onClick={() => onSelectImage && onSelectImage(url, view)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all group"
                >
                  <img src={url} alt={view} className="w-16 h-16 object-contain rounded-lg border border-border bg-white" onError={(e) => { e.target.style.display='none'; }} />
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