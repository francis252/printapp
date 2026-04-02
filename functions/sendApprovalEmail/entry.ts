import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id } = await req.json();
    const job = await base44.asServiceRole.entities.ApprovalJob.get(job_id);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    // Get notify email from settings
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'notify_email' });
    const notifyEmail = settings?.[0]?.value || user.email;

    // Build the public review URL
    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const reviewUrl = `${appUrl}/review/${job.approval_token}`;

    // Build mockup images HTML
    const imagesHtml = (job.mockup_images || []).map(img => `
      <div style="text-align:center; margin: 10px;">
        <p style="font-weight:bold; color:#555; margin-bottom:6px;">${img.view}</p>
        <img src="${img.url}" style="max-width:220px; border:1px solid #ddd; border-radius:8px;" crossorigin="anonymous" />
      </div>
    `).join('');

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 12px;">
        <h2 style="color: #111;">Hi ${job.customer_name},</h2>
        <p style="color: #555; font-size: 15px;">Your artwork is ready for review. Please take a look at the mockups below and let us know if everything looks good.</p>
        
        <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin: 24px 0; background:#fff; padding:20px; border-radius:10px; border:1px solid #eee;">
          ${imagesHtml}
        </div>

        ${job.notes ? `<p style="color:#555; font-size:14px;"><strong>Notes:</strong> ${job.notes}</p>` : ''}

        <div style="text-align:center; margin-top:30px;">
          <a href="${reviewUrl}" style="background:#4f46e5; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-size:16px; font-weight:bold;">Review & Approve Artwork</a>
        </div>
        <p style="color:#aaa; font-size:12px; text-align:center; margin-top:20px;">This link is unique to you. Please do not share it.</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: job.customer_email,
      subject: `Artwork Approval: ${job.title}`,
      body: emailBody,
    });

    // Mark as sent
    await base44.asServiceRole.entities.ApprovalJob.update(job_id, { status: 'sent' });

    return Response.json({ success: true, notify_email: notifyEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});