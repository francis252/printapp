import { useState, useEffect } from 'react';
import {savePreferences} from '@/components/PreferencesBridge';
import { base44 } from '@/api/base44Client';
import { Palette, Plus, Trash2, Edit2, Settings as SettingsIcon, Package, DollarSign, Users, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ColorPaletteEditor from '@/components/qm/ColorPaletteEditor';
import DrawerPanel from '@/components/ui/DrawerPanel';

const NAV_ITEMS = [
  { id: 'general',      label: 'General',      icon: SettingsIcon },
  { id: 'palettes',     label: 'Color Palettes', icon: Palette },
  { id: 'pricing',      label: 'Pricing',       icon: DollarSign },
  { id: 'users',        label: 'Users',         icon: Users },
  { id: 'integrations', label: 'Integrations',  icon: Plug },
];

// ── General ──────────────────────────────────────────────────────────────────
const GENERAL_DEFAULTS = {
  company_name: '', contact_name: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '', country: 'US',
  website: '',
};

function GeneralSettings() {
  const [info, setInfo] = useState(() => {
    try { return { ...GENERAL_DEFAULTS, ...JSON.parse(localStorage.getItem('qm_company_info') || '{}') }; }
    catch { return GENERAL_DEFAULTS; }
  });

  const set = (field, val) => setInfo(prev => ({ ...prev, [field]: val }));

  const save = async () => {
    try {await savePreferences({qm_company_info:JSON.stringify(info)});toast.success('Company info saved!');}
    catch(e){toast.error(e.message);}
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">General</h2>
      <p className="text-sm text-slate-400 mb-6">Company info used on quotes, emails, and shipping.</p>

      <div className="bg-white border rounded-xl p-6 space-y-5 max-w-xl">
        {/* Company */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Company</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Company Name</label>
              <input value={info.company_name} onChange={e => set('company_name', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="4R Stitching Co." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Contact Name</label>
              <input value={info.contact_name} onChange={e => set('contact_name', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Website</label>
              <input value={info.website} onChange={e => set('website', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="www.yoursite.com" />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Contact */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Email</label>
              <input type="email" value={info.email} onChange={e => set('email', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Phone</label>
              <input value={info.phone} onChange={e => set('phone', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="(555) 000-0000" />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Address */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Address</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Street Address</label>
              <input value={info.address} onChange={e => set('address', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="123 Main St" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">City</label>
              <input value={info.city} onChange={e => set('city', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="City" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">State</label>
                <input value={info.state} onChange={e => set('state', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="TX" maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">ZIP</label>
                <input value={info.zip} onChange={e => set('zip', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="75001" />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={save}>Save Company Info</Button>
      </div>
    </div>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const DEFAULT_TIERS = [];

function PricingSettings() {
  const [markup, setMarkup] = useState(() => parseFloat(localStorage.getItem('qm_markup') || '125'));
  const [roundUp, setRoundUp] = useState(() => localStorage.getItem('qm_roundup') === 'true');
  const [tiers, setTiers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qm_markup_tiers') || '[]'); } catch { return []; }
  });

  const addTier = () => {
    setTiers(prev => [...prev, { from: 0, to: '', markup: 125 }]);
  };

  const updateTier = (i, field, val) => {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };

  const removeTier = (i) => {
    setTiers(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    try {await savePreferences({qm_markup:String(markup),qm_roundup:String(roundUp),qm_markup_tiers:JSON.stringify(tiers)});toast.success('Pricing settings saved!');}
    catch(e){toast.error(e.message);}
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Pricing</h2>
      <p className="text-sm text-slate-400 mb-6">Default markup rules for all products.</p>
      <div className="bg-white border rounded-xl p-6 space-y-5 max-w-xl">

        {/* Default markup */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Default Markup %</label>
          <p className="text-xs text-slate-400 mb-2">Applied when no tier matches the product cost.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              value={markup}
              onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
              className="w-28 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </div>

        {/* Markup Tiers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Markup Tiers</label>
              <p className="text-xs text-slate-400 mt-0.5">Cost-based ranges that override the default markup.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addTier} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add Tier
            </Button>
          </div>

          {tiers.length === 0 ? (
            <div className="border border-dashed rounded-lg px-4 py-5 text-center text-xs text-slate-400">
              No tiers set — default markup applies to all products.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
                <span className="text-xs text-slate-400 font-medium">Cost From ($)</span>
                <span className="text-xs text-slate-400 font-medium">Cost To ($)</span>
                <span className="text-xs text-slate-400 font-medium">Markup %</span>
                <span className="w-7" />
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.from}
                      onChange={e => updateTier(i, 'from', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.to}
                      onChange={e => updateTier(i, 'to', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="No limit"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={tier.markup}
                      onChange={e => updateTier(i, 'markup', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="125"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <button
                    onClick={() => removeTier(i)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Round up toggle */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Round Up to Nearest $1</label>
          <button
            onClick={() => setRoundUp(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roundUp ? 'bg-primary' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roundUp ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          Example: cost $6.00 × {markup}% = <strong className="text-slate-600">${roundUp ? Math.ceil(6 * markup / 100).toFixed(2) : (6 * markup / 100).toFixed(2)}</strong>
        </div>

        <Button onClick={save}>Save Pricing Settings</Button>
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersSettings() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Users</h2>
      <p className="text-sm text-slate-400 mb-6">Manage team members and roles.</p>
      <div className="bg-white border rounded-xl p-6">
        <a className="text-sm text-primary underline" href="/team">View shop members and roles</a>
      </div>
    </div>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────
function IntegrationsSettings() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Integrations</h2>
      <p className="text-sm text-slate-400 mb-6">Third-party integrations and API keys.</p>
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between py-3 border-b last:border-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">S&S Activewear</p>
            <p className="text-xs text-slate-400">Live product search and pricing</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{import.meta.env.VITE_SHOP_INTEGRATIONS_ENABLED === 'true' ? 'Server adapter enabled' : 'Migration pending'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Color Palettes ────────────────────────────────────────────────────────────
function PalettesSettings() {
  const [palettes, setPalettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPalette, setEditingPalette] = useState(null);

  useEffect(() => {
    base44.entities.ColorPalette.list('-created_date', 50).then(data => {
      setPalettes(data || []);
      setLoading(false);
    });
  }, []);

  const openNew = () => { setEditingPalette(null); setDrawerOpen(true); };
  const openEdit = (p) => { setEditingPalette(p); setDrawerOpen(true); };

  const handleSaved = (saved) => {
    setPalettes(prev => {
      const exists = prev.find(p => p.id === saved.id);
      return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev];
    });
    setDrawerOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this palette?')) return;
    await base44.entities.ColorPalette.delete(id);
    setPalettes(prev => prev.filter(p => p.id !== id));
    toast.success('Palette deleted.');
  };

  const threadPalettes = palettes.filter(p => p.palette_type === 'thread');
  const printPalettes = palettes.filter(p => p.palette_type === 'print');

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-0.5">Color Palettes</h2>
          <p className="text-sm text-slate-400">Thread and print color libraries used in the Mockup Builder.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Palette
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading...</div>
      ) : palettes.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white border rounded-xl">
          <Palette className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-600">No palettes yet</p>
          <p className="text-sm mt-1 mb-4">Create thread or print color palettes to use in the Mockup Builder</p>
          <Button onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" /> Create First Palette</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {[{ label: 'Thread Color Palettes', items: threadPalettes }, { label: 'Print / CMYK Palettes', items: printPalettes }]
            .filter(g => g.items.length > 0)
            .map(group => (
              <div key={group.label} className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group.label}</p>
                </div>
                <div className="divide-y">
                  {group.items.map(palette => (
                    <div key={palette.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{palette.name}</p>
                        <p className="text-xs text-slate-400">{(palette.colors || []).length} colors</p>
                      </div>
                      <div className="flex gap-0.5 flex-wrap max-w-52">
                        {(palette.colors || []).slice(0, 24).map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded border border-white shadow-sm" style={{ backgroundColor: c.hex || '#ccc' }} title={`${c.name} (${c.code})`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(palette)} className="h-8 w-8 p-0">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(palette.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Palette editor drawer */}
      <DrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingPalette ? 'Edit Palette' : 'New Color Palette'}
        width={560}
      >
        <div className="p-6">
          <ColorPaletteEditor
            palette={editingPalette}
            onSaved={handleSaved}
            onCancel={() => setDrawerOpen(false)}
          />
        </div>
      </DrawerPanel>
    </>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
const PANELS = {
  general: <GeneralSettings />,
  palettes: <PalettesSettings />,
  pricing: <PricingSettings />,
  users: <UsersSettings />,
  integrations: <IntegrationsSettings />,
};

export default function Settings() {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="flex h-full min-h-screen">
      {/* Left nav */}
      <div className="w-52 flex-shrink-0 bg-white border-r flex flex-col pt-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-5 mb-3">Settings</p>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, icon: ItemIcon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                  active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ItemIcon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl">
          {PANELS[activeSection]}
        </div>
      </div>
    </div>
  );
}