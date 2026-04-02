import React, { useState, useRef, useCallback, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, Download, Loader2, LayoutGrid, Library, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import SaveProjectModal from "../components/mockup/SaveProjectModal";
// Download/Loader2 used in header Download All button
import ViewImageUploader from "../components/mockup/ViewImageUploader";
import LogoLibrary from "../components/mockup/LogoLibrary";
import DraggableCanvas from "../components/mockup/DraggableCanvas";
import SSBrowser from "../components/mockup/SSBrowser";
import SanMarBrowser from "../components/mockup/SanMarBrowser";
import CustomProductBrowser from "../components/mockup/CustomProductBrowser";
import PSRestfulBrowser from "../components/mockup/PSRestfulBrowser";
import ThemeToggle from "../components/ThemeToggle";
import { base44 } from "@/api/base44Client";
// CanvasControls removed — resize via corner handles on canvas

const VIEWS = ["Front", "Back", "Left", "Right"];

const DEFAULT_LOGO_SETTINGS = { scale: 25, x: 50, y: 50, opacity: 100, rotation: 0 };

export default function MockupGenerator() {
  const location = useLocation();
  const [views, setViews] = useState({ Front: null, Back: null, Left: null, Right: null });
  const [activeView, setActiveView] = useState("Front");
  const [selectedLogos, setSelectedLogos] = useState({ Front: null, Back: null, Left: null, Right: null });
  const [activeLogoView, setActiveLogoView] = useState("Front");
  // Per-view logo settings
  const [viewLogoSettings, setViewLogoSettings] = useState({
    Front: { ...DEFAULT_LOGO_SETTINGS },
    Back: { ...DEFAULT_LOGO_SETTINGS },
    Left: { ...DEFAULT_LOGO_SETTINGS },
    Right: { ...DEFAULT_LOGO_SETTINGS },
  });
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState(null);
  const [sessionLogos, setSessionLogos] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const canvasRef = useRef();
  const containerRefs = useRef({});

  const logoSettings = viewLogoSettings[activeView];

  const handleLogoSettingsChange = (settings) => {
    setViewLogoSettings((prev) => ({ ...prev, [activeView]: settings }));
  };

  const VIEW_NAME_MAP = {
    "Left Sleeve": "Left",
    "Right Sleeve": "Right",
  };

  const handleImageSet = (view, url) => {
    const mappedView = VIEW_NAME_MAP[view] || view;
    setViews((prev) => ({ ...prev, [mappedView]: url }));
    setActiveView(mappedView);
  };

  const handleRemoveImage = (view) => {
    setViews((prev) => ({ ...prev, [view]: null }));
  };

  // Clear ALL state on page load (fresh session, only if no project is being loaded)
  useEffect(() => {
    if (!location.state?.project) {
      setSelectedLogos({ Front: null, Back: null, Left: null, Right: null });
      setViews({ Front: null, Back: null, Left: null, Right: null });
      setViewLogoSettings({
        Front: { ...DEFAULT_LOGO_SETTINGS },
        Back: { ...DEFAULT_LOGO_SETTINGS },
        Left: { ...DEFAULT_LOGO_SETTINGS },
        Right: { ...DEFAULT_LOGO_SETTINGS },
      });
    }
  }, []);

  // Handle image passed from ProductsLibrary
  useEffect(() => {
    if (location.state?.imageUrl) {
      const view = location.state.imageView || "Front";
      handleImageSet(view, location.state.imageUrl);
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Load project from dashboard
  useEffect(() => {
    if (location.state?.project) {
      const p = location.state.project;
      if (p.views) setViews(p.views);
      if (p.selected_logos) setSelectedLogos(p.selected_logos);
      if (p.view_logo_settings) setViewLogoSettings(p.view_logo_settings);
      if (p.name) setProjectName(p.name);
      if (p.id) setProjectId(p.id);
      if (p.session_logos) setSessionLogos(p.session_logos);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.project]);

  // Clear logos when navigating away from mockup
  useEffect(() => {
    if (location.pathname !== "/mockup") {
      setSelectedLogos({ Front: null, Back: null, Left: null, Right: null });
    }
  }, [location.pathname]);

  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => { const img2 = new Image(); img2.onload = () => resolve(img2); img2.onerror = () => resolve(null); img2.src = src; };
    img.src = src;
  });

  const renderViewToCanvas = async (v, scale = 4) => {
    const el = containerRefs.current[v]; if (!el) return null;
    const w = el.offsetWidth * scale;
    const h = el.offsetHeight * scale;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    const productImg = await loadImage(views[v]);
    if (productImg) ctx.drawImage(productImg, 0, 0, w, h);
    const logoUrl = selectedLogos[v];
    const ls = viewLogoSettings[v];
    if (logoUrl && ls) {
      const logoImg = await loadImage(logoUrl);
      if (logoImg) {
        const logoW = (ls.scale / 100) * w;
        const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
        const cx = (ls.x / 100) * w;
        const cy = (ls.y / 100) * h;
        ctx.save();
        ctx.globalAlpha = ls.opacity / 100;
        ctx.translate(cx, cy);
        ctx.rotate((ls.rotation ?? 0) * (Math.PI / 180));
        ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
        ctx.restore();
      }
    }
    return c;
  };

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    const canvas = await renderViewToCanvas(activeView);
    if (canvas) {
      const link = document.createElement("a");
      link.download = `mockup-${activeView.replace(/ /g, "-").toLowerCase()}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
    setDownloading(false);
  }, [activeView, views, selectedLogos, viewLogoSettings]);

  const handleDownloadAll = useCallback(async () => {
    setDownloading(true);
    const filledViews = VIEWS.filter((v) => views[v] && containerRefs.current[v]);
    if (filledViews.length === 0) { setDownloading(false); return; }

    const canvases = (await Promise.all(filledViews.map((v) => renderViewToCanvas(v)))).filter(Boolean);

    const PADDING = 60;
    const GAP = 40;
    const LABEL_HEIGHT = 48;
    const FOOTER_HEIGHT = 60;

    // Normalize all canvases to the same height
    const maxH = Math.max(...canvases.map((c) => c.height));
    const itemWidth = canvases[0].width;
    const totalWidth = PADDING * 2 + itemWidth * canvases.length + GAP * (canvases.length - 1);
    const totalHeight = PADDING + LABEL_HEIGHT + maxH + FOOTER_HEIGHT;

    const output = document.createElement("canvas");
    output.width = totalWidth;
    output.height = totalHeight;
    const ctx = output.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Top header
    ctx.fillStyle = "#111111";
    ctx.font = "bold 28px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Artwork Approval Sheet", totalWidth / 2, PADDING - 10);

    // Draw each mockup with label
    canvases.forEach((c, i) => {
      const x = PADDING + i * (itemWidth + GAP);
      const y = PADDING + LABEL_HEIGHT;

      // Label above image
      ctx.fillStyle = "#555555";
      ctx.font = "bold 22px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(filledViews[i], x + itemWidth / 2, y - 12);

      // Draw image
      ctx.drawImage(c, x, y);

      // Subtle border around image
      ctx.strokeStyle = "#dddddd";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, c.width, c.height);
    });

    // Footer
    const footerY = PADDING + LABEL_HEIGHT + maxH + 20;
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "18px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, totalWidth / 2, footerY + 24);

    const link = document.createElement("a");
    link.download = `artwork-approval-${Date.now()}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
    setDownloading(false);
  }, [views, selectedLogos, viewLogoSettings]);

  const handleReset = () => {
    setViews({ Front: null, Back: null, Left: null, Right: null });
    setSelectedLogos({ Front: null, Back: null, Left: null, Right: null });
    setViewLogoSettings({
      Front: { ...DEFAULT_LOGO_SETTINGS },
      Back: { ...DEFAULT_LOGO_SETTINGS },
      Left: { ...DEFAULT_LOGO_SETTINGS },
      Right: { ...DEFAULT_LOGO_SETTINGS },
    });
    setActiveView("Front");
    setActiveLogoView("Front");
  };

  const filledViews = VIEWS.filter((v) => views[v]);

  return (
    <div className="min-h-screen bg-background font-inter overflow-x-hidden w-full">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Mockup Generator</h1>
              <p className="text-xs text-muted-foreground">Place logos on product images & download</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {filledViews.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download All</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)} className="gap-1.5 text-xs">
              <span className="hidden sm:inline">Save Project</span>
              <span className="sm:hidden">Save</span>
            </Button>
            <Link to="/" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
              </Button>
            </Link>
            <Link to="/products" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Library className="w-3.5 h-3.5" /> Products
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleReset} className="text-muted-foreground" title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Link to="/" className="sm:hidden">
              <Button variant="ghost" size="icon" className="text-muted-foreground" title="Dashboard">
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0 space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
              <div>
                <label className="text-sm font-semibold block mb-2">Project Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                    className="gap-1.5 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Browse Catalog</h3>
                <SSBrowser onSelectImage={handleImageSet} />
                <SanMarBrowser onSelectImage={handleImageSet} />
                <CustomProductBrowser onSelectImage={handleImageSet} />
                <PSRestfulBrowser onSelectImage={handleImageSet} />
              </div>
              <Separator />
              <LogoLibrary
                selectedLogos={selectedLogos}
                activeLogoView={activeLogoView}
                onActiveLogoViewChange={setActiveLogoView}
                onSelectLogo={(url) => setSelectedLogos((prev) => ({ ...prev, [activeLogoView]: url }))}
                sessionLogos={sessionLogos}
                onSessionLogosChange={setSessionLogos}
                onClearLogo={(url) => setSelectedLogos((prev) => {
                  const updated = { ...prev };
                  Object.keys(updated).forEach((view) => {
                    if (updated[view] === url) updated[view] = null;
                  });
                  return updated;
                })}
              />
              <Separator />
              <div>
                <h2 className="text-sm font-semibold mb-3">Product Views</h2>
                <ViewImageUploader
                  views={views}
                  activeView={activeView}
                  onImageSet={handleImageSet}
                  onRemoveImage={handleRemoveImage}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => base44.auth.logout("/")}
              className="w-full gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </aside>

          {/* Canvas */}
          <main className="flex-1 flex flex-col gap-4">
            <DraggableCanvas
              views={views}
              activeView={activeView}
              onViewChange={setActiveView}
              selectedLogos={selectedLogos}
              viewLogoSettings={viewLogoSettings}
              onViewLogoSettingsChange={(view, settings) => setViewLogoSettings((prev) => ({ ...prev, [view]: settings }))}
              canvasRef={canvasRef}
              containerRefs={containerRefs}
            />
          </main>
        </div>
      </div>

      {showSaveModal && (
        <SaveProjectModal
          views={views}
          selectedLogos={selectedLogos}
          viewLogoSettings={viewLogoSettings}
          projectName={projectName}
          setProjectName={setProjectName}
          projectId={projectId}
          sessionLogos={sessionLogos}
          onClose={() => setShowSaveModal(false)}
          canvasRef={canvasRef}
        />
      )}
    </div>
  );
}