import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    const quotes = await base44.asServiceRole.entities.Quote.filter({ approval_token: token });
    if (!quotes || quotes.length === 0) return Response.json({ error: 'Quote not found' }, { status: 404 });

    return Response.json({ quote: quotes[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});