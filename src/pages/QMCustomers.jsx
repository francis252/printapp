import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Mail, Phone, Building2, FileText, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/qm/PageHeader';
import CustomerModal from '@/components/qm/CustomerModal';

export default function QMCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const load = () => base44.entities.Customer.list('-created_date', 300).then(d => { setCustomers(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => !search ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingCustomer(null); setModalOpen(true); };
  const openEdit = (c) => { setEditingCustomer(c); setModalOpen(true); };

  const handleSaved = (saved) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === saved.id);
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
    });
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        action={
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">No customers found.</div>
        ) : filtered.map(c => (
          <div
            key={c.id}
            onClick={() => openEdit(c)}
            className="bg-white border rounded-lg p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-sm">{(c.contact_name || c.company_name || '?')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{c.contact_name || '—'}</p>
                  {c.tax_exempt && (
                    <span className="flex items-center gap-0.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      <ShieldCheck className="w-3 h-3" /> Exempt
                    </span>
                  )}
                </div>
                {c.company_name && <p className="text-sm text-slate-500">{c.company_name}</p>}
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {c.email && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                  {c.payment_email && c.payment_email !== c.email && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">+pay</span>
                  )}
                </div>
              )}
              {c.phone && <div className="flex items-center gap-2 text-sm text-slate-500"><Phone className="w-3.5 h-3.5" /><span>{c.phone}</span></div>}
              {c.billing_address && <div className="flex items-center gap-2 text-sm text-slate-500"><Building2 className="w-3.5 h-3.5" /><span className="truncate">{c.billing_address}</span></div>}
              {c.w9_url && (
                <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                  <FileText className="w-3.5 h-3.5" /> W9 on file
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        customer={editingCustomer}
      />
    </div>
  );
}