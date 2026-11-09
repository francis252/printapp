import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Truck, Package } from 'lucide-react';
import PageHeader from '@/components/qm/PageHeader';
import { toast } from 'sonner';

export default function QMSuppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', contact_name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => Promise.all([
    base44.entities.Supplier.list('-created_date'),
    base44.entities.Product.list('-created_date', 500),
  ]).then(([s, p]) => { setSuppliers(s); setProducts(p); setLoading(false); });

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) { toast.error('Supplier name required'); return; }
    setSaving(true);
    await base44.entities.Supplier.create(form);
    toast.success('Supplier added!');
    setShowDialog(false);
    setForm({ name: '', website: '', contact_name: '', email: '', phone: '', notes: '' });
    load();
    setSaving(false);
  };

  // Only show suppliers that have at least one product linked
  const linkedSupplierNames = new Set(products.map(p => p.supplier_name).filter(Boolean));
  const linkedSuppliers = suppliers.filter(s => linkedSupplierNames.has(s.name));
  const unlinkedSuppliers = suppliers.filter(s => !linkedSupplierNames.has(s.name));

  const getProductCount = (supplierName) => products.filter(p => p.supplier_name === supplierName).length;
  const getPreviewProducts = (supplierName) => products.filter(p => p.supplier_name === supplierName).slice(0, 4);

  return (
    <div className="p-6">
      <PageHeader
        title="Suppliers"
        subtitle={`${linkedSuppliers.length} linked suppliers`}
        action={
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading...</div>
      ) : linkedSuppliers.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>No suppliers linked to products yet.</p>
          <p className="text-xs mt-1">Add products and assign a supplier name to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {linkedSuppliers.map(s => {
            const count = getProductCount(s.name);
            const previews = getPreviewProducts(s.name);
            return (
              <div key={s.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{s.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{s.website}</a>}
                        {s.contact_name && <span>{s.contact_name}</span>}
                        {s.email && <span>{s.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{count} product{count !== 1 ? 's' : ''}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/products?supplier=${encodeURIComponent(s.name)}`)}
                      className="h-7 text-xs"
                    >
                      View All Products
                    </Button>
                  </div>
                </div>

                {/* Product previews */}
                <div className="flex gap-2 flex-wrap">
                  {previews.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-slate-50 border rounded px-2 py-1.5">
                      <div className="w-8 h-8 rounded bg-slate-200 flex-shrink-0 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-slate-300 m-auto mt-2" />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.style_number}</p>
                      </div>
                    </div>
                  ))}
                  {count > 4 && (
                    <div className="flex items-center px-3 text-xs text-slate-400">+{count - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unlinked suppliers (no products) */}
      {unlinkedSuppliers.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Suppliers with no products</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlinkedSuppliers.map(s => (
              <div key={s.id} className="bg-white border border-dashed rounded-lg p-3 flex items-center gap-3">
                <Truck className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-500">{s.name}</p>
                  {s.contact_name && <p className="text-xs text-slate-400">{s.contact_name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { key: 'name', label: 'Supplier Name *', placeholder: 'S&S Activewear, SanMar...' },
              { key: 'website', label: 'Website', placeholder: 'https://ssactivewear.com' },
              { key: 'contact_name', label: 'Contact Name', placeholder: 'Rep name' },
              { key: 'email', label: 'Email', placeholder: 'rep@supplier.com', type: 'email' },
              { key: 'phone', label: 'Phone', placeholder: '800-555-0100' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-400">{label}</label>
                <Input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="mt-1 text-sm" />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? 'Saving...' : 'Add Supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}