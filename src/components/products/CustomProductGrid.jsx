import React from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function CustomProductGrid({ products }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomProduct.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customProducts"] }),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          {product.images?.Front && (
            <img src={product.images.Front} alt={product.name} className="w-full h-40 object-cover" />
          )}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
            </div>

            {product.color_swatches?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colors ({product.color_swatches.length})</p>
                <div className="flex flex-wrap gap-2">
                  {product.color_swatches.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {color.swatch_url && (
                        <img src={color.swatch_url} alt={color.color_name} className="w-5 h-5 rounded-full border border-border" />
                      )}
                      <span className="text-xs">{color.color_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(product.id)}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}