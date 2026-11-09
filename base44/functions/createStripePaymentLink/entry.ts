import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { quoteId, amountType } = await req.json();
    // amountType: 'deposit' or 'full'

    if (!quoteId) return Response.json({ error: 'quoteId required' }, { status: 400 });

    const [quote] = await base44.asServiceRole.entities.Quote.filter({ id: quoteId });
    if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });

    const isDeposit = amountType === 'deposit';
    const amount = isDeposit
      ? Math.round((quote.deposit_required || quote.total * 0.5) * 100)
      : Math.round((quote.balance_due > 0 ? quote.balance_due : quote.total) * 100);

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const label = isDeposit
      ? `Deposit — Quote #${quote.quote_number}`
      : `Balance Due — Quote #${quote.quote_number}`;

    // Create a Stripe Payment Link
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amount,
      product_data: {
        name: label,
        description: `${quote.job_name} — ${quote.customer_name}`,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        quote_id: quoteId,
        quote_number: quote.quote_number || '',
        amount_type: amountType,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${req.headers.get('origin') || 'https://app.base44.com'}/quote-approval/${quoteId}/${quote.approval_token || ''}?paid=1&amountType=${amountType}`,
        },
      },
    });

    return Response.json({ url: paymentLink.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});