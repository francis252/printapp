import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AddCustomerModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    contact_name: '', company_name: '', email: '', phone: '',
    billing_address: '', shipping_address: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.contact_name && !form.company_name) {
      toast.error('Name or company required');
      return;
    }
    setSaving(true);
    const created = await base44.entities.Customer.create(form);
    toast.success('Customer saved!');
    onSaved(created);
    setSaving(false);
    onClose();
  };

  const fields = [
    { key: 'contact_name', label: 'Customer Name', placeholder: 'Kim Fassetta' },
    { key: 'company_name', label: 'Company Name', placeholder: 'Bracken Backers' },
    { key: 'email', label: 'Email', placeholder: 'kim@example.com', type: 'email' },
    { key: 'phone', label: 'Phone', placeholder: '480-353-0429' },
    { key: 'billing_address', label: 'Billing Address', placeholder: '670 Old Boerne Rd, Bulverde TX 78163' },
    { key: 'shipping_address', label: 'Shipping Address', placeholder: 'Same as billing or different' },
    { key: 'notes', label: 'Notes', placeholder: 'Any additional info...' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key} className={key === 'billing_address' || key === 'shipping_address' || key === 'notes' ? 'col-span-2' : ''}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
              <Input
                type={type || 'text'}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="mt-1 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}