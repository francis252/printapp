import React, { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2, Check, Sparkles } from "lucide-react";
import ViewImageUploader from "../mockup/ViewImageUploader";
import LogoLibrary from "../mockup/LogoLibrary";
import DraggableCanvas from "../mockup/DraggableCanvas";
import SanMarBrowser from "../mockup/SanMarBrowser";
import SSBrowser from "../mockup/SSBrowser";
import { Separator } from "@/components/ui/separator";

const VIEWS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];
const DEFAULT_LOGO_SETTINGS = { scale: 25, x: 50, y: 50, opacity: 100, rotation: 0 };

export default function MockupModal({ onClose, onSave, initialImages = [], preloadImageUrl = null }) {
  const [views, setViews] = useState({ Front: preloadImageUrl || null, Back: null, "Left Sleeve": null, "Right Sleeve": null });
  const [activeView, setActiveView] = useState("Front");
  const [selectedLogos, setSelectedLogos] = useState({ Front: null, Back: null, "Left Sleeve": null, "Right Sleeve": null });
  const [activeLogoView, setActiveLogoView] = useState("Front");
  const [viewLogoSettings, setViewLogoSettings] = useState({
    Front: { ...DEFAULT_LOGO_SETTINGS },
    Back: { ...DEFAULT_LOGO_SETTINGS },
    "Left Sleeve": { ...DEFAULT_LOGO_SETTINGS },
    "Right Sleeve": { ...DEFAULT_LOGO_SETTINGS },
  });
  const [capturing, setCapturing] = useState(false);
  const containerRefs = useRef({});
  const canvasRef = useRef();

  const handleImageSet = (view, url) => {
    setViews((prev) => ({ ...prev, [view]: url }));
    setActiveView(view);
  };

  const handleSaveMockups = useCallback(async () => {
    const filledViews = VIEWS.filter((v) => views[v] && containerRefs.current[v]);
    if (filledViews.length === 0) return;
    setCapturing(true);

    const captured = await Promise.all(
      filledViews.map(async (v) => {
        const canvas = await html2canvas(containerRefs.current[v], {
          useCORS: true, allowTaint: true, scale: 2, backgroundColor: "#ffffff",
        });
        return new Promise((resolve) => {
          canvas.toBlob(async (blob) => {
            const file = new File([blob], `mockup-${v}.png`, { type: "image/png" });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            resolve({ view: v, url: file_url });
          }, "image/png");
        });
      })
    );

    setCapturing(false);
    onSave(captured);
    onClose();
  }, [views, onSave, onClose]);

  const filledCount = VIEWS.filter(v => views[v]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Mockup Builder</span>
            {filledCount > 0 && <span className="text-xs text-muted-foreground">· {filledCount} view{filledCount !== 1 ? "s" : ""} ready</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveMockups}
              disabled={capturing || filledCount === 0}
              className="gap-2"
              size="sm"
            >
              {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {capturing ? "Saving..." : "Save Mockups to Quote"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 shrink-0 border-r border-border overflow-y-auto bg-card">
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Product Views</h2>
                <ViewImageUploader
                  views={views}
                  activeView={activeView}
                  onImageSet={handleImageSet}
                  onRemoveImage={(view) => setViews((p) => ({ ...p, [view]: null }))}
                />
              </div>
              <Separator />
              <LogoLibrary
                selectedLogos={selectedLogos}
                activeLogoView={activeLogoView}
                onActiveLogoViewChange={setActiveLogoView}
                onSelectLogo={(url) => setSelectedLogos((prev) => ({ ...prev, [activeLogoView]: url }))}
              />
              <Separator />
              <SanMarBrowser onSelectImage={handleImageSet} />
              <Separator />
              <SSBrowser onSelectImage={handleImageSet} />
            </div>
          </aside>

          {/* Canvas */}
          <main className="flex-1 overflow-auto p-4">
            <DraggableCanvas
              views={views}
              activeView={activeView}
              onViewChange={setActiveView}
              selectedLogos={selectedLogos}
              viewLogoSettings={viewLogoSettings}
              onViewLogoSettingsChange={(view, settings) =>
                setViewLogoSettings((prev) => ({ ...prev, [view]: settings }))
              }
              canvasRef={canvasRef}
              containerRefs={containerRefs}
            />
          </main>
        </div>
      </div>
    </div>
  );
}