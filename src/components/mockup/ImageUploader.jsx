import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Link, Upload, Loader2 } from "lucide-react";

export default function ImageUploader({ onImageSet }) {
  const [mode, setMode] = useState("upload");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onImageSet(file_url);
    setUploading(false);
  };

  const handleUrlSubmit = () => {
    if (url.trim()) {
      onImageSet(url.trim());
      setUrl("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 bg-secondary rounded-lg">
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
            mode === "upload" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Upload className="w-3.5 h-3.5 inline mr-1.5" />
          Upload
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
            mode === "url" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Link className="w-3.5 h-3.5 inline mr-1.5" />
          From URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/50 transition-all"
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          {uploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload product image</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Paste image URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="text-sm"
          />
          <Button size="sm" onClick={handleUrlSubmit} disabled={!url.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}