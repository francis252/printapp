import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'Created': 'bg-slate-100 text-slate-700',
  'Ordered': 'bg-blue-100 text-blue-700',
  'Partially Received': 'bg-yellow-100 text-yellow-700',
  'Received': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.entities.PurchaseOrder.filter({ id }).then(([found]) => {
      if (found) {
        setPo(found);
        setItems((found.line_items || []).map(li => ({ ...li })));
        setNotes(found.notes || '');
      }
      setLoading(false);
    });
  }, [id]);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    // If marking received, prompt delete
    if (field === 'received' && value === true) {
      setDeleteConfirm(true);
    }
  };

  const handleDeletePO = async () => {
    setDeleting(true);
    await base44.entities.PurchaseOrder.delete(id);
    toast.success('Purchase order deleted.');
    navigate('/purchase-orders');
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const rightX = pageW - margin;

    // ── Logo (top-left) ──────────────────────────────────────────────────────
    // Try to load logo; skip gracefully if unavailable
    const logoSrc = '/logo.png'; // place logo.png in /public to enable
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej;
        i.src = logoSrc;
      });
      doc.addImage(img, 'PNG', margin, margin, 90, 90);
    } catch (_) {
      // Fallback: text logo
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0,0,0);
      doc.text('4R Stitching Co.', margin, margin + 20);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100,100,100);
      doc.text('3307 Wurzbach Rd', margin, margin + 34);
      doc.text('San Antonio, TX 78238', margin, margin + 46);
      doc.setTextColor(0,0,0);
    }

    // ── "Purchase Order" title (top-right) ───────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Purchase Order', rightX, margin + 14, { align: 'right' });

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let ry = margin + 32;
    const metaLine = (label, value, bold = false) => {
      doc.setFont('helvetica', 'normal'); doc.text(`${label}: `, rightX - 1, ry, { align: 'right' });
      const lw = doc.getTextWidth(`${label}: `);
      if (bold) doc.setFont('helvetica', 'bold');
      doc.text(value, rightX, ry, { align: 'right' });
      if (bold) doc.setFont('helvetica', 'normal');
      ry += 14;
    };
    metaLine('P. O. Number', po.po_number || id.slice(-4));
    metaLine('Created Date', fmt(po.created_date));
    if (po.deadline) {
      doc.setTextColor(220, 50, 50);
      metaLine('Deadline', fmt(po.deadline), true);
      doc.setTextColor(0, 0, 0);
    }
    metaLine('Related Job(s)', po.job_number || '—');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(po.title || '', rightX, ry, { align: 'right', maxWidth: 250 });
    ry += 14;
    doc.setFont('helvetica', 'normal');
    metaLine('Related PO(s)', '—');
    if (po.vendor_name) { doc.text(po.vendor_name, rightX, ry, { align: 'right' }); ry += 14; }
    if (po.vendor_email) { doc.text(po.vendor_email, rightX, ry, { align: 'right' }); ry += 14; }

    // ── Bill To / Ship To boxes ───────────────────────────────────────────────
    const boxTop = margin + 110;
    const boxH = 72;
    const colW = (pageW - margin * 2 - 10) / 2;

    // Bill To
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Bill To', margin, boxTop - 6);
    doc.rect(margin, boxTop, colW, boxH);
    doc.setFontSize(8.5);
    let by = boxTop + 16;
    doc.text('4 R Stitching Co', margin + 8, by); by += 13;
    doc.setTextColor(100, 100, 100);
    doc.text('francis@4rstitchingco.com', margin + 8, by); by += 13;
    doc.text('2108547939', margin + 8, by); by += 13;
    doc.text('3307 Wurzbach Rd, San Antonio, TX 78238', margin + 8, by);
    doc.setTextColor(0, 0, 0);

    // Ship To
    const shipX = margin + colW + 10;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Ship To', shipX, boxTop - 6);
    doc.rect(shipX, boxTop, colW, boxH);
    doc.setFontSize(8.5);
    let sy = boxTop + 16;
    doc.setFont('helvetica', 'bold');
    doc.text(po.customer_name || '—', shipX + 8, sy); sy += 13;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    if (po.company_name) { doc.text(po.company_name, shipX + 8, sy); sy += 13; }
    doc.setTextColor(0, 0, 0);

    // ── Items table ───────────────────────────────────────────────────────────
    let ty = boxTop + boxH + 20;
    const colDefs = [
      { label: 'Code',             key: 'style_number', w: 44,  align: 'left' },
      { label: 'Name/Description', key: 'product_name', w: 170, align: 'left' },
      { label: 'Color',            key: 'color',        w: 60,  align: 'left' },
      { label: 'Size',             key: 'size',         w: 30,  align: 'left' },
      { label: 'Quantity',         key: 'quantity',     w: 50,  align: 'right' },
      { label: 'Rate',             key: 'rate',         w: 55,  align: 'right' },
      { label: 'Total',            key: '_total',       w: 60,  align: 'right' },
    ];
    const tableW = colDefs.reduce((s, c) => s + c.w, 0);
    const tableX = margin;

    // Group items by product for description rows
    const grpKeys = Object.values(items.reduce((acc, item) => {
      const k = `${item.product_name}__${item.style_number}`;
      if (!acc[k]) acc[k] = { desc: item.product_name, rows: [] };
      acc[k].rows.push(item);
      return acc;
    }, {}));

    for (const grp of grpKeys) {
      // Product description header row
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, ty, tableW, 18, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(grp.desc, tableX + 4, ty + 12, { maxWidth: tableW - 8 });
      doc.setTextColor(0, 0, 0);
      ty += 18;

      // Column header row
      doc.setFillColor(248, 248, 248);
      doc.rect(tableX, ty, tableW, 16, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      let cx = tableX;
      for (const col of colDefs) {
        if (col.align === 'right') doc.text(col.label, cx + col.w - 4, ty + 11, { align: 'right' });
        else doc.text(col.label, cx + 4, ty + 11);
        cx += col.w;
      }
      doc.setTextColor(0, 0, 0);
      ty += 16;

      // Data rows
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      for (const item of grp.rows) {
        const rowH = 18;
        doc.setDrawColor(220, 220, 220);
        doc.line(tableX, ty, tableX + tableW, ty);
        cx = tableX;
        const total = (item.quantity || 0) * (item.rate || 0);
        const vals = {
          style_number: item.style_number || '—',
          product_name: item.product_name,
          color: item.color || '—',
          size: item.size || '—',
          quantity: String(item.quantity || 0),
          rate: `$ ${(item.rate || 0).toFixed(2)}`,
          _total: `$ ${total.toFixed(2)}`,
        };
        for (const col of colDefs) {
          const val = vals[col.key] || '';
          if (col.align === 'right') doc.text(val, cx + col.w - 4, ty + 12, { align: 'right' });
          else doc.text(val, cx + 4, ty + 12, { maxWidth: col.w - 6 });
          cx += col.w;
        }
        ty += rowH;
      }
      ty += 6;
    }

    // ── Subtotal / Total ──────────────────────────────────────────────────────
    const subtotalVal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.rate || 0)), 0);
    ty += 4;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal', rightX - 70, ty, { align: 'right' });
    doc.text(`$ ${subtotalVal.toFixed(2)}`, rightX, ty, { align: 'right' });
    ty += 16;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
    doc.text('Total', rightX - 70, ty, { align: 'right' });
    doc.text(`$ ${subtotalVal.toFixed(2)}`, rightX, ty, { align: 'right' });

    // ── Page footer ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text('Page 1 of 1', pageW / 2, pageH - 24, { align: 'center' });

    doc.save(`PO-${po.po_number || id}.pdf`);
    toast.success('PDF downloaded.');
  };

  const saveUpdates = async () => {
    setSaving(true);
    const allOrdered = items.every(i => i.ordered);
    const allReceived = items.every(i => i.received);
    const someReceived = items.some(i => i.received || i.partially_received);
    let status = po.status;
    if (allReceived) status = 'Received';
    else if (someReceived) status = 'Partially Received';
    else if (allOrdered) status = 'Ordered';

    await base44.entities.PurchaseOrder.update(id, { line_items: items, notes, status });
    setPo(prev => ({ ...prev, status, notes }));
    toast.success('Purchase order updated!');
    setSaving(false);
  };

  // Group items by product name
  const grouped = items.reduce((acc, item, idx) => {
    const key = `${item.product_name}__${item.style_number}__${item.supplier_name}`;
    if (!acc[key]) acc[key] = { label: `${item.product_name}${item.style_number ? ` - ${item.style_number}` : ''}`, items: [] };
    acc[key].items.push({ ...item, _idx: idx });
    return acc;
  }, {});

  const subtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.rate || 0)), 0);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!po) return <div className="p-8 text-muted-foreground">Purchase order not found.</div>;

  return (
    <div className="p-6 max-w-5xl">
      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-foreground">Delete Purchase Order?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This item has been marked as received. Would you like to delete this purchase order since it has been received?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)} size="sm">No, Keep It</Button>
              <Button variant="destructive" onClick={handleDeletePO} disabled={deleting} size="sm">
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <Link to="/purchase-orders" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{po.title}</h1>
        </div>
        <Button onClick={downloadPDF} variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PO
        </Button>
      </div>
      <div className="flex items-center gap-4 mb-4 ml-7">
        <span className="text-sm text-muted-foreground">PO #: {po.po_number}</span>
        {po.deadline && (
          <span className="text-sm text-red-500 flex items-center gap-1">
            ⏱ Deadline: {new Date(po.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[po.status] || 'bg-slate-100 text-slate-600'}`}>
          {po.status}
        </span>
      </div>

      {po.job_number && (
        <div className="ml-7 mb-4">
          <span className="text-sm text-muted-foreground">Job #{po.job_number}</span>
          {po.deadline && <span className="text-sm text-red-500 ml-3">⏱ Deadline: {po.deadline}</span>}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Vendor</p>
          {po.vendor_name ? (
            <>
              <p className="font-semibold text-foreground">{po.vendor_name}</p>
              {po.vendor_phone && <p className="text-sm text-muted-foreground">{po.vendor_phone}</p>}
              {po.vendor_email && <p className="text-sm text-muted-foreground">{po.vendor_email}</p>}
            </>
          ) : <p className="text-sm text-muted-foreground">No vendor set</p>}
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Bill To</p>
          <p className="font-semibold text-foreground">4 R Stitching Co</p>
          <p className="text-sm text-muted-foreground">3307 Wurzbach Rd</p>
          <p className="text-sm text-muted-foreground">San Antonio, TX 78238</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Ship To</p>
          <p className="font-semibold text-foreground">{po.customer_name || '—'}</p>
          {po.company_name && <p className="text-sm text-muted-foreground">{po.company_name}</p>}
        </div>
      </div>

      {/* Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Important:</strong> Click <strong>SAVE UPDATES</strong> for the ordered/received changes to be saved.
          Mark all items as ordered or received, add items for backorder, then click Save Updates.
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border rounded-lg overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-foreground">Items</h2>
          <Button onClick={saveUpdates} disabled={saving} size="sm" variant="outline">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'SAVE UPDATES'}
          </Button>
        </div>

        {Object.values(grouped).map((group, gi) => (
          <div key={gi} className="border-b last:border-b-0">
            <div className="px-4 py-2 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">{group.label}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name/Description</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Colour</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Size</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Rate</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Ordered</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-24">Qty Ordered</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-24">Qty on Backorder</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Backorder Date</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Part. Received</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Received</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr
                    key={item._idx}
                    className={`border-b last:border-b-0 transition-colors ${
                      item.received ? 'bg-green-50' :
                      item.partially_received ? 'bg-yellow-50' :
                      item.ordered ? 'bg-green-50/60' :
                      'hover:bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{item.style_number || '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.color || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.size || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">${(item.rate || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input type="checkbox" checked={!!item.ordered}
                        onChange={e => updateItem(item._idx, 'ordered', e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-green-600" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input type="number" value={item.qty_ordered || ''} min={0}
                        onChange={e => updateItem(item._idx, 'qty_ordered', parseInt(e.target.value) || 0)}
                        className="h-7 text-sm w-20" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input type="number" value={item.qty_on_backorder || ''} min={0}
                        onChange={e => updateItem(item._idx, 'qty_on_backorder', parseInt(e.target.value) || 0)}
                        className="h-7 text-sm w-20" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input type="date" value={item.backorder_date || ''}
                        onChange={e => updateItem(item._idx, 'backorder_date', e.target.value)}
                        className="h-7 text-sm w-36" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input type="checkbox" checked={!!item.partially_received}
                        onChange={e => updateItem(item._idx, 'partially_received', e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-yellow-500" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input type="checkbox" checked={!!item.received}
                        onChange={e => updateItem(item._idx, 'received', e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-green-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Notes + Subtotal */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-card"
          />
        </div>
        <div className="text-right min-w-40 pt-6">
          <p className="text-lg font-bold text-foreground">SUBTOTAL ${subtotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}