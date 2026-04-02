import React, { useRef, useState, useCallback, useEffect } from "react";
import { ImageOff, RotateCw, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

const HANDLES = ["nw", "ne", "se", "sw"];

const handlePositions = {
  nw: { left: 0, top: 0, transform: "translate(-50%, -50%)", cursor: "nw-resize" },
  ne: { right: 0, top: 0, transform: "translate(50%, -50%)", cursor: "ne-resize" },
  se: { right: 0, bottom: 0, transform: "translate(50%, 50%)", cursor: "se-resize" },
  sw: { left: 0, bottom: 0, transform: "translate(-50%, 50%)", cursor: "sw-resize" },
};

export default function SingleViewCanvas({ view, imageUrl, logoUrl, logoSettings, onLogoSettingsChange, canvasRef: externalCanvasRef, containerRefCallback }) {
  const containerRef = useRef();
  const [selected, setSelected] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const dragOffset = useRef({ ox: 0, oy: 0 });
  const resizeStart = useRef(null);
  const rotateStart = useRef(null);

  const getRect = () => containerRef.current?.getBoundingClientRect();

  const getLogoCenter = () => {
    const r = getRect();
    if (!r) return null;
    return { cx: r.left + (logoSettings.x / 100) * r.width, cy: r.top + (logoSettings.y / 100) * r.height };
  };

  const onMouseDownLogo = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const r = getRect(); if (!r) return;
    setSelected(true);
    setDragging(true);
    dragOffset.current = {
      ox: e.clientX - (r.left + (logoSettings.x / 100) * r.width),
      oy: e.clientY - (r.top + (logoSettings.y / 100) * r.height),
    };
  }, [logoSettings]);

  const onTouchStartLogo = useCallback((e) => {
    e.stopPropagation();
    const t = e.touches[0]; const r = getRect(); if (!r) return;
    setSelected(true);
    setDragging(true);
    dragOffset.current = {
      ox: t.clientX - (r.left + (logoSettings.x / 100) * r.width),
      oy: t.clientY - (r.top + (logoSettings.y / 100) * r.height),
    };
  }, [logoSettings]);

  const onMouseDownHandle = useCallback((e, handle) => {
    e.preventDefault(); e.stopPropagation();
    const r = getRect(); if (!r) return;
    setResizing(handle);
    resizeStart.current = { clientX: e.clientX, initialScale: logoSettings.scale, containerW: r.width, handle };
  }, [logoSettings]);

  const onTouchStartHandle = useCallback((e, handle) => {
    e.stopPropagation();
    const t = e.touches[0]; const r = getRect(); if (!r) return;
    setResizing(handle);
    resizeStart.current = { clientX: t.clientX, initialScale: logoSettings.scale, containerW: r.width, handle };
  }, [logoSettings]);

  const onMouseDownRotate = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const center = getLogoCenter(); if (!center) return;
    setRotating(true);
    rotateStart.current = {
      startAngle: Math.atan2(e.clientY - center.cy, e.clientX - center.cx) * (180 / Math.PI),
      initialRotation: logoSettings.rotation ?? 0,
    };
  }, [logoSettings]);

  const onTouchStartRotate = useCallback((e) => {
    e.stopPropagation();
    const t = e.touches[0]; const center = getLogoCenter(); if (!center) return;
    setRotating(true);
    rotateStart.current = {
      startAngle: Math.atan2(t.clientY - center.cy, t.clientX - center.cx) * (180 / Math.PI),
      initialRotation: logoSettings.rotation ?? 0,
    };
  }, [logoSettings]);

  useEffect(() => {
    const move = (cx, cy) => {
      if (dragging) {
        const r = getRect(); if (!r) return;
        const x = ((cx - dragOffset.current.ox - r.left) / r.width) * 100;
        const y = ((cy - dragOffset.current.oy - r.top) / r.height) * 100;
        onLogoSettingsChange({ ...logoSettings, x: Math.round(Math.min(100, Math.max(0, x))), y: Math.round(Math.min(100, Math.max(0, y))) });
      }
      if (resizing && resizeStart.current) {
        const { clientX, initialScale, containerW, handle } = resizeStart.current;
        const sign = (handle === "nw" || handle === "sw") ? -1 : 1;
        const newScale = Math.round(Math.min(100, Math.max(5, initialScale + ((cx - clientX) / containerW) * 100 * sign)));
        onLogoSettingsChange({ ...logoSettings, scale: newScale });
      }
      if (rotating && rotateStart.current) {
        const center = getLogoCenter(); if (!center) return;
        const currentAngle = Math.atan2(cy - center.cy, cx - center.cx) * (180 / Math.PI);
        const newRotation = Math.round((rotateStart.current.initialRotation + (currentAngle - rotateStart.current.startAngle) + 360) % 360);
        onLogoSettingsChange({ ...logoSettings, rotation: newRotation });
      }
    };
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onTouchMove = (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); };
    const onUp = () => { setDragging(false); setResizing(null); setRotating(false); resizeStart.current = null; rotateStart.current = null; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, resizing, rotating, logoSettings, onLogoSettingsChange]);

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Use a proxy to avoid CORS issues with external images
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: try without crossOrigin
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = reject;
      img2.src = src;
    };
    img.src = src;
  });

  const handleDownload = async () => {
    const el = containerRef.current; if (!el) return;
    setDownloading(true);

    const scale = 4;
    const w = el.offsetWidth * scale;
    const h = el.offsetHeight * scale;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Draw product image
    const productImg = await loadImage(imageUrl);
    ctx.drawImage(productImg, 0, 0, w, h);

    // Draw logo if present
    if (logoUrl && logoSettings) {
      const logoImg = await loadImage(logoUrl);
      const logoW = (logoSettings.scale / 100) * w;
      const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
      const cx = (logoSettings.x / 100) * w;
      const cy = (logoSettings.y / 100) * h;
      const rotation = (logoSettings.rotation ?? 0) * (Math.PI / 180);

      ctx.save();
      ctx.globalAlpha = logoSettings.opacity / 100;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
      ctx.restore();
    }

    const link = document.createElement("a");
    link.download = `mockup-${view.replace(/ /g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setDownloading(false);
  };

  const active = dragging || !!resizing || rotating;
  const rotation = logoSettings?.rotation ?? 0;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">{view}</p>

      {!imageUrl ? (
        <div className="flex items-center justify-center bg-muted/30 rounded-xl border-2 border-dashed border-border aspect-square">
          <div className="text-center px-3">
            <ImageOff className="w-6 h-6 mx-auto text-muted-foreground/30 mb-1" />
            <p className="text-[10px] text-muted-foreground">No image</p>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={(el) => {
              containerRef.current = el;
              if (externalCanvasRef) externalCanvasRef.current = el;
              if (containerRefCallback) containerRefCallback(el);
            }}
            className="relative bg-white rounded-xl shadow border border-border select-none overflow-hidden"
            style={{ cursor: "default" }}
            onClick={() => setSelected(false)}
          >
            <img src={imageUrl} alt={view} className="w-full h-auto block" crossOrigin="anonymous" draggable={false} />

            {logoUrl && logoSettings && (
              <div
                style={{
                  position: "absolute",
                  left: `${logoSettings.x}%`,
                  top: `${logoSettings.y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  width: `${logoSettings.scale}%`,
                  opacity: logoSettings.opacity / 100,
                  fontSize: 0,
                  lineHeight: 0,
                }}
              >
                {/* The img is the logo - clicking selects, mousedown starts drag */}
                <img
                  src={logoUrl} alt="Logo" crossOrigin="anonymous" draggable={false}
                  onClick={(e) => { e.stopPropagation(); setSelected(true); }}
                  onMouseDown={onMouseDownLogo} onTouchStart={onTouchStartLogo}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    cursor: active ? "grabbing" : "grab",
                    userSelect: "none",
                    outline: selected ? "1.5px dashed hsl(var(--primary))" : "none",
                    outlineOffset: "2px",
                  }}
                />
                {selected && (
                  <div data-html2canvas-ignore="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {/* Corner resize handles */}
                    {HANDLES.map((h) => (
                      <div key={h}
                        onMouseDown={(e) => onMouseDownHandle(e, h)}
                        onTouchStart={(e) => onTouchStartHandle(e, h)}
                        style={{
                          position: "absolute", width: 10, height: 10,
                          background: "white", border: "2px solid hsl(var(--primary))",
                          borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          zIndex: 10, pointerEvents: "all",
                          ...handlePositions[h]
                        }}
                      />
                    ))}
                    {/* Rotate handle */}
                    <div
                      onMouseDown={onMouseDownRotate} onTouchStart={onTouchStartRotate}
                      style={{
                        position: "absolute", top: 0, left: "50%",
                        transform: "translate(-50%, calc(-100% - 6px))",
                        width: 18, height: 18, background: "white",
                        border: "2px solid hsl(var(--primary))", borderRadius: "50%",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        cursor: rotating ? "grabbing" : "grab",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 20, pointerEvents: "all",
                      }}
                    >
                      <RotateCw style={{ width: 9, height: 9, color: "hsl(var(--primary))", pointerEvents: "none" }} />
                    </div>
                    {rotation !== 0 && (
                      <div style={{
                        position: "absolute", top: 0, left: "50%",
                        transform: "translate(-50%, calc(-100% - 28px))",
                        background: "hsl(var(--primary))", color: "white",
                        fontSize: 8, fontWeight: 600, padding: "1px 3px",
                        borderRadius: 3, whiteSpace: "nowrap", zIndex: 15,
                      }}>
                        {rotation}°
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Download
          </button>
        </>
      )}
    </div>
  );
}