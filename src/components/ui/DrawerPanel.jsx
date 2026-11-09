import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * DrawerPanel — slides in from the right over the page.
 * Props: open, onClose, title, subtitle, width (default 480), children
 */
export default function DrawerPanel({ open, onClose, title, subtitle, width = 480, children }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width, maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}