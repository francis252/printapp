import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Search, Trash2, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import PageHeader from '@/components/qm/PageHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['Not Ordered', 'Ordered', 'Completed'];

const STATUS_COLORS = {
  'Not Ordered': 'bg-red-100 text-red-700',
  'Created':     'bg-slate-100 text-slate-600',
  'Ordered':     'bg-blue-100 text-blue-700',
  'Partially Received': 'bg-yellow-100 text-yellow-700',
  'Completed':   'bg-green-100 text-green-700',
  'Received':    'bg-green-100 text-green-700',
  'Cancelled':   'bg-red-100 text-red-700',
};

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // po id
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.PurchaseOrder.list('-created_date', 100).then(data => {
      setPos(data || []);
      setLoading(false);
    });
  }, []);

  const handleStatusChange = async (po, newStatus) => {
    if (newStatus === 'Completed') {
      setConfirmDelete(po.id);
      return;
    }
    const updated = { ...po, status: newStatus };
    setPos(prev => prev.map(p => p.id === po.id ? updated : p));
    await base44.entities.PurchaseOrder.update(po.id, { status: newStatus });
  };

  const handleConfirmDelete = async () => {
    await base44.entities.PurchaseOrder.delete(confirmDelete);
    setPos(prev => prev.filter(p => p.id !== confirmDelete));
    setConfirmDelete(null);
    toast.success('Purchase order cleared.');
  };

  const handleDeadlineChange = async (poId, date) => {
    const iso = date ? format(date, 'yyyy-MM-dd') : '';
    setPos(prev => prev.map(p => p.id === poId ? { ...p, deadline: iso } : p));
    await base44.entities.PurchaseOrder.update(poId, { deadline: iso });
  };

  const handleKeep = async () => {
    // Mark as Completed but keep it
    const po = pos.find(p => p.id === confirmDelete);
    if (po) {
      const updated = { ...po, status: 'Completed' };
      setPos(prev => prev.map(p => p.id === confirmDelete ? updated : p));
      await base44.entities.PurchaseOrder.update(confirmDelete, { status: 'Completed' });
    }
    setConfirmDelete(null);
  };

  const filtered = pos.filter(po => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      po.title?.toLowerCase().includes(q) ||
      po.po_number?.toLowerCase().includes(q) ||
      po.job_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6">
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-foreground">Clear Purchase Order?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Have you received everything? Would you like to clear this PO?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleKeep} size="sm">No, Keep It</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} size="sm">Yes, Clear It</Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Purchase Orders"
        subtitle="Manage the items on your orders & track your purchases easily."
      />

      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-3 md:px-4 py-3 border-b">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {loading ? (
            <p className="px-4 py-12 text-center text-muted-foreground text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-muted-foreground text-sm">No purchase orders yet.</p>
          ) : filtered.map(po => (
            <div key={po.id} className="p-3 space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{po.po_number}</p>
                <Link to={`/purchase-orders/${po.id}`} className="text-sm font-medium text-foreground">
                  {po.title}
                </Link>
                <p className="text-xs text-muted-foreground">Job {po.job_number || '—'}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={['Not Ordered', 'Ordered', 'Completed'].includes(po.status) ? po.status : 'Not Ordered'}
                  onChange={e => handleStatusChange(po, e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_COLORS[po.status] || 'bg-slate-100 text-slate-600'}`}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {po.deadline ? format(new Date(po.deadline + 'T00:00:00'), 'MMM d, yyyy') : <span className="text-muted-foreground/60">Set date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={po.deadline ? new Date(po.deadline + 'T00:00:00') : undefined}
                      onSelect={date => handleDeadlineChange(po.id, date)}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2035}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">PO #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Job #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No purchase orders yet.</p>
                  </td>
                </tr>
              ) : filtered.map(po => (
                <tr key={po.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-primary">{po.po_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{po.job_number || '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/purchase-orders/${po.id}`} className="text-primary hover:underline font-medium">
                      {po.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={['Not Ordered', 'Ordered', 'Completed'].includes(po.status) ? po.status : 'Not Ordered'}
                      onChange={e => handleStatusChange(po, e.target.value)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_COLORS[po.status] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {po.deadline ? format(new Date(po.deadline + 'T00:00:00'), 'MMM d, yyyy') : <span className="text-muted-foreground/60">Set date</span>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={po.deadline ? new Date(po.deadline + 'T00:00:00') : undefined}
                          onSelect={date => handleDeadlineChange(po.id, date)}
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2035}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}