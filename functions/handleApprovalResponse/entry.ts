import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, decision, customer_notes } = await req.json();

    // Find job by token (service role since customer is not logged in)
    const jobs = await base44.asServiceRole.entities.ApprovalJob.filter({ approval_token: token });
    if (!jobs || jobs.length === 0) return Response.json({ error: 'Invalid token' }, { status: 404 });
    const job = jobs[0];

    if (job.status === 'approved' || job.status === 'denied') {
      return Response.json({ error: 'Already responded' }, { status: 400 });
    }

    const newStatus = decision === 'approve' ? 'approved' : 'denied';
    await base44.asServiceRole.entities.ApprovalJob.update(job.id, {
      status: newStatus,
      customer_notes: customer_notes || '',
      responded_at: new Date().toISOString(),
    });

    // Get notify email
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'notify_email' });
    const notifyEmail = settings?.[0]?.value;
    if (!notifyEmail) return Response.json({ success: true });

    const statusLabel = newStatus === 'approved' ? '✅ Approved' : '❌ Denied';
    const notifyBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${statusLabel}: ${job.title}</h2>
        <p><strong>Customer:</strong> ${job.customer_name} (${job.customer_email})</p>
        <p><strong>Decision:</strong> ${newStatus.toUpperCase()}</p>
        ${customer_notes ? `<p><strong>Customer Notes:</strong> ${customer_notes}</p>` : ''}
        <p style="color:#888; font-size:12px;">Responded at: ${new Date().toLocaleString()}</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: notifyEmail,
      subject: `${statusLabel} — Artwork: ${job.title}`,
      body: notifyBody,
    });

    // Send confirmation to customer
    const confirmBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
        <h2 style="color: #111;">Thanks, ${job.customer_name}!</h2>
        <p style="color:#555;">We've received your response for <strong>${job.title}</strong>.</p>
        <p style="font-size:18px; font-weight:bold; color:${newStatus === 'approved' ? '#16a34a' : '#dc2626'};">
          ${statusLabel}
        </p>
        ${customer_notes ? `<p style="color:#555;"><strong>Your notes:</strong> ${customer_notes}</p>` : ''}
        <p style="color:#888;">We'll be in touch shortly. Thank you!</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: job.customer_email,
      subject: `Your Response Received — ${job.title}`,
      body: confirmBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});