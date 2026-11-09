import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function ColorPaletteEditor({ palette, onSaved, onCancel }) {
  const [name, setName] = useState(palette?.name || '');
  const [paletteType, setPaletteType] = useState(palette?.palette_type || 'thread');
  const [colors, setColors] = useState(palette?.colors || []);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#000000');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const addColor = () => {
    if (!newCode && !newName) return;
    setColors(prev => [...prev, { code: newCode, name: newName, hex: newHex }]);
    setNewCode('');
    setNewName('');
    setNewHex('#000000');
  };

  const removeColor = (idx) => {
    setColors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImport = () => {
    // Parse CSV or tab-separated: code, name, hex
    // Each line: CODE, Name, #hex  OR  CODE\tName\t#hex
    const lines = importText.trim().split('\n').filter(l => l.trim());
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          code: parts[0] || '',
          name: parts[1] || parts[0] || '',
          hex: parts[2]?.startsWith('#') ? parts[2] : (parts[2] ? `#${parts[2]}` : '#888888'),
        });
      }
    }
    if (parsed.length === 0) { toast.error('No valid colors found. Use format: CODE, Name, #hex'); return; }
    setColors(prev => [...prev, ...parsed]);
    setImportText('');
    setShowImport(false);
    toast.success(`Imported ${parsed.length} colors`);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Please enter a palette name'); return; }
    setSaving(true);
    const data = { name, palette_type: paletteType, colors };
    let saved;
    if (palette?.id) {
      saved = await base44.entities.ColorPalette.update(palette.id, data);
    } else {
      saved = await base44.entities.ColorPalette.create(data);
    }
    toast.success('Palette saved!');
    onSaved(saved);
    setSaving(false);
  };

  return (
    <div>
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Settings
      </button>

      <h2 className="text-lg font-bold text-slate-800 mb-4">{palette ? 'Edit Palette' : 'New Color Palette'}</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Palette Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PolyNeon 40, CMYK Standard" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
          <select
            value={paletteType}
            onChange={e => setPaletteType(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white h-9"
          >
            <option value="thread">Thread Colors</option>
            <option value="print">Print / CMYK Colors</option>
          </select>
        </div>
      </div>

      {/* Add single color */}
      <div className="bg-slate-50 border rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add Color</p>
        <div className="flex items-center gap-2">
          <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g. 2800)" className="w-28 text-sm" />
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Color name" className="flex-1 text-sm" />
          <input type="color" value={newHex} onChange={e => setNewHex(e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
          <Button size="sm" onClick={addColor}><Plus className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Bulk import */}
      <div className="mb-4">
        <button
          onClick={() => setShowImport(!showImport)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Upload className="w-3.5 h-3.5" /> Bulk Import (CSV/Tab)
        </button>
        {showImport && (
          <div className="mt-2 border rounded-lg p-3 bg-slate-50">
            <p className="text-xs text-slate-500 mb-2">One color per line: <code className="bg-slate-100 px-1 rounded">CODE, Name, #hexcolor</code></p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"2800, Black, #1a1a1a\n2810, Navy Blue, #1b2a5c\n2820, Royal Blue, #1e3fbf"}
              className="w-full border rounded px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleImport}>Import Colors</Button>
              <Button size="sm" variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Color list */}
      {colors.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{colors.length} Colors</p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {colors.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
                <div className="w-6 h-6 rounded border shadow-sm flex-shrink-0" style={{ backgroundColor: c.hex || '#ccc' }} />
                <span className="text-xs font-mono text-slate-500 w-16 flex-shrink-0">{c.code}</span>
                <span className="text-sm text-slate-700 flex-1">{c.name}</span>
                <span className="text-xs font-mono text-slate-400">{c.hex}</span>
                <button onClick={() => removeColor(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Palette'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}