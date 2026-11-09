import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Plus, Trash2, Save, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['Quote', 'Awaiting Approval', 'Approved', 'In Production', 'Ready', 'Delivered', 'Cancelled'];
const JOB_TYPES = ['Screen Printing', 'Embroidery', 'Promotional', 'Mixed'];

const statusColor = {
  'Quote': 'bg-gray-100 text-gray-600',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'In Production': 'bg-blue-100 text-blue-700',
  'Ready': 'bg-purple-100 text-purple-700',
  'Delivered': 'bg-teal-100 text-teal-700',
  'Cancelled': 'bg-red-100 text-red-600',
};

const emptyItem = { description: '', quantity: 1, unit_price: 0, total: 0 };

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [job, setJob] = useState({
    title: '',
    customer_name: '',
    customer_email: '',
    job_type: 'Screen Printing',
    status: 'Quote',
    due_date: '',
    notes: '',
    line_items: [{ ...emptyItem }],
    total_amount: 0,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isNew) {
      base44.entities.Job.filter({ id }).then(([data]) => {
        if (data) setJob(data);
        setLoading(false);
      });
    }
  }, [id]);

  const updateItem = (idx, field, value) => {
    const items = [...(job.line_items || [])];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].total = (items[idx].quantity || 0) * (items[idx].unit_price || 0);
    }
    const total = items.reduce((s, i) => s + (i.total || 0), 0);
    setJob(j => ({ ...j, line_items: items, total_amount: total }));
  };

  const addItem = () => setJob(j => ({ ...j, line_items: [...(j.line_items || []), { ...emptyItem }] }));
  const removeItem = idx => {
    const items = (job.line_items || []).filter((_, i) => i !== idx);
    const total = items.reduce((s, i) => s + (i.total || 0), 0);
    setJob(j => ({ ...j, line_items: items, total_amount: total }));
  };

  const save = async () => {
    setSaving(true);
    if (isNew) {
      const jobNum = `JOB-${Date.now().toString().slice(-6)}`;
      const created = await base44.entities.Job.create({ ...job, job_number: jobNum });
      toast.success('Job created!');
      navigate(`/jobs/${created.id}`);
    } else {
      await base44.entities.Job.update(id, job);
      toast.success('Job saved!');
    }
    setSaving(false);
  };

  const sendQuote = async () => {
    if (!job.customer_email) { toast.error('Please enter a customer email first.'); return; }
    setSending(true);
    const token = Math.random().toString(36).slice(2);
    await base44.entities.Job.update(id, { status: 'Awaiting Approval', approval_token: token });
    setJob(j => ({ ...j, status: 'Awaiting Approval', approval_token: token }));
    
    const approveUrl = `${window.location.origin}/approve/${id}/${token}/approve`;
    const rejectUrl = `${window.location.origin}/approve/${id}/${token}/reject`;
    
    const lineItemsHtml = (job.line_items || []).map(item => 
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.unit_price||0).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.total||0).toFixed(2)}</td></tr>`
    ).join('');

    await base44.integrations.Core.SendEmail({
      to: job.customer_email,
      subject: `Quote Ready: ${job.title} - ${job.job_number || id}`,
      body: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#00bcd4;padding:20px;border-radius:8px 8px 0 0;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">Quote Ready</h1>
          </div>
          <div style="background:white;padding:24px;border:1px solid #eee">
            <p style="color:#333">Hi ${job.customer_name},</p>
            <p style="color:#555">Your quote for <strong>${job.title}</strong> is ready for review.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead><tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left">Description</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Unit Price</th>
                <th style="padding:8px;text-align:right">Total</th>
              </tr></thead>
              <tbody>${lineItemsHtml}</tbody>
            </table>
            <p style="font-size:18px;font-weight:bold;text-align:right;color:#333">Total: $${(job.total_amount||0).toFixed(2)}</p>
            <div style="text-align:center;margin-top:30px">
              <a href="${approveUrl}" style="background:#22c55e;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:12px">✓ Approve Quote</a>
              <a href="${rejectUrl}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold">✗ Reject Quote</a>
            </div>
          </div>
          <p style="color:#999;font-size:12px;text-align:center;margin-top:16px">This quote is valid for 30 days.</p>
        </div>
      `
    });
    toast.success(`Quote sent to ${job.customer_email}!`);
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading job...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/jobs"><button className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /></button></Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{isNew ? 'New Job' : (job.title || 'Job Detail')}</h1>
            {!isNew && <p className="text-sm text-muted-foreground">{job.job_number}</p>}
          </div>
          {!isNew && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[job.status] || ''}`}>
              {job.status}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isNew && job.status === 'Awaiting Approval' && (
            <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
              Awaiting client approval...
            </span>
          )}
          {!isNew && ['Quote', 'Awaiting Approval'].includes(job.status) && (
            <Button variant="outline" onClick={sendQuote} disabled={sending} className="gap-2 text-primary border-primary hover:bg-primary/5">
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Quote'}
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="bg-primary text-white hover:bg-primary/90 gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Approval banner */}
      {job.approved_at && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Approved by client on {new Date(job.approved_at).toLocaleDateString()}</span>
        </div>
      )}
      {job.rejected_at && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Rejected — {job.rejection_reason || 'No reason given'}</span>
        </div>
      )}

      {/* Job Info */}
      <div className="bg-white rounded-lg border p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Title *</label>
          <Input value={job.title} onChange={e => setJob(j => ({ ...j, title: e.target.value }))} placeholder="e.g. Smith & Co Team Shirts" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Name *</label>
          <Input value={job.customer_name} onChange={e => setJob(j => ({ ...j, customer_name: e.target.value }))} placeholder="Company or person name" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Email</label>
          <Input type="email" value={job.customer_email} onChange={e => setJob(j => ({ ...j, customer_email: e.target.value }))} placeholder="customer@email.com" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Type</label>
          <Select value={job.job_type} onValueChange={v => setJob(j => ({ ...j, job_type: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
          <Select value={job.status} onValueChange={v => setJob(j => ({ ...j, status: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
          <Input type="date" value={job.due_date} onChange={e => setJob(j => ({ ...j, due_date: e.target.value }))} className="mt-1" />
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Line Items</h2>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-primary border-primary hover:bg-primary/5">
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Description</th>
              <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground w-20">Qty</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground w-28">Unit Price</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground w-28">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(job.line_items || []).map((item, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2">
                  <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" className="border-0 shadow-none focus-visible:ring-0 p-0 h-8" />
                </td>
                <td className="px-4 py-2">
                  <Input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="border-0 shadow-none focus-visible:ring-0 p-0 h-8 text-center" />
                </td>
                <td className="px-4 py-2">
                  <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="border-0 shadow-none focus-visible:ring-0 p-0 h-8 text-right" />
                </td>
                <td className="px-4 py-2 text-right font-medium">${(item.total || 0).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t bg-muted/20 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">${(job.total_amount || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border p-5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
        <textarea
          value={job.notes}
          onChange={e => setJob(j => ({ ...j, notes: e.target.value }))}
          placeholder="Internal notes, artwork instructions, special requirements..."
          className="mt-2 w-full min-h-24 text-sm border rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}