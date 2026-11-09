import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';

const EMPTY = {
  contact_name: '', company_name: '', email: '', payment_email: '',
  phone: '', billing_address: '', shipping_address: '', notes: '',
  tax_exempt: false, w9_url: ''
};

export default function CustomerModal({ open, onClose, onSaved, customer }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingW9, setUploadingW9] = useState(false);

  useEffect(() => {
    if (open) setForm(customer ? { ...EMPTY, ...customer } : EMPTY);
  }, [open, customer]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleW9Upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingW9(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('w9_url', file_url);
    setUploadingW9(false);
    toast.success('W9 uploaded!');
  };

  const save = async () => {
    if (!form.contact_name && !form.company_name) {
      toast.error('Name or company required');
      return;
    }
    setSaving(true);
    let saved;
    if (customer?.id) {
      saved = await base44.entities.Customer.update(customer.id, form);
    } else {
      saved = await base44.entities.Customer.create(form);
    }
    toast.success(customer?.id ? 'Customer updated!' : 'Customer saved!');
    onSaved(saved);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer?.id ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Basic Info */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Name</label>
            <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Kim Fassetta" className="mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Company Name</label>
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Bracken Backers" className="mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="480-353-0429" className="mt-1 text-sm" />
          </div>

          {/* Emails */}
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Email Addresses</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quote Email</label>
            <p className="text-xs text-muted-foreground mb-1">Quotes & proofs sent here</p>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="kim@example.com" className="text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Email</label>
            <p className="text-xs text-muted-foreground mb-1">Payment links sent here</p>
            <Input type="email" value={form.payment_email} onChange={e => set('payment_email', e.target.value)} placeholder="billing@example.com" className="text-sm" />
          </div>

          {/* Addresses */}
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Addresses</p>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Billing Address</label>
            <Input value={form.billing_address} onChange={e => set('billing_address', e.target.value)} placeholder="670 Old Boerne Rd, Bulverde TX 78163" className="mt-1 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipping Address</label>
            <Input value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} placeholder="Same as billing or different" className="mt-1 text-sm" />
          </div>

          {/* Tax Exempt */}
          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Tax Status</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.tax_exempt}
                onChange={e => set('tax_exempt', e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground">Tax Exempt</span>
            </label>
          </div>

          {/* W9 Upload (shown when tax exempt) */}
          {form.tax_exempt && (
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">W9 Document</label>
              <p className="text-xs text-muted-foreground mb-2">Optional — upload their W9 file</p>
              {form.w9_url ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <a href={form.w9_url} target="_blank" rel="noreferrer" className="text-sm text-green-700 underline flex-1 truncate">View W9</a>
                  <button onClick={() => set('w9_url', '')} className="text-muted-foreground hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer hover:border-primary text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadingW9 ? 'Uploading...' : 'Click to upload W9 (PDF, image)'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleW9Upload} disabled={uploadingW9} />
                </label>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2 border-t pt-3 mt-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional info..."
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-card"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Saving...' : customer?.id ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}