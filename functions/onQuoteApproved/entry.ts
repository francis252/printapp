import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const quote = body.data;

    if (!quote || quote.status !== 'approved') return Response.json({ skipped: true });

    // Check if a work order already exists for this quote
    const existing = await base44.asServiceRole.entities.WorkOrder.filter({ quote_id: quote.id });
    if (existing?.length > 0) return Response.json({ skipped: true, reason: 'already exists' });

    await base44.asServiceRole.entities.WorkOrder.create({
      quote_id: quote.id,
      title: quote.title,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      line_items: quote.line_items || [],
      notes: quote.notes || '',
      stage: 'waiting_stock',
      total: quote.total || 0,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});