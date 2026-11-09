import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Mail, Phone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.Customer.list('-created_date', 200).then(data => { setCustomers(data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => !search || 
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.company_name) { toast.error('Company name required'); return; }
    setSaving(true);
    await base44.entities.Customer.create(form);
    toast.success('Customer added!');
    setShowDialog(false);
    setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
    load();
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-primary hover:bg-primary/90 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No customers found.</div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{c.company_name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.company_name}</p>
                  {c.contact_name && <p className="text-sm text-muted-foreground truncate">{c.contact_name}</p>}
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {c.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { key: 'company_name', label: 'Company Name *', placeholder: 'ABC Shirts Co.' },
              { key: 'contact_name', label: 'Contact Name', placeholder: 'John Smith' },
              { key: 'email', label: 'Email', placeholder: 'john@abc.com', type: 'email' },
              { key: 'phone', label: 'Phone', placeholder: '555-1234' },
              { key: 'address', label: 'Address', placeholder: '123 Main St' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                <Input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="mt-1" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-primary text-white hover:bg-primary/90">
                {saving ? 'Saving...' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}