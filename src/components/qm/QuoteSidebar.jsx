import { Button } from '@/components/ui/button';
import { Save, Send, CheckSquare, ThumbsUp, Eye } from 'lucide-react';

export default function QuoteSidebar({ quote, onSaveDraft, onSaveQuote, onSendQuote, onManualApprove, onPreview, saving, onChange }) {
  return (
    <div className="w-full lg:w-56 flex-shrink-0 space-y-3">
      {/* Quote Actions */}
      <div className="bg-white border rounded-lg p-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quote Actions</p>
        <div className="space-y-1.5">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={onSaveDraft} disabled={saving}>
            <Save className="w-3.5 h-3.5" /> Save as Draft
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 text-green-700 border-green-300 hover:bg-green-50" onClick={onSaveQuote} disabled={saving}>
            <CheckSquare className="w-3.5 h-3.5" /> Save Quote
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={onPreview}>
            <Eye className="w-3.5 h-3.5" /> Customer Preview
          </Button>
          <Button size="sm" className="w-full justify-start gap-2 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={onSendQuote} disabled={saving}>
            <Send className="w-3.5 h-3.5" /> {saving ? 'Sending...' : 'Save & Email Quote'}
          </Button>
          {quote.status !== 'Approved' && (
            <Button size="sm" className="w-full justify-start gap-2 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" onClick={onManualApprove} disabled={saving}>
              <ThumbsUp className="w-3.5 h-3.5" /> Manual Approve
            </Button>
          )}
          {quote.status === 'Approved' && (
            <div className="flex items-center gap-2 text-xs text-green-700 font-semibold px-1 py-1">
              <ThumbsUp className="w-3.5 h-3.5" /> Approved
            </div>
          )}
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Notes</p>
          <button className="text-blue-500 hover:text-blue-700">
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
        <textarea
          value={quote.internal_notes || ''}
          onChange={e => onChange({ internal_notes: e.target.value })}
          placeholder="Add internal note..."
          className="w-full border rounded px-2 py-1.5 text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}