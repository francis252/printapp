import { X } from 'lucide-react';
import QuoteDocument from '@/components/qm/QuoteDocument';

// Full-screen pop-up showing the quote exactly as the customer will see it.
export default function QuotePreviewModal({ open, onClose, quote, lineItems }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
      <div className="bg-white border-b px-3 md:px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">Customer Preview</p>
          <p className="text-xs text-slate-500 truncate">Exactly what your customer sees when they open the quote link</p>
        </div>
        <button onClick={onClose} className="p-2 rounded hover:bg-slate-100 text-slate-500 flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-100">
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-2 md:px-4">
          <QuoteDocument quote={quote} lineItems={lineItems} />
        </div>
      </div>
    </div>
  );
}