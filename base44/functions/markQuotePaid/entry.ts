import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { quoteId, amountType } = await req.json();

    if (!quoteId) return Response.json({ error: 'quoteId required' }, { status: 400 });

    await base44.asServiceRole.entities.Quote.update(quoteId, {
      paid: true,
      paid_at: new Date().toISOString(),
      paid_amount_type: amountType || 'full',
      status: 'Approved',
    });

    // Also update the linked Job's deposit_paid if it exists
    const jobs = await base44.asServiceRole.entities.Job.filter({ quote_id: quoteId });
    if (jobs && jobs.length > 0) {
      const [quote] = await base44.asServiceRole.entities.Quote.filter({ id: quoteId });
      if (quote) {
        const paidAmount = amountType === 'deposit'
          ? (quote.deposit_required || quote.total * 0.5)
          : quote.total;
        await base44.asServiceRole.entities.Job.update(jobs[0].id, { deposit_paid: paidAmount });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});