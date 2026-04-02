import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, Loader2, X } from "lucide-react";

const VIEWS = ["Front", "Back", "Left", "Right"];

export default function ViewImageUploader({ views, activeView, onImageSet, onRemoveImage }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onImageSet(activeView, file_url);
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* View thumbnails */}
      <div className="grid grid-cols-2 gap-2">
        {VIEWS.map((view) => (
          <div
            key={view}
            className={`relative rounded-lg border-2 overflow-hidden aspect-square transition-all ${
              activeView === view ? "border-primary" : "border-border"
            }`}
          >
            {views[view] ? (
              <>
                <img src={views[view]} alt={view} className="w-full h-full object-cover" />
                <button
                  onClick={() => onRemoveImage(view)}
                  className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                <ImagePlus className="w-5 h-5 mb-1 opacity-40" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-foreground/50 backdrop-blur-sm px-1.5 py-0.5">
              <p className="text-[9px] text-white text-center font-medium">{view}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Upload image for: <span className="font-semibold text-foreground">{activeView}</span></p>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/50 transition-all"
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        {uploading ? (
          <Loader2 className="w-6 h-6 mx-auto text-primary animate-spin" />
        ) : (
          <>
            <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );
}