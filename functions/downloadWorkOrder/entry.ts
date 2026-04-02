import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_order_id } = await req.json();
    const wo = await base44.asServiceRole.entities.WorkOrder.get(work_order_id);
    if (!wo) return Response.json({ error: 'Work order not found' }, { status: 404 });

    // Load branding settings
    const brandSettings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'brand_color' });
    const brandColor = brandSettings?.[0]?.value || '#4f46e5';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 14;
    let y = 14;

    // Header bar
    const r = parseInt(brandColor.slice(1, 3), 16);
    const g = parseInt(brandColor.slice(3, 5), 16);
    const b = parseInt(brandColor.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageW, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('WORK ORDER', margin, 14);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Stage: ${wo.stage?.replace(/_/g, ' ').toUpperCase()}`, pageW - margin, 14, { align: 'right' });

    y = 30;
    doc.setTextColor(30, 30, 30);

    // Job info
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(wo.title, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Customer: ${wo.customer_name}  |  ${wo.customer_email || ''}`, margin, y);
    y += 5;
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
    y += 8;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Line items
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Line Items', margin, y);
    y += 5;

    for (const item of (wo.line_items || [])) {
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`${item.product_name || 'Product'}${item.color ? ' — ' + item.color : ''}`, margin + 3, y + 6.5);

      doc.setFont(undefined, 'normal');
      doc.setTextColor(90, 90, 90);
      const detail = `Qty: ${item.quantity || 0}  |  Unit: $${Number(item.unit_price || 0).toFixed(2)}  |  Total: $${Number(item.total || 0).toFixed(2)}${item.size_breakdown ? '  |  Sizes: ' + item.size_breakdown : ''}`;
      doc.setFontSize(8);
      doc.text(detail, pageW - margin - 3, y + 6.5, { align: 'right' });
      y += 14;

      // Mockup images section label
      if (item.mockup_images?.length > 0) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text(`Mockups: ${item.mockup_images.map(m => m.view).join(', ')}`, margin + 3, y);
        y += 6;
      }
    }

    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Totals
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Order Total: $${Number(wo.total || 0).toFixed(2)}`, pageW - margin, y, { align: 'right' });
    y += 8;

    // Notes
    if (wo.notes) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(wo.notes, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }

    // Production stage checklist
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Production Checklist', margin, y);
    y += 6;

    const stages = ['waiting_stock', 'stock_received', 'in_production', 'finished'];
    const stageLabels = { waiting_stock: 'Waiting for Stock', stock_received: 'Stock Received', in_production: 'In Production', finished: 'Finished' };
    const currentIdx = stages.indexOf(wo.stage);

    for (let i = 0; i < stages.length; i++) {
      const done = i <= currentIdx;
      doc.setFillColor(done ? r : 220, done ? g : 220, done ? b : 220);
      doc.circle(margin + 3, y - 1.5, 2.5, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, done ? 'bold' : 'normal');
      doc.setTextColor(done ? 30 : 120, done ? 30 : 120, done ? 30 : 120);
      doc.text(stageLabels[stages[i]], margin + 9, y + 1);
      y += 8;
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=work-order-${wo.title.replace(/\s+/g, '-').toLowerCase()}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});