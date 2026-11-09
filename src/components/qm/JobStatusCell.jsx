import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const DEFAULT_COLORS = [
  '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
  '#ec4899', '#3b82f6', '#000000', '#84cc16', '#14b8a6',
];

const defaultColorMap = {
  'DONE': '#22c55e',
  'HOLD ORDER': '#ec4899',
  'INVOICE CREATED': '#8b5cf6',
  'COMPLETE': '#000000',
  'ORDERED': '#14b8a6',
  'ART SUPPLIED': '#f97316',
  'IN PROGRESS': '#8b5cf6',
  'PROOF SENT': '#06b6d4',
  'FOLLOW UP PROOF': '#7c3aed',
  'SOME PROOFS REJECTED': '#ef4444',
  'PROOF REJECTED': '#dc2626',
  'SOME PROOFS APPROVED': '#4ade80',
  'PROOF APPROVED': '#16a34a',
  'IN PRODUCTION': '#3b82f6',
  'READY': '#84cc16',
  'SHIPPED': '#2563eb',
  'DELIVERED': '#15803d',
};

function getStorageKey(columnKey) {
  return `job_statuses_${columnKey}`;
}

function loadCustomStatuses(columnKey, defaultOptions) {
  try {
    const stored = localStorage.getItem(getStorageKey(columnKey));
    if (stored) return JSON.parse(stored);
  } catch {}
  // Initialize from defaults
  return defaultOptions.filter(o => o !== '').map(o => ({
    label: o,
    color: defaultColorMap[o] || '#6b7280',
  }));
}

function saveCustomStatuses(columnKey, statuses) {
  localStorage.setItem(getStorageKey(columnKey), JSON.stringify(statuses));
}

export default function JobStatusCell({ value, options, onChange, columnKey }) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [statuses, setStatuses] = useState(() => loadCustomStatuses(columnKey || 'default', options));
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const btnRef = useRef(null);

  // Reload statuses when dropdown opens
  useEffect(() => {
    if (open) {
      setStatuses(loadCustomStatuses(columnKey || 'default', options));
      setEditMode(false);
      setNewLabel('');
    }
  }, [open]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inBtn = btnRef.current && btnRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inBtn && !inDropdown) {
        setOpen(false);
        setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentStatus = statuses.find(s => s.label === value);
  const bgColor = currentStatus?.color || (value ? '#6b7280' : null);

  const rect = btnRef.current?.getBoundingClientRect();

  const addStatus = () => {
    if (!newLabel.trim()) return;
    const updated = [...statuses, { label: newLabel.trim().toUpperCase(), color: newColor }];
    setStatuses(updated);
    saveCustomStatuses(columnKey || 'default', updated);
    setNewLabel('');
    setNewColor(DEFAULT_COLORS[0]);
  };

  const removeStatus = (label) => {
    const updated = statuses.filter(s => s.label !== label);
    setStatuses(updated);
    saveCustomStatuses(columnKey || 'default', updated);
    if (value === label) onChange('');
  };

  return (
    <div ref={btnRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        style={bgColor ? { backgroundColor: bgColor, color: '#fff' } : {}}
        className={`w-full min-w-[80px] text-xs font-bold px-2 py-1 rounded text-center truncate transition-colors ${
          !bgColor ? 'border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50' : ''
        }`}
      >
        {value || '—'}
      </button>

      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999, minWidth: 200 }}
          className="bg-white border rounded-lg shadow-xl overflow-hidden"
        >
          {editMode ? (
            /* Edit mode */
            <div className="p-2">
              <p className="text-xs font-semibold text-slate-500 px-1 mb-2">EDIT STATUSES</p>
              <div className="space-y-1 max-h-52 overflow-y-auto mb-2">
                {statuses.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-1">
                    <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span
                      className="flex-1 text-xs font-bold text-white px-2 py-1 rounded truncate"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.label}
                    </span>
                    <button
                      onClick={() => removeStatus(s.label)}
                      className="text-slate-400 hover:text-red-500 p-0.5 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new status */}
              <div className="border-t pt-2 px-1 space-y-1.5">
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStatus()}
                  placeholder="NEW STATUS"
                  className="w-full text-xs border rounded px-2 py-1 font-bold uppercase placeholder:font-normal placeholder:normal-case"
                />
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.map(c => (
                    <button
                      key={c}
                      onMouseDown={() => setNewColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: newColor === c ? '#000' : 'transparent' }}
                    />
                  ))}
                </div>
                <button
                  onClick={addStatus}
                  className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 rounded flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> ADD STATUS
                </button>
              </div>

              <button
                onClick={() => setEditMode(false)}
                className="w-full mt-2 text-xs text-slate-500 hover:text-slate-700 py-1 border-t text-center"
              >
                ← Back
              </button>
            </div>
          ) : (
            /* Select mode */
            <div className="py-1">
              {statuses.map(s => (
                <button
                  key={s.label}
                  onClick={() => { onChange(s.label); setOpen(false); }}
                  className="w-full mx-1 my-0.5 text-left px-3 py-1.5 text-xs font-bold rounded text-white hover:opacity-90"
                  style={{ backgroundColor: s.color, width: 'calc(100% - 8px)' }}
                >
                  {s.label}
                </button>
              ))}
              {value && (
                <button
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 border-t mt-1"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setEditMode(true)}
                className="w-full text-center py-1.5 text-xs text-primary font-semibold hover:bg-slate-50 border-t"
              >
                EDIT STATUSES
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}