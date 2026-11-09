// High-resolution logo recolor utilities — SVG-aware, alpha-preserving, always renders from source

// Standard decorator colors always available
export const DECORATOR_COLORS = [
  { name: 'Black',        hex: '#1a1a1a' },
  { name: 'White',        hex: '#ffffff' },
  { name: 'Red',          hex: '#cc0000' },
  { name: 'Maroon',       hex: '#800000' },
  { name: 'Orange',       hex: '#e05c00' },
  { name: 'Yellow',       hex: '#f5c518' },
  { name: 'Gold',         hex: '#c9a600' },
  { name: 'Kelly Green',  hex: '#009a44' },
  { name: 'Forest Green', hex: '#2d5a27' },
  { name: 'Green',        hex: '#00843d' },
  { name: 'Navy',         hex: '#003087' },
  { name: 'Royal Blue',   hex: '#0057a8' },
  { name: 'Light Blue',   hex: '#6cb4e4' },
  { name: 'Purple',       hex: '#5c2d91' },
  { name: 'Pink',         hex: '#e75480' },
  { name: 'Gray',         hex: '#9e9e9e' },
  { name: 'Charcoal',     hex: '#4a4a4a' },
  { name: 'Brown',        hex: '#6b3a2a' },
  { name: 'Tan',          hex: '#c8a97e' },
];

/* ──────────────── COLOR HELPERS ──────────────── */

export function normalizeHex(hex) {
  if (!hex) return null;
  let v = hex.trim().toUpperCase();
  if (!v.startsWith('#')) v = '#' + v;
  if (v.length === 4) v = '#' + v[1]+v[1] + v[2]+v[2] + v[3]+v[3];
  return v.length === 7 ? v : null;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex)?.replace('#', '');
  if (!h) return [0, 0, 0];
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

export function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function colorDist(r1,g1,b1,r2,g2,b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

export function isSvgFile(file) {
  return file?.type === 'image/svg+xml' || file?.name?.toLowerCase().endsWith('.svg');
}

/* ──────────────── SVG HELPERS ──────────────── */

export function detectSvgColors(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const found = new Set();

  doc.querySelectorAll('*').forEach(el => {
    ['fill','stroke'].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && val !== 'none' && val !== 'transparent') {
        const hex = normalizeHex(val);
        if (hex) found.add(hex);
      }
    });
    // Also check inline style
    const style = el.getAttribute('style') || '';
    const fillMatch = style.match(/fill\s*:\s*(#[0-9a-fA-F]{3,6})/);
    const strokeMatch = style.match(/stroke\s*:\s*(#[0-9a-fA-F]{3,6})/);
    if (fillMatch) { const h = normalizeHex(fillMatch[1]); if (h) found.add(h); }
    if (strokeMatch) { const h = normalizeHex(strokeMatch[1]); if (h) found.add(h); }
  });

  return Array.from(found);
}

export function applyReplacementMapToSvg(originalSvgText, replacementMap) {
  if (!originalSvgText || !Object.keys(replacementMap).length) return originalSvgText;

  const parser = new DOMParser();
  const doc = parser.parseFromString(originalSvgText, 'image/svg+xml');

  doc.querySelectorAll('*').forEach(el => {
    ['fill','stroke'].forEach(attr => {
      const val = normalizeHex(el.getAttribute(attr));
      if (val && replacementMap[val]) {
        el.setAttribute(attr, replacementMap[val].toLowerCase());
      }
    });

    // Also patch inline style
    const style = el.getAttribute('style') || '';
    if (style) {
      let patched = style;
      for (const [from, to] of Object.entries(replacementMap)) {
        patched = patched.replace(new RegExp(from.replace('#','#?'), 'gi'), to.toLowerCase());
      }
      if (patched !== style) el.setAttribute('style', patched);
    }
  });

  return new XMLSerializer().serializeToString(doc);
}

export function svgTextToObjectUrl(svgText) {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

/* ──────────────── PNG HELPERS ──────────────── */

/**
 * Load a File or URL into an ImageBitmap (full resolution).
 */
export async function loadSourceToImageBitmap(source) {
  if (typeof source === 'string') {
    const res = await fetch(source);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }
  // File / Blob
  return createImageBitmap(source);
}

/**
 * Detect dominant visible colors in image data (pixel bucket clustering).
 */
export function detectPngColors(imageData, { alphaThreshold=8, tolerance=28, maxColors=10, minPixelCount=20 } = {}) {
  const { data, width, height } = imageData;
  const buckets = [];

  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] <= alphaThreshold) continue;
    const px = { r: data[i], g: data[i+1], b: data[i+2] };

    let matched = false;
    for (const b of buckets) {
      if (colorDist(px.r,px.g,px.b, b.avg.r,b.avg.g,b.avg.b) <= tolerance) {
        b.count++;
        b.sum.r += px.r; b.sum.g += px.g; b.sum.b += px.b;
        b.avg = { r: Math.round(b.sum.r/b.count), g: Math.round(b.sum.g/b.count), b: Math.round(b.sum.b/b.count) };
        matched = true;
        break;
      }
    }
    if (!matched) buckets.push({ count:1, sum:{...px}, avg:{...px} });
  }

  return buckets
    .filter(b => b.count >= minPixelCount)
    .sort((a,b) => b.count - a.count)
    .slice(0, maxColors)
    .map(b => ({
      hex: rgbToHex(b.avg.r, b.avg.g, b.avg.b),
      r: b.avg.r, g: b.avg.g, b: b.avg.b,
      pixelCount: b.count,
    }));
}

/**
 * Render a PNG from the original File, applying the replacement map.
 * Always redraws from source — never recolors an already-recolored preview.
 * Returns { dataUrl, canvas, width, height }
 */
export async function renderPngWithReplacements(originalFile, replacementMap, { outputScale=2, tolerance=28 } = {}) {
  const bitmap = await loadSourceToImageBitmap(originalFile);
  const w = Math.round(bitmap.width * outputScale);
  const h = Math.round(bitmap.height * outputScale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);

  const entries = Object.entries(replacementMap);
  if (entries.length > 0) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    const mappings = entries.map(([fromHex, toHex]) => {
      const [fr,fg,fb] = hexToRgb(fromHex);
      const [tr,tg,tb] = hexToRgb(toHex);
      return { fr,fg,fb,tr,tg,tb };
    });

    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] < 8) continue;
      const r=d[i], g=d[i+1], b=d[i+2];
      for (const m of mappings) {
        if (colorDist(r,g,b, m.fr,m.fg,m.fb) <= tolerance) {
          d[i]=m.tr; d[i+1]=m.tg; d[i+2]=m.tb;
          break;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return { dataUrl: canvas.toDataURL('image/png'), canvas, width: w, height: h };
}

/* ──────────────── LEGACY COMPAT (used by old MockupBuilderModal) ──────────────── */

export async function detectLogoColors(url, maxColors=8, tolerance=35) {
  try {
    const bitmap = await loadSourceToImageBitmap(url);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return detectPngColors(imageData, { tolerance, maxColors, minPixelCount: 20 });
  } catch {
    return [];
  }
}

export async function recolorLogo(url, colorMap, tolerance=40) {
  // colorMap: [{ fromHex, toHex }]
  const map = {};
  for (const { fromHex, toHex } of colorMap) {
    const f = normalizeHex(fromHex);
    const t = normalizeHex(toHex);
    if (f && t) map[f] = t;
  }
  const result = await renderPngWithReplacements(url, map, { outputScale: 2, tolerance });
  return result.dataUrl;
}