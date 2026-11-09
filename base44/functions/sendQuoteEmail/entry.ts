import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    // Use base44 service-role integrations to send email (bypasses app-user restriction)
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});