import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageOff } from "lucide-react";

export default function ImageCanvas({ productImage, logoUrl, logoSettings, onDownload, downloading }) {
  const canvasContainerRef = useRef();

  if (!productImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-2xl border-2 border-dashed border-border min-h-[400px]">
        <div className="text-center">
          <ImageOff className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">Upload a product image to get started</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Or paste an image URL from your supplier</p>
        </div>
      </div>
    );
  }

  const logoStyle = logoUrl
    ? {
        position: "absolute",
        left: `${logoSettings.x}%`,
        top: `${logoSettings.y}%`,
        transform: "translate(-50%, -50%)",
        width: `${logoSettings.scale}%`,
        opacity: logoSettings.opacity / 100,
        pointerEvents: "none",
      }
    : null;

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div
        ref={canvasContainerRef}
        className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-border"
        style={{ minHeight: "400px" }}
      >
        <img
          src={productImage}
          alt="Product"
          className="w-full h-auto block"
          crossOrigin="anonymous"
        />
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            style={logoStyle}
            className="max-h-full"
            crossOrigin="anonymous"
          />
        )}
      </div>

      <Button
        onClick={onDownload}
        disabled={downloading}
        className="w-full h-11 rounded-xl font-semibold text-sm gap-2"
        size="lg"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {downloading ? "Generating..." : "Download Mockup"}
      </Button>
    </div>
  );
}