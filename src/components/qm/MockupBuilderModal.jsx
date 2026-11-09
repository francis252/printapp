import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Save, X, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import {
  DECORATOR_COLORS,
  isSvgFile,
  detectSvgColors,
  applyReplacementMapToSvg,
  svgTextToObjectUrl,
  detectLogoColors,
  renderPngWithReplacements,
  normalizeHex,
} from './logoRecolor';

const ANGLES = [
  { key: 'frontImage', label: 'Front' },
  { key: 'backImage',  label: 'Back' },
  { key: 'sideImage',  label: 'Left Side' },
  { key: 'side2Image', label: 'Right Side' },
];

const HANDLES = [
  { id: 'tl', x: 0,   y: 0   },
  { id: 'tr', x: 100, y: 0   },
  { id: 'bl', x: 0,   y: 100 },
  { id: 'br', x: 100, y: 100 },
  { id: 'rotate', x: 50, y: -15, isRotate: true },
];

function getCursor(handleId) {
  const map = { tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize' };
  return map[handleId] || 'pointer';
}

export default function MockupBuilderModal({ open, onClose, item, ssColors, onSave }) {
  const selectedColorObj = ssColors?.find(c => c.colorName === item?.color) || ssColors?.[0] || null;
  const availableAngles = ANGLES.filter(a => selectedColorObj?.[a.key]);
  const [activeAngle, setActiveAngle] = useState(availableAngles[0]?.key || 'frontImage');

  const baseImage = selectedColorObj?.[activeAngle] || item?.product_image_url || null;

  // ── Artwork state ──
  const [artworkType, setArtworkType] = useState(null);           // 'svg' | 'png' | null
  const [originalFile, setOriginalFile] = useState(null);         // original File object (PNG)
  const [originalSvgMarkup, setOriginalSvgMarkup] = useState(''); // original SVG text
  const [previewUrl, setPreviewUrl] = useState(null);             // current display URL (SVG blob or PNG dataURL)
  const [svgObjectUrl, setSvgObjectUrl] = useState(null);         // revokable SVG blob URL

  // ── Color state ──
  const [detectedColors, setDetectedColors] = useState([]);       // [{ hex, ... }]
  const [replacementMap, setReplacementMap] = useState({});       // { originalHex: replacementHex }
  const [selectedFromColor, setSelectedFromColor] = useState(null);

  // ── Decoration color state ──
  const [colorType, setColorType] = useState('thread');
  const [selectedColors, setSelectedColors] = useState(item?.decoration_colors || []);
  const [palettes, setPalettes] = useState([]);
  const [selectedPaletteId, setSelectedPaletteId] = useState('');

  // ── Logo placement ──
  const [logoX, setLogoX] = useState(150);
  const [logoY, setLogoY] = useState(100);
  const [logoW, setLogoW] = useState(120);
  const [logoH, setLogoH] = useState(120);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoSelected, setLogoSelected] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const [saving, setSaving] = useState(false);

  const canvasAreaRef = useRef(null);
  const logoInputRef = useRef();
  const dragState = useRef(null);
  const svgObjectUrlRef = useRef(null); // keep track for revoke

  // Load palettes
  useEffect(() => {
    if (open) base44.entities.ColorPalette.list('-created_date', 50).then(d => setPalettes(d || []));
  }, [open]);

  // Reset on open/color change
  useEffect(() => {
    if (open) {
      const angles = ANGLES.filter(a => selectedColorObj?.[a.key]);
      setActiveAngle(angles[0]?.key || 'frontImage');
      setSelectedColors(item?.decoration_colors || []);
      clearArtwork();
    }
  }, [open, item?.color]);

  function clearArtwork() {
    if (svgObjectUrlRef.current) { URL.revokeObjectURL(svgObjectUrlRef.current); svgObjectUrlRef.current = null; }
    setArtworkType(null);
    setOriginalFile(null);
    setOriginalSvgMarkup('');
    setPreviewUrl(null);
    setSvgObjectUrl(null);
    setDetectedColors([]);
    setReplacementMap({});
    setSelectedFromColor(null);
    setLogoSelected(false);
    setLogoRotation(0);
  }

  // Deselect logo when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!canvasAreaRef.current?.contains(e.target)) return;
      const logoEl = canvasAreaRef.current.querySelector('[data-logo]');
      if (logoEl && !logoEl.contains(e.target)) setLogoSelected(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Re-render preview whenever replacementMap changes (always from original source)
  useEffect(() => {
    if (!artworkType) return;
    rerenderPreview(replacementMap);
  }, [replacementMap, artworkType]);

  const rerenderPreview = useCallback(async (map) => {
    if (artworkType === 'svg' && originalSvgMarkup) {
      const updated = applyReplacementMapToSvg(originalSvgMarkup, map);
      // Revoke old blob URL
      if (svgObjectUrlRef.current) URL.revokeObjectURL(svgObjectUrlRef.current);
      const url = svgTextToObjectUrl(updated);
      svgObjectUrlRef.current = url;
      setSvgObjectUrl(url);
      setPreviewUrl(url);
    }

    if (artworkType === 'png' && originalFile) {
      setRerendering(true);
      const result = await renderPngWithReplacements(originalFile, map, { outputScale: 2, tolerance: 28 });
      setPreviewUrl(result.dataUrl);
      setRerendering(false);
    }
  }, [artworkType, originalSvgMarkup, originalFile]);

  const uploadArtwork = async (file) => {
    setUploading(true);
    clearArtwork();

    if (isSvgFile(file)) {
      // ── SVG workflow ──
      const svgText = await file.text();
      const colors = detectSvgColors(svgText);

      const url = svgTextToObjectUrl(svgText);
      svgObjectUrlRef.current = url;

      setArtworkType('svg');
      setOriginalSvgMarkup(svgText);
      setDetectedColors(colors.map(hex => ({ hex })));
      setPreviewUrl(url);
      setSvgObjectUrl(url);
      setLogoSelected(true);

      if (colors.length === 1) setSelectedFromColor(colors[0]);

      // Size logo on canvas
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.naturalHeight / img.naturalWidth;
        const w = 140;
        const h = w * aspect;
        setLogoW(w); setLogoH(h);
        const area = canvasAreaRef.current;
        setLogoX((area?.offsetWidth || 400) / 2 - w / 2);
        setLogoY((area?.offsetHeight || 400) / 2 - h / 2);
      };
      img.src = url;

    } else {
      // ── PNG workflow ──
      setArtworkType('png');
      setOriginalFile(file);

      // Upload to storage for final save
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Detect colors from original at 1x (fast)
      setDetecting(true);
      const result = await renderPngWithReplacements(file, {}, { outputScale: 1 });
      const colors = await detectLogoColors(result.dataUrl);
      setDetectedColors(colors);
      setDetecting(false);

      // Generate 2x preview
      const preview = await renderPngWithReplacements(file, {}, { outputScale: 2 });
      setPreviewUrl(preview.dataUrl);
      setLogoSelected(true);

      if (colors.length === 1) setSelectedFromColor(colors[0].hex);

      // Size logo
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.naturalHeight / img.naturalWidth;
        const w = 140; const h = w * aspect;
        setLogoW(w); setLogoH(h);
        const area = canvasAreaRef.current;
        setLogoX((area?.offsetWidth || 400) / 2 - w / 2);
        setLogoY((area?.offsetHeight || 400) / 2 - h / 2);
      };
      img.src = preview.dataUrl;

      // Store the uploaded URL as the PNG file reference for save
      // We keep originalFile for recoloring, file_url for final upload
      setOriginalFile({ file, uploadedUrl: file_url });
    }

    setUploading(false);
  };

  // Apply a replacement color to the selected artwork color
  const applyReplacementColor = async (toHex) => {
    const fromHex = selectedFromColor || (detectedColors.length === 1 ? (detectedColors[0].hex || detectedColors[0]) : null);
    if (!fromHex) { toast.info('Select an artwork color first, then pick a replacement.'); return; }
    const norm = normalizeHex(toHex);
    if (!norm) return;
    setReplacementMap(prev => ({ ...prev, [fromHex]: norm }));
  };

  const resetColors = () => {
    setReplacementMap({});
    setSelectedFromColor(null);
  };

  // Drag / resize / rotate
  const handleLogoPointerDown = (e, type, handleId) => {
    e.stopPropagation(); e.preventDefault();
    if (type === 'move') setLogoSelected(true);
    const area = canvasAreaRef.current.getBoundingClientRect();
    dragState.current = {
      type, handleId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: logoX, startY: logoY, startW: logoW, startH: logoH,
      startRotation: logoRotation,
      centerX: area.left + logoX + logoW / 2,
      centerY: area.top + logoY + logoH / 2,
      aspect: logoW / logoH,
    };
    const onMove = (me) => {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.type === 'move') {
        setLogoX(ds.startX + me.clientX - ds.startMouseX);
        setLogoY(ds.startY + me.clientY - ds.startMouseY);
      } else if (ds.type === 'resize') {
        const dx = me.clientX - ds.startMouseX;
        let newW=ds.startW, newH=ds.startH, newX=ds.startX, newY=ds.startY;
        if (ds.handleId==='br')      { newW=Math.max(30,ds.startW+dx); newH=newW/ds.aspect; }
        else if (ds.handleId==='bl') { newW=Math.max(30,ds.startW-dx); newH=newW/ds.aspect; newX=ds.startX+ds.startW-newW; }
        else if (ds.handleId==='tr') { newW=Math.max(30,ds.startW+dx); newH=newW/ds.aspect; newY=ds.startY+ds.startH-newH; }
        else if (ds.handleId==='tl') { newW=Math.max(30,ds.startW-dx); newH=newW/ds.aspect; newX=ds.startX+ds.startW-newW; newY=ds.startY+ds.startH-newH; }
        setLogoW(newW); setLogoH(newH); setLogoX(newX); setLogoY(newY);
      } else if (ds.type === 'rotate') {
        const angle = Math.atan2(me.clientY - ds.centerY, me.clientX - ds.centerX);
        setLogoRotation((angle * 180) / Math.PI + 90);
      }
    };
    const onUp = () => { dragState.current = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleDecoColorClick = (color) => {
    setSelectedColors(prev => {
      const exists = prev.find(c => c.code === color.code);
      return exists ? prev.filter(c => c.code !== color.code) : [...prev, { ...color, color_type: colorType }];
    });
  };

  const handleSave = async () => {
    if (!canvasAreaRef.current) return;
    setSaving(true);
    setLogoSelected(false);
    await new Promise(r => setTimeout(r, 100));

    const el = canvasAreaRef.current;
    const canvas = await html2canvas(el, { useCORS: true, allowTaint: true, scale: 2 });
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `mockup-${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const angleName = ANGLES.find(a => a.key === activeAngle)?.label || 'Mockup';
      const existingMockups = item.mockups || [];
      const newMockups = [...existingMockups, { url: file_url, name: `${angleName} Mockup`, type: 'image/png' }];
      onSave({ product_image_url: file_url, mockups: newMockups, decoration_colors: selectedColors });
      setSaving(false);
      toast.success('Mockup saved!');
      onClose();
    }, 'image/png');
  };

  const filteredPalettes = palettes.filter(p => p.palette_type === colorType);
  const activePalette = filteredPalettes.find(p => p.id === selectedPaletteId) || filteredPalettes[0] || null;

  const getDisplayHex = (originalHex) => replacementMap[originalHex] || originalHex;
  const hasArtwork = !!previewUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle>Mockup Builder — {item?.product_name || 'Product'}</DialogTitle>
          {item?.color && <p className="text-sm text-slate-500 mt-0.5">Color: {item.color}</p>}
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          {/* Left: Canvas */}
          <div className="flex-1 flex flex-col p-4 gap-3 min-w-0">
            {availableAngles.length > 1 && (
              <div className="flex gap-1">
                {availableAngles.map(a => (
                  <button key={a.key} onClick={() => setActiveAngle(a.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${activeAngle === a.key ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div
              ref={canvasAreaRef}
              className="relative border rounded-lg overflow-hidden bg-white select-none"
              style={{ width: '100%', aspectRatio: '1/1', maxHeight: 400, cursor: 'default' }}
            >
              {baseImage ? (
                <img src={baseImage} alt="product" className="absolute inset-0 w-full h-full object-contain pointer-events-none" crossOrigin="anonymous" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">No product image</div>
              )}

              {previewUrl && (
                <div
                  data-logo="true"
                  style={{
                    position: 'absolute',
                    left: logoX, top: logoY, width: logoW, height: logoH,
                    transform: `rotate(${logoRotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: 'move',
                    touchAction: 'none',
                    border: logoSelected ? '1.5px dashed #3b82f6' : '1.5px dashed transparent',
                  }}
                  onPointerDown={(e) => handleLogoPointerDown(e, 'move', null)}
                >
                  {/* SVG: render as <img> from blob URL — stays vector */}
                  <img
                    src={previewUrl}
                    alt="logo"
                    draggable={false}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'contain', display: 'block',
                      pointerEvents: 'none',
                      imageRendering: artworkType === 'svg' ? 'auto' : 'auto',
                    }}
                  />

                  {logoSelected && HANDLES.map(h => (
                    <div
                      key={h.id}
                      onPointerDown={(e) => handleLogoPointerDown(e, h.isRotate ? 'rotate' : 'resize', h.id)}
                      style={{
                        position: 'absolute',
                        left: `calc(${h.x}% - 5px)`, top: `calc(${h.y}% - 5px)`,
                        width: 10, height: 10,
                        borderRadius: h.isRotate ? '50%' : 2,
                        backgroundColor: h.isRotate ? '#8b5cf6' : '#3b82f6',
                        border: '2px solid white',
                        cursor: h.isRotate ? 'grab' : getCursor(h.id),
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        zIndex: 10,
                      }}
                      title={h.isRotate ? 'Rotate' : 'Resize'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l flex flex-col md:overflow-y-auto flex-shrink-0">

            {/* LOGO / ARTWORK section */}
            <div className="p-4 border-b">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Logo / Artwork</p>

              {/* Preview thumbnail */}
              {previewUrl && (
                <div className="relative group border rounded-lg overflow-hidden mb-2"
                  style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 12px 12px' }}>
                  <img src={previewUrl} alt="Logo" className="w-full h-20 object-contain p-2" style={{ display: 'block' }} />
                  {artworkType === 'svg' && (
                    <span className="absolute bottom-1 left-1 text-[9px] bg-blue-100 text-blue-700 font-bold rounded px-1">SVG</span>
                  )}
                  <button
                    onClick={clearArtwork}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {uploading ? 'Uploading...' : hasArtwork ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {hasArtwork && (
                  <button
                    onClick={resetColors}
                    className="text-slate-400 hover:text-slate-600 px-2" title="Reset colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => e.target.files[0] && uploadArtwork(e.target.files[0])} />
            </div>

            {/* DETECTED COLORS */}
            {hasArtwork && (
              <div className="p-4 border-b">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Artwork Colors
                  {(detecting || rerendering) && <span className="ml-2 text-primary font-normal normal-case">{detecting ? 'Detecting...' : 'Rendering...'}</span>}
                </p>

                {!detecting && detectedColors.length > 0 && (
                  <>
                    <p className="text-xs text-slate-400 mb-2">Click a color to select it, then pick a replacement below.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedColors.map((c) => {
                        const originalHex = c.hex || c;
                        const displayHex = getDisplayHex(originalHex);
                        const isSelected = selectedFromColor === originalHex;
                        const isReplaced = replacementMap[originalHex] && replacementMap[originalHex] !== originalHex;
                        return (
                          <button
                            key={originalHex}
                            onClick={() => setSelectedFromColor(prev => prev === originalHex ? null : originalHex)}
                            title={`${originalHex}${isReplaced ? ` → ${replacementMap[originalHex]}` : ''}`}
                            className={`relative w-9 h-9 rounded border-2 transition-all ${isSelected ? 'border-blue-500 scale-110 shadow-lg ring-2 ring-blue-300' : 'border-white hover:border-slate-400 shadow-sm'}`}
                            style={{ backgroundColor: displayHex }}
                          >
                            {isReplaced && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedFromColor && (
                      <p className="text-xs text-blue-600 mt-2">
                        Selected: <span className="font-mono">{getDisplayHex(selectedFromColor)}</span> — pick replacement below
                      </p>
                    )}
                    {!selectedFromColor && detectedColors.length === 1 && (
                      <p className="text-xs text-slate-400 mt-1">Single-color logo — pick any color below to recolor it.</p>
                    )}
                  </>
                )}

                {!detecting && detectedColors.length === 0 && hasArtwork && (
                  <p className="text-xs text-slate-400">No colors detected.</p>
                )}
              </div>
            )}

            {/* REPLACEMENT COLORS */}
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                {hasArtwork ? 'Pick Replacement Color' : 'Decoration Colors'}
              </p>

              <div className="flex rounded-md border overflow-hidden mb-3">
                <button onClick={() => { setColorType('thread'); setSelectedPaletteId(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${colorType === 'thread' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Thread
                </button>
                <button onClick={() => { setColorType('print'); setSelectedPaletteId(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${colorType === 'print' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Print
                </button>
              </div>

              {/* Decorator color grid */}
              {hasArtwork && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1.5">Decorator Colors</p>
                  <div className="flex flex-wrap gap-1">
                    {DECORATOR_COLORS.map(dc => (
                      <button
                        key={dc.hex}
                        onClick={() => applyReplacementColor(dc.hex)}
                        title={dc.name}
                        className="w-7 h-7 rounded border-2 border-white hover:border-slate-400 shadow-sm transition-all hover:scale-110"
                        style={{ backgroundColor: dc.hex, outline: dc.hex === '#ffffff' ? '1px solid #e2e8f0' : 'none' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom palette */}
              {filteredPalettes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">
                    {hasArtwork ? 'Custom Palette' : 'Color Palette'}
                  </p>
                  {filteredPalettes.length > 1 && (
                    <select value={activePalette?.id || ''} onChange={e => setSelectedPaletteId(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs bg-white mb-2">
                      {filteredPalettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {activePalette && (
                    <div className="flex flex-wrap gap-1">
                      {(activePalette.colors || []).map((c, i) => {
                        const isDecoSelected = selectedColors.some(sc => sc.code === c.code);
                        return (
                          <button
                            key={i}
                            onClick={() => hasArtwork ? applyReplacementColor(c.hex) : handleDecoColorClick(c)}
                            title={`${c.name} (${c.code})`}
                            className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${isDecoSelected && !hasArtwork ? 'border-primary scale-110 shadow-md' : 'border-white hover:border-slate-400 shadow-sm'}`}
                            style={{ backgroundColor: c.hex || '#ccc' }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!hasArtwork && filteredPalettes.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  No {colorType} palettes yet.<br />Add in <strong>Settings → Color Palettes</strong>.
                </p>
              )}
            </div>

            {/* Save */}
            <div className="p-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save Mockup'}
              </Button>
              <p className="text-xs text-slate-400 text-center mt-1.5">Saves mockup + colors to line item</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}