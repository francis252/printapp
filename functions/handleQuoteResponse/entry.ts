import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, decision, customer_notes } = await req.json();

    const quotes = await base44.asServiceRole.entities.Quote.filter({ approval_token: token });
    if (!quotes || quotes.length === 0) return Response.json({ error: 'Invalid token' }, { status: 404 });
    const quote = quotes[0];

    if (quote.status === 'approved' || quote.status === 'denied') {
      return Response.json({ error: 'Already responded' }, { status: 400 });
    }

    const newStatus = decision === 'approve' ? 'approved' : 'denied';
    await base44.asServiceRole.entities.Quote.update(quote.id, {
      status: newStatus,
      customer_notes: customer_notes || '',
      responded_at: new Date().toISOString(),
    });

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'notify_email' });
    const notifyEmail = settings?.[0]?.value;

    const statusLabel = newStatus === 'approved' ? '✅ Approved' : '❌ Denied';

    if (notifyEmail) {
      const notifyBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${statusLabel}: ${quote.title}</h2>
          <p><strong>Customer:</strong> ${quote.customer_name} (${quote.customer_email})</p>
          <p><strong>Decision:</strong> ${newStatus.toUpperCase()}</p>
          <p><strong>Quote Total:</strong> $${Number(quote.total).toFixed(2)}</p>
          ${customer_notes ? `<p><strong>Customer Notes:</strong> ${customer_notes}</p>` : ''}
        </div>
      `;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: notifyEmail,
        subject: `${statusLabel} — Quote: ${quote.title}`,
        body: notifyBody,
      });
    }

    const confirmBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
        <h2 style="color: #111;">Thanks, ${quote.customer_name}!</h2>
        <p style="color:#555;">We've received your response for quote <strong>${quote.title}</strong>.</p>
        <p style="font-size:18px; font-weight:bold; color:${newStatus === 'approved' ? '#16a34a' : '#dc2626'};">${statusLabel}</p>
        ${customer_notes ? `<p style="color:#555;"><strong>Your notes:</strong> ${customer_notes}</p>` : ''}
        <p style="color:#888;">We'll be in touch shortly. Thank you!</p>
      </div>
    `;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: quote.customer_email,
      subject: `Your Response Received — ${quote.title}`,
      body: confirmBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});