import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

export default function CustomProductForm({ onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [images, setImages] = useState({ Front: null, Back: null, "Left Sleeve": null, "Right Sleeve": null });
  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState({ name: "", code: "", swatch: null });
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customProducts"] });
      toast.success("Product added!");
      onClose();
    },
  });

  const handleImageUpload = async (e, view) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImages((prev) => ({ ...prev, [view]: file_url }));
    setUploading(false);
  };

  const handleSwatchUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewColor((prev) => ({ ...prev, swatch: file_url }));
    setUploading(false);
  };

  const handleAddColor = () => {
    if (!newColor.name.trim()) return;
    setColors((prev) => [
      ...prev,
      { color_name: newColor.name, color_code: newColor.code || "", swatch_url: newColor.swatch || "" }
    ]);
    setNewColor({ name: "", code: "", swatch: null });
  };

  const handleRemoveColor = (idx) => {
    setColors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim() || !brand.trim()) {
      toast.error("Name and brand are required");
      return;
    }
    createMutation.mutate({
      name,
      brand,
      images,
      color_swatches: colors,
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Add Custom Product</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Product Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Gildan 5000 T-Shirt" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand</label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Gildan" />
        </div>
      </div>

      {/* Product images */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-3 block">Product Images</label>
        <div className="grid grid-cols-2 gap-4">
          {VIEWS.map((view) => (
            <div key={view} className="space-y-2">
              <p className="text-xs font-medium">{view}</p>
              {images[view] ? (
                <div className="relative">
                  <img src={images[view]} alt={view} className="w-full h-32 object-cover rounded-lg border border-border" />
                  <button
                    onClick={() => setImages((prev) => ({ ...prev, [view]: null }))}
                    className="absolute top-1 right-1 bg-destructive text-white rounded w-6 h-6 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, view)} disabled={uploading} />
                  {uploading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : <span className="text-xs text-muted-foreground">Click to upload</span>}
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-3 block">Color Variants</label>
        <div className="space-y-3 mb-4">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {color.swatch_url && <img src={color.swatch_url} alt={color.color_name} className="w-6 h-6 rounded-full border border-border" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{color.color_name}</p>
                {color.color_code && <p className="text-xs text-muted-foreground">{color.color_code}</p>}
              </div>
              <button
                onClick={() => handleRemoveColor(idx)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3 p-4 bg-secondary rounded-lg">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Color name" value={newColor.name} onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Color code (opt)" value={newColor.code} onChange={(e) => setNewColor((p) => ({ ...p, code: e.target.value }))} />
            {newColor.swatch ? (
              <button
                onClick={() => setNewColor((p) => ({ ...p, swatch: null }))}
                className="bg-muted rounded-lg text-xs hover:bg-muted/80"
              >
                Remove swatch
              </button>
            ) : (
              <label className="bg-muted rounded-lg text-xs hover:bg-muted/80 cursor-pointer flex items-center justify-center">
                <input type="file" accept="image/*" className="hidden" onChange={handleSwatchUpload} disabled={uploading} />
                {uploading ? "Uploading..." : "Add swatch"}
              </label>
            )}
          </div>
          <Button onClick={handleAddColor} variant="outline" size="sm" className="w-full gap-2">
            <Plus className="w-3 h-3" /> Add Color
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={createMutation.isPending} className="gap-2">
          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Product
        </Button>
      </div>
    </div>
  );
}