import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

export default function CustomProductBrowser({ onSelectImage }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (open) {
      base44.auth.me().then((user) => {
        if (user) {
          base44.entities.CustomProduct.filter({ created_by: user.email }, "-created_date").then(setProducts);
        }
      });
    }
  }, [open]);

  const handleSelectView = (url, view) => {
    onSelectImage(view, url);
    setOpen(false);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
          <Package className="w-3.5 h-3.5" />
          Browse Custom Products
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Products</DialogTitle>
        </DialogHeader>

        {products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No custom products yet. Add some in the Products Library.</p>
          </div>
        ) : !selected ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => {
              const firstImage = p.images ? Object.values(p.images).find(Boolean) : null;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
                >
                  {firstImage ? (
                    <img src={firstImage} alt={p.name} className="w-20 h-20 object-contain rounded-lg border border-border bg-white" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              ← Back to products
            </button>
            <p className="text-sm font-medium mb-3">{selected.name} — Select a view:</p>
            <div className="space-y-2">
              {VIEWS.map((view) => {
                const url = selected.images?.[view];
                if (!url) return null;
                return (
                  <button
                    key={view}
                    onClick={() => handleSelectView(url, view)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
                  >
                    <img src={url} alt={view} className="w-14 h-14 object-contain rounded-lg border border-border bg-white" />
                    <span className="text-sm font-medium">{view}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}