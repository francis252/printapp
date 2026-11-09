import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all jobs awaiting approval that haven't had a follow-up in 3+ days
    const jobs = await base44.asServiceRole.entities.Job.list();
    const awaitingJobs = jobs.filter(j => 
      j.status === 'Awaiting Approval' && 
      j.approval_token &&
      !j.approved_at &&
      !j.rejected_at
    );

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    let sent = 0;

    for (const job of awaitingJobs) {
      const lastFollowUp = job.follow_up_sent_at ? new Date(job.follow_up_sent_at) : null;
      const createdDate = new Date(job.created_date);
      const checkDate = lastFollowUp || createdDate;

      // Only send if it's been 3+ days since last follow-up or creation
      if (checkDate < threeDaysAgo && job.customer_email) {
        const approveUrl = `${Deno.env.get('APP_URL') || 'https://your-app.com'}/approve/${job.id}/${job.approval_token}/approve`;
        const rejectUrl = `${Deno.env.get('APP_URL') || 'https://your-app.com'}/approve/${job.id}/${job.approval_token}/reject`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: job.customer_email,
          subject: `Friendly Reminder: Your Quote is Waiting - ${job.title}`,
          body: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#00bcd4;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
                <h1 style="color:white;margin:0;font-size:22px">Just a Reminder 👋</h1>
              </div>
              <p style="color:#333">Hi ${job.customer_name},</p>
              <p style="color:#555">We wanted to follow up on your quote for <strong>${job.title}</strong> totaling <strong>$${(job.total_amount||0).toFixed(2)}</strong>.</p>
              <p style="color:#555">We'd love to get started on your order! Please review and approve or reject your quote below.</p>
              <div style="text-align:center;margin:30px 0">
                <a href="${approveUrl}" style="background:#22c55e;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:12px">✓ Approve Quote</a>
                <a href="${rejectUrl}" style="background:#ef4444;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold">✗ Reject Quote</a>
              </div>
              <p style="color:#999;font-size:12px;text-align:center">Questions? Reply to this email or call us directly.</p>
            </div>
          `
        });

        await base44.asServiceRole.entities.Job.update(job.id, {
          follow_up_sent_at: now.toISOString()
        });
        sent++;
      }
    }

    return Response.json({ success: true, follow_ups_sent: sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});