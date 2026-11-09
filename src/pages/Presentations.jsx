// src/pages/Presentations.jsx
// Routes: /presentations (list), /presentations/new (blank editor), /presentations/:id (editor)
// Uses existing ProductPickerModal + unchanged MockupBuilderModal. No pricing logic here:
// unit_price is copied from the picker exactly as QuoteBuilder does; quotes are created by
// shop.convertPresentation (server RPC) and priced by the existing quote builder.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shop } from '@/api/shopClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Search, Save, Trash2, ChevronUp, ChevronDown, Eye, Pencil, Printer,
  Loader2, Palette, Share2, AlertCircle, RefreshCw, X, ArrowRight,
} from 'lucide-react';
import ProductPickerModal from '@/components/qm/ProductPickerModal';
import MockupBuilderModal from '@/components/qm/MockupBuilderModal';
import SharePanel from '@/components/presentations/SharePanel';
import { fetchSSColors } from '@/components/qm/lineItemShared';

// Local copy of the decoration labels used by the quote line items (display/select only).
const DECO_OPTIONS = ['Embroidery', 'DTF Printing', 'Screen Printing', 'Heat Transfer', 'Sublimation', 'Laser Engraving', 'Other'];
const STATUSES = ['Draft', 'Presented', 'Archived'];
const FIELDS = ['name', 'customer_id', 'customer_name', 'customer_email', 'company_name', 'sales_rep',
  'follow_up_date', 'expiration_date', 'status', 'notes'];

const blank = () => ({
  name: '', customer_id: '', customer_name: '', customer_email: '', company_name: '', sales_rep: '',
  follow_up_date: '', expiration_date: '', status: 'Draft', notes: '', items: [],
});
const withIds = (rec) => ({
  ...blank(), ...rec,
  items: (rec.items || []).map((i) => (i.id ? i : { ...i, id: crypto.randomUUID() })),
});
const toPayload = (p) => {
  const out = {};
  FIELDS.forEach((f) => { out[f] = p[f] ?? ''; });
  out.items = (p.items || []).map((it, idx) => {
    const { _ssColors, ...rest } = it; // runtime-only, never persisted
    const price = rest.unit_price === '' || rest.unit_price == null ? 0 : Number(rest.unit_price);
    return { ...rest, unit_price: price, sort_order: idx };
  });
  return out;
};
// Mirrors QuoteBuilder.handleProductSelected field mapping (unit_price unchanged).
const itemFromProduct = (product, collection) => ({
  id: crypto.randomUUID(),
  product_id: product.id || null,
  product_name: product.product_name || product.name || '',
  style_number: product.style_number || product.styleName || '',
  supplier_name: product.supplier_name || '',
  color: product.color || '',
  description: product.description || '',
  decoration_method: '', sizes: [],
  unit_price: product.unit_price || product.base_price || 0,
  total_quantity: 0, line_total: 0, discount_percent: 0, discounted_unit_price: 0,
  notes: '', mockups: [], item_type: 'catalog',
  product_image_url: product.product_image_url || product.image_url || '',
  collection: collection || '',
});
// Customer-facing whitelist. Nothing else may reach the preview/print view.
const toPublicItem = (it) => ({
  key: it.id,
  collection: it.collection || '',
  product_name: it.product_name || '',
  style_number: it.style_number || '',
  color: it.color || '',
  description: it.description || '',
  decoration_method: it.decoration_method || '',
  images: (it.mockups?.length ? it.mockups.map(m=>m?.url) : [it.product_image_url]).filter(u=>typeof u === 'string' && u),
  unit_price: Number(it.unit_price) || 0,
});
const validate = (p) => {
  const e = [];
  if (!p.name.trim()) e.push('Presentation name is required.');
  if (p.name.length > 200) e.push('Presentation name must be 200 characters or fewer.');
  if (p.follow_up_date && p.expiration_date && p.follow_up_date > p.expiration_date)
    e.push('Follow-up date must be on or before the expiration date.');
  p.items.forEach((it, i) => {
    const label = it.product_name || `Item ${i + 1}`;
    if (!String(it.product_name || '').trim()) e.push(`Item ${i + 1}: product name is required.`);
    const n = Number(it.unit_price);
    if (it.unit_price !== '' && (!Number.isFinite(n) || n < 0)) e.push(`${label}: unit price must be a number of 0 or more.`);
  });
  return e;
};
const errMsg = (e) => e?.message || e?.data?.message || e?.error?.message || 'Something went wrong.';
const today = () => new Date().toLocaleDateString('en-CA', {timeZone:'America/Chicago'});
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const groupByCollection = (items) => {
  const groups = [];
  items.forEach((it) => {
    const key = it.collection || '';
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(it);
  });
  return groups;
};

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .pres-print, .pres-print * { visibility: visible !important; }
  .pres-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 0 !important; }
  .pres-no-print { display: none !important; }
  .pres-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
  @page { margin: 0.5in; }
}`;

function ErrorBox({ message, onRetry, retryLabel = 'Try again' }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="mr-1 h-3.5 w-3.5" />{retryLabel}</Button>
      )}
    </div>
  );
}

const Label = ({ children }) => <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#1F2A44]/60">{children}</label>;
const textareaCls = 'w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A97E]';

export default function Presentations() {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!id) return <PresentationList navigate={navigate} />;
  return <PresentationEditor id={id} navigate={navigate} />;
}

/* ------------------------------------------------------------------ list */
function PresentationList({ navigate }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Open');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows((await shop.entities.Presentation.list('-created_date')) || []); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const t = today();
  const visible = rows.filter((r) => {
    const st = r.status || 'Draft';
    if (filter === 'Open' && ['Archived', 'Converted'].includes(st)) return false;
    if (!['Open', 'All'].includes(filter) && st !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.name, r.customer_name, r.company_name, r.sales_rep].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2A44]">Presentations</h1>
            <p className="mt-1 text-sm text-[#1F2A44]/60">Curated product collections with finished mockups for customers.</p>
          </div>
          <Button className="bg-[#1F2A44] hover:bg-[#2c3b5e]" onClick={() => navigate('/presentations/new')}>
            <Plus className="mr-1 h-4 w-4" />New presentation
          </Button>
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F2A44]/40" />
            <Input className="bg-white pl-9" placeholder="Search name, customer, company, rep" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm">
            {['Open', 'Draft', 'Presented', 'Converted', 'Archived', 'All'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm ${filter === f ? 'bg-[#1F2A44] text-white' : 'text-[#1F2A44]/70 hover:bg-[#F3ECE0]'}`}>{f}</button>
            ))}
          </div>
        </div>
        {error && <ErrorBox message={`Couldn't load presentations: ${error}`} onRetry={load} />}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[#1F2A44]/60"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
        ) : !error && visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C8A97E]/60 bg-white py-20 text-center text-[#1F2A44]/60">
            {rows.length === 0 ? 'No presentations yet.' : 'No presentations match these filters.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => {
              const due = r.follow_up_date && r.follow_up_date <= t && !['Archived', 'Converted'].includes(r.status);
              const expired = r.expiration_date && r.expiration_date < t;
              const thumb = (r.items || []).flatMap((i) => (i.mockups || []).map((m) => m?.url)).find(Boolean);
              return (
                <button key={r.id} onClick={() => navigate(`/presentations/${r.id}`)}
                  className="group overflow-hidden rounded-2xl border border-[#E8DCC8] bg-white text-left shadow-sm transition hover:shadow-md">
                  <div className="flex h-36 items-center justify-center bg-[#F3ECE0]">
                    {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain p-2" /> : <Palette className="h-8 w-8 text-[#C8A97E]" />}
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-[#1F2A44]">{r.name || 'Untitled'}</h3>
                      <span className="shrink-0 rounded-full bg-[#F3ECE0] px-2 py-0.5 text-xs text-[#1F2A44]">{r.status || 'Draft'}</span>
                    </div>
                    <p className="truncate text-sm text-[#1F2A44]/70">{r.company_name || r.customer_name || 'No customer selected'}</p>
                    <p className="text-xs text-[#1F2A44]/50">{(r.items || []).length} item(s){r.sales_rep ? ` · ${r.sales_rep}` : ''}</p>
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      {due && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Follow-up due {r.follow_up_date}</span>}
                      {expired && <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Expired {r.expiration_date}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- editor */
function PresentationEditor({ id, navigate }) {
  const isNew = id === 'new';
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(blank);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [errors, setErrors] = useState([]);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customersError, setCustomersError] = useState(null);
  const [custSearch, setCustSearch] = useState('');
  const [showCust, setShowCust] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCollection, setPickerCollection] = useState('');
  const [newCollection, setNewCollection] = useState('');
  const [mockupFor, setMockupFor] = useState(null);
  const [colorsLoadingFor, setColorsLoadingFor] = useState(null);
  const [ssColors, setSsColors] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [preview, setPreview] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const skipLoad = useRef(null);
  const custRef = useRef(null);

  const load = useCallback(async () => {
    if (isNew) { setSaved(null); setDraft(blank()); setLoading(false); setLoadError(null); return; }
    if (skipLoad.current === id) { skipLoad.current = null; return; }
    setLoading(true); setLoadError(null);
    try {
      const [rec] = (await shop.entities.Presentation.filter({ id })) || [];
      if (!rec) throw new Error('Presentation not found, or you do not have access to it.');
      const n = withIds(rec);
      setSaved(n); setDraft(n); setSelected(new Set()); setErrors([]); setSaveError(null);
      setCustSearch(n.customer_name || n.company_name || '');
    } catch (e) { setLoadError(errMsg(e)); }
    finally { setLoading(false); }
  }, [id, isNew]);
  useEffect(() => { load(); }, [load]);

  const loadCustomers = useCallback(async () => {
    setCustomersError(null);
    try { setCustomers((await shop.entities.Customer.list('-created_date')) || []); }
    catch (e) { setCustomersError(errMsg(e)); }
  }, []);
  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    const h = (e) => { if (custRef.current && !custRef.current.contains(e.target)) setShowCust(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(saved || blank())),
    [draft, saved],
  );
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    const onLink = e => {
      const anchor=e.target.closest?.('a[href]');
      if(!anchor || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || anchor.target==='_blank')return;
      const url=new URL(anchor.href,window.location.href);
      if(url.origin===window.location.origin && url.pathname!==window.location.pathname && !window.confirm('You have unsaved changes. Leave without saving?')){e.preventDefault();e.stopPropagation();}
    };
    document.addEventListener('click',onLink,true);
    return () => {window.removeEventListener('beforeunload',h);document.removeEventListener('click',onLink,true);};
  }, [dirty]);

  const go = (to) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate(to);
  };

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const updateItem = (itemId, patch) =>
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  const removeItem = (it) => {
    if (!window.confirm(`Remove "${it.product_name || 'this item'}" from the presentation?`)) return;
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== it.id) }));
    setSelected((s) => { const n = new Set(s); n.delete(it.id); return n; });
  };
  const moveItem = (itemId, dir) => setDraft((d) => {
    const items = [...d.items];
    const idx = items.findIndex((i) => i.id === itemId);
    const col = items[idx]?.collection || '';
    let j = idx + dir;
    while (j >= 0 && j < items.length && (items[j].collection || '') !== col) j += dir;
    if (idx < 0 || j < 0 || j >= items.length) return d;
    [items[idx], items[j]] = [items[j], items[idx]];
    return { ...d, items };
  });
  const toggleSelect = (itemId) => setSelected((s) => { const n = new Set(s); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });

  const filteredCustomers = customers.filter((c) => {
    if (!custSearch) return true;
    const s = custSearch.toLowerCase();
    return [c.contact_name, c.company_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(s));
  }).slice(0, 50);
  const selectCustomer = (c) => {
    setDraft((d) => ({ ...d, customer_id: c.id, customer_name: c.contact_name || '', customer_email: c.email || '', company_name: c.company_name || '' }));
    setCustSearch(c.contact_name || c.company_name || '');
    setShowCust(false);
  };
  const clearCustomer = () => {
    setDraft((d) => ({ ...d, customer_id: '', customer_name: '', customer_email: '', company_name: '' }));
    setCustSearch('');
  };

  const openPicker = (collection) => { setPickerCollection(collection || ''); setPickerOpen(true); };
  const handleProductSelected = (product) => {
    const item = itemFromProduct(product, pickerCollection);
    setDraft((d) => ({ ...d, items: [...d.items, item] }));
    if (product._ssColors?.length) setSsColors((m) => ({ ...m, [item.id]: product._ssColors }));
  };

  const openMockup = async (it) => {
    if (!ssColors[it.id] && it.style_number) {
      setColorsLoadingFor(it.id);
      try { const colors = await fetchSSColors(it.style_number); setSsColors((m) => ({ ...m, [it.id]: colors || [] })); }
      catch { setSsColors((m) => ({ ...m, [it.id]: [] })); }
      finally { setColorsLoadingFor(null); }
    }
    setMockupFor(it.id);
  };
  const mockupItem = draft.items.find((i) => i.id === mockupFor) || null;

  const save = async () => {
    const errs = validate(draft);
    setErrors(errs);
    if (errs.length) { toast.error('Please fix the listed issues before saving.'); return; }
    setSaving(true); setSaveError(null);
    const payload = toPayload(draft);
    const wasNew = !saved?.id;
    try {
      const rec = wasNew
        ? await shop.entities.Presentation.create(payload)
        : await shop.entities.Presentation.update(saved.id, { ...payload, _version: saved._version });
      if (!rec?.id) throw new Error('The server did not return the saved presentation.');
      const n = withIds(rec);
      setSaved(n);
      // Keep edits made while the save was in flight; otherwise adopt the server copy.
      setDraft((d) => (JSON.stringify(toPayload(d)) === JSON.stringify(payload) ? n : d));
      toast.success('Presentation saved');
      if (wasNew) { skipLoad.current = rec.id; navigate(`/presentations/${rec.id}`, { replace: true }); }
    } catch (e) {
      setSaveError(errMsg(e));
      toast.error('Save failed. Your changes are still here.');
    } finally { setSaving(false); }
  };

  const reloadLatest = () => {
    if (dirty && !window.confirm('Reload the latest saved version? Your unsaved changes will be lost.')) return;
    skipLoad.current = null;
    load();
  };

  const selectedIds = draft.items.filter((i) => selected.has(i.id)).map((i) => i.id);
  const convertBlocker = !saved?.id ? 'Save the presentation first.'
    : dirty ? 'Save your changes first. Quotes are created from the saved version.'
    : selectedIds.length === 0 ? 'Select the items to include in the quote.'
    : null;
  const convert = async () => {
    if (convertBlocker || converting || saving) return;
    if (!window.confirm(`Create a draft quote from ${selectedIds.length} item(s)? The quote builder calculates totals when the quote is saved.`)) return;
    setConverting(true); setConvertError(null);
    try {
      const quoteId = await shop.convertPresentation(saved.id, selectedIds, saved._version);
      if (!quoteId || typeof quoteId !== 'string') throw new Error('Conversion did not return a quote ID.');
      toast.success('Draft quote created');
      navigate(`/quotes/${quoteId}`);
    } catch (e) { setConvertError(errMsg(e)); }
    finally { setConverting(false); }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] text-[#1F2A44]/60"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading presentation…</div>;
  }
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-xl space-y-4">
          <ErrorBox message={loadError} onRetry={load} />
          <Button variant="outline" onClick={() => navigate('/presentations')}><ArrowLeft className="mr-1 h-4 w-4" />All presentations</Button>
        </div>
      </div>
    );
  }

  const groups = groupByCollection(draft.items);
  const collectionNames = groups.map((g) => g.key).filter(Boolean);
  const statusOptions = STATUSES.includes(draft.status) ? STATUSES : [draft.status, ...STATUSES];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <style>{PRINT_CSS}</style>

      {/* Header */}
      <div className="pres-no-print sticky top-0 z-20 border-b border-[#E8DCC8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
          <button onClick={() => go('/presentations')} className="flex items-center text-sm text-[#1F2A44]/70 hover:text-[#1F2A44]">
            <ArrowLeft className="mr-1 h-4 w-4" />Presentations
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-[#1F2A44]">{draft.name || (isNew ? 'New presentation' : 'Untitled')}</h1>
          {dirty && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">Unsaved changes</span>}
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? <><Pencil className="mr-1 h-4 w-4" />Edit</> : <><Eye className="mr-1 h-4 w-4" />Customer preview</>}
          </Button>
          <Button className="bg-[#1F2A44] hover:bg-[#2c3b5e]" onClick={save} disabled={saving || (!dirty && !!saved?.id)}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {saved?.id ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-8">
        <div className="pres-no-print space-y-3">
          {saveError && <ErrorBox message={`Save failed: ${saveError}`} onRetry={save} retryLabel="Retry save" />}
          {saveError && saved?.id && (
            <p className="text-xs text-[#1F2A44]/60">
              If someone else changed this presentation, <button className="underline" onClick={reloadLatest}>reload the latest version</button>. You'll lose your unsaved changes.
            </p>
          )}
          {errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ul className="list-disc space-y-0.5 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
        </div>

        {preview ? (
          <PublicPreview draft={draft} dirty={dirty} showPrices={showPrices} setShowPrices={setShowPrices} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Items */}
            <div className="space-y-6">
              {groups.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#C8A97E]/60 bg-white py-16 text-center">
                  <p className="mb-4 text-[#1F2A44]/60">Add products to start this presentation.</p>
                  <Button className="bg-[#1F2A44] hover:bg-[#2c3b5e]" onClick={() => openPicker('')}><Plus className="mr-1 h-4 w-4" />Add product</Button>
                </div>
              )}
              {groups.map((g) => (
                <section key={g.key || '__none'} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C8A97E]">{g.key || 'Uncategorized'}</h2>
                    <Button size="sm" variant="ghost" onClick={() => openPicker(g.key)}><Plus className="mr-1 h-3.5 w-3.5" />Add to {g.key || 'list'}</Button>
                  </div>
                  {g.items.map((it, gi) => (
                    <ItemEditor key={it.id} it={it} first={gi === 0} last={gi === g.items.length - 1}
                      selected={selected.has(it.id)} onToggle={() => toggleSelect(it.id)}
                      onChange={(patch) => updateItem(it.id, patch)} onMove={(dir) => moveItem(it.id, dir)}
                      onRemove={() => removeItem(it)} onMockup={() => openMockup(it)}
                      colorsLoading={colorsLoadingFor === it.id} collectionNames={collectionNames} />
                  ))}
                </section>
              ))}
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E8DCC8] bg-white p-4">
                <Input className="max-w-xs" placeholder="New collection name (e.g. Polos)" value={newCollection} onChange={(e) => setNewCollection(e.target.value)} />
                <Button variant="outline" disabled={!newCollection.trim()} onClick={() => { openPicker(newCollection.trim()); setNewCollection(''); }}>
                  <Plus className="mr-1 h-4 w-4" />Add collection with a product
                </Button>
                {groups.length > 0 && <Button variant="ghost" onClick={() => openPicker('')}><Plus className="mr-1 h-4 w-4" />Add uncategorized product</Button>}
              </div>
            </div>

            {/* Details + conversion */}
            <aside className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-[#E8DCC8] bg-white p-5">
                <div><Label>Presentation name *</Label><Input value={draft.name} maxLength={200} onChange={(e) => setField('name', e.target.value)} /></div>
                <div ref={custRef} className="relative">
                  <Label>Customer</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Search customers" value={custSearch} onFocus={() => setShowCust(true)}
                      onChange={(e) => { setCustSearch(e.target.value); setShowCust(true); }} />
                    {draft.customer_id && <Button size="icon" variant="ghost" onClick={clearCustomer} title="Clear customer"><X className="h-4 w-4" /></Button>}
                  </div>
                  {draft.customer_id && <p className="mt-1 text-xs text-[#1F2A44]/60">{[draft.company_name, draft.customer_email].filter(Boolean).join(' · ')}</p>}
                  {customersError && <div className="mt-2"><ErrorBox message={`Couldn't load customers: ${customersError}`} onRetry={loadCustomers} /></div>}
                  {showCust && !customersError && (
                    <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[#E8DCC8] bg-white shadow-lg">
                      {filteredCustomers.length === 0 ? <div className="p-3 text-sm text-[#1F2A44]/50">No matching customers</div>
                        : filteredCustomers.map((c) => (
                          <button key={c.id} onClick={() => selectCustomer(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F3ECE0]">
                            <div className="font-medium text-[#1F2A44]">{c.contact_name || c.company_name}</div>
                            <div className="text-xs text-[#1F2A44]/50">{[c.company_name, c.email].filter(Boolean).join(' · ')}</div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div><Label>Sales rep</Label><Input value={draft.sales_rep} onChange={(e) => setField('sales_rep', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Follow-up</Label><Input type="date" value={draft.follow_up_date || ''} onChange={(e) => setField('follow_up_date', e.target.value)} /></div>
                  <div><Label>Expires</Label><Input type="date" value={draft.expiration_date || ''} onChange={(e) => setField('expiration_date', e.target.value)} /></div>
                </div>
                <div>
                  <Label>Status</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={draft.status} onChange={(e) => setField('status', e.target.value)}>
                    {statusOptions.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><Label>Internal notes (never shown to customer)</Label><textarea rows={3} className={textareaCls} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#E8DCC8] bg-white p-5">
                <h3 className="font-semibold text-[#1F2A44]">Create quote</h3>
                <div className="flex items-center justify-between text-sm text-[#1F2A44]/70">
                  <span>{selectedIds.length} of {draft.items.length} selected</span>
                  {draft.items.length > 0 && (
                    <button className="underline" onClick={() => setSelected(selectedIds.length === draft.items.length ? new Set() : new Set(draft.items.map((i) => i.id)))}>
                      {selectedIds.length === draft.items.length ? 'Clear' : 'Select all'}
                    </button>
                  )}
                </div>
                <Button className="w-full bg-[#C8A97E] text-[#1F2A44] hover:bg-[#b99868]" disabled={!!convertBlocker || converting || saving} onClick={convert}>
                  {converting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />}Create draft quote
                </Button>
                {convertBlocker && <p className="text-xs text-[#1F2A44]/60">{convertBlocker}</p>}
                {convertError && <ErrorBox message={`Quote was not created: ${convertError}`} onRetry={convert} />}
              </div>

              <SharePanel presentation={saved} disabled={dirty || saving} />
            </aside>
          </div>
        )}
      </div>

      <ProductPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleProductSelected} />
      {mockupItem && (
        <MockupBuilderModal open={!!mockupItem} onClose={() => setMockupFor(null)} item={mockupItem}
          ssColors={ssColors[mockupItem.id] || []}
          onSave={(r) => updateItem(mockupItem.id, {
            product_image_url: r?.product_image_url ?? mockupItem.product_image_url,
            mockups: r?.mockups ?? mockupItem.mockups,
            decoration_colors: r?.decoration_colors ?? mockupItem.decoration_colors,
          })} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ item editor */
function ItemEditor({ it, first, last, selected, onToggle, onChange, onMove, onRemove, onMockup, colorsLoading, collectionNames }) {
  const mockups = (it.mockups || []).filter((m) => m?.url);
  const listId = `collections-${it.id}`;
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${selected ? 'border-[#C8A97E] ring-1 ring-[#C8A97E]' : 'border-[#E8DCC8]'}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-44">
          <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-[#F3ECE0]">
            {mockups.length ? <img src={mockups[mockups.length - 1].url} alt="" className="h-full w-full object-contain p-1" />
              : it.product_image_url ? <img src={it.product_image_url} alt="" className="h-full w-full object-contain p-1 opacity-70" />
              : <Palette className="h-8 w-8 text-[#C8A97E]" />}
          </div>
          {!mockups.length && <p className="mt-1 text-center text-[11px] text-[#1F2A44]/50">No finished mockup yet</p>}
          {mockups.length > 1 && (
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {mockups.map((m, i) => <img key={`${m.url}-${i}`} src={m.url} alt={m.name || ''} title={m.name || ''} className="h-10 w-10 shrink-0 rounded border border-[#E8DCC8] object-contain" />)}
            </div>
          )}
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={onMockup} disabled={colorsLoading}>
            {colorsLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Palette className="mr-1 h-3.5 w-3.5" />}
            {mockups.length ? 'Add mockup' : 'Create mockup'}
          </Button>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <label className="flex items-center gap-2 text-sm text-[#1F2A44]">
              <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4 accent-[#1F2A44]" />Include in quote
            </label>
            <div className="ml-auto flex gap-1">
              <Button size="icon" variant="ghost" disabled={first} onClick={() => onMove(-1)} title="Move up"><ChevronUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" disabled={last} onClick={() => onMove(1)} title="Move down"><ChevronDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={onRemove} title="Remove"><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Product *</Label><Input value={it.product_name || ''} onChange={(e) => onChange({ product_name: e.target.value })} /></div>
            <div><Label>Style</Label><Input value={it.style_number || ''} onChange={(e) => onChange({ style_number: e.target.value })} /></div>
            <div><Label>Color</Label><Input value={it.color || ''} onChange={(e) => onChange({ color: e.target.value })} /></div>
            <div>
              <Label>Decoration</Label>
              <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={it.decoration_method || ''} onChange={(e) => onChange({ decoration_method: e.target.value })}>
                <option value="">Not set</option>
                {[...new Set([...(it.decoration_method && !DECO_OPTIONS.includes(it.decoration_method) ? [it.decoration_method] : []), ...DECO_OPTIONS])].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label>Sell unit price (from product picker)</Label>
              <Input type="number" min="0" step="0.01" value={it.unit_price ?? ''} onChange={(e) => onChange({ unit_price: e.target.value })} />
            </div>
            <div>
              <Label>Collection</Label>
              <Input list={listId} value={it.collection || ''} placeholder="Uncategorized" onChange={(e) => onChange({ collection: e.target.value })} />
              <datalist id={listId}>{collectionNames.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div><Label>Customer-facing description</Label><textarea rows={2} className={textareaCls} value={it.description || ''} onChange={(e) => onChange({ description: e.target.value })} /></div>
          <div><Label>Internal notes (never shown to customer)</Label><textarea rows={2} className={textareaCls} value={it.notes || ''} onChange={(e) => onChange({ notes: e.target.value })} /></div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- customer-facing preview */
function PublicPreview({ draft, dirty, showPrices, setShowPrices }) {
  // Only whitelisted fields are derived here; customer contact data, notes, supplier and cost are never read.
  const items = draft.items.map(toPublicItem);
  const groups = groupByCollection(items);
  return (
    <div className="space-y-4">
      <div className="pres-no-print flex flex-wrap items-center gap-3 rounded-xl border border-[#E8DCC8] bg-white p-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} className="accent-[#1F2A44]" />Show sell unit prices</label>
        {dirty && <span className="text-amber-700">Previewing unsaved changes</span>}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print / Save PDF</Button>
      </div>
      <div className="pres-print rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <header className="mb-8 border-b-2 border-[#C8A97E] pb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C8A97E]">4R Stitching Co.</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#1F2A44]">{draft.name || 'Presentation'}</h1>
          {draft.expiration_date && <p className="mt-1 text-sm text-[#1F2A44]/60">Valid through {draft.expiration_date}</p>}
        </header>
        {items.length === 0 ? <p className="text-[#1F2A44]/60">No items yet.</p> : groups.map((g) => (
          <section key={g.key || '__none'} className="mb-10">
            {g.key && <h2 className="mb-4 text-lg font-semibold text-[#1F2A44]">{g.key}</h2>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => (
                <article key={p.key} className="pres-card overflow-hidden rounded-xl border border-[#E8DCC8]">
                  <div className="flex aspect-square items-center justify-center bg-[#FAF7F2]">
                    {p.images.length ? <img src={p.images[p.images.length - 1]} alt={p.product_name} className="h-full w-full object-contain p-3" />
                      : <span className="text-xs text-[#1F2A44]/40">Mockup coming soon</span>}
                  </div>
                  {p.images.length > 1 && (
                    <div className="flex gap-1 px-3 pt-2">
                      {p.images.slice(0, -1).map((u, i) => <img key={`${u}-${i}`} src={u} alt="" className="h-12 w-12 rounded border border-[#E8DCC8] object-contain" />)}
                    </div>
                  )}
                  <div className="space-y-1 p-4">
                    <h3 className="font-semibold text-[#1F2A44]">{p.product_name}</h3>
                    <p className="text-xs text-[#1F2A44]/60">{[p.style_number, p.color, p.decoration_method].filter(Boolean).join(' · ')}</p>
                    {p.description && <p className="whitespace-pre-line pt-1 text-sm text-[#1F2A44]/80">{p.description}</p>}
                    {showPrices && p.unit_price > 0 && <p className="pt-2 text-sm font-semibold text-[#1F2A44]">{money(p.unit_price)} <span className="font-normal text-[#1F2A44]/50">/ unit</span></p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        <footer className="mt-6 border-t border-[#E8DCC8] pt-4 text-xs text-[#1F2A44]/50">
          Mockups are representations; final colors and placement are confirmed at art approval. Prices shown are per unit and subject to final quote.
        </footer>
      </div>
    </div>
  );
}
