import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { quote_id, preview_to } = await req.json();
    const quote = await base44.asServiceRole.entities.Quote.get(quote_id);
    if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const reviewUrl = `${appUrl}/review-quote/${quote.approval_token}`;

    // Load branding
    const brandSettings = await base44.asServiceRole.entities.AppSettings.list();
    const settingsMap = {};
    brandSettings.forEach(s => { settingsMap[s.key] = s.value; });
    const brandColor = settingsMap.brand_color || '#4f46e5';
    const companyName = settingsMap.company_name || '';
    const logoUrl = settingsMap.company_logo_url || '';

    // Line items table + per-item mockups
    const lineItemsHtml = (quote.line_items || []).map(item => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px 8px;">
          ${item.product_image ? `<img src="${item.product_image}" style="width:50px;height:50px;object-fit:contain;border-radius:4px;border:1px solid #eee;" />` : ''}
        </td>
        <td style="padding:10px 8px; font-size:14px;">${item.product_name}${item.color ? ` — ${item.color}` : ''}${item.size_breakdown ? `<br/><span style="color:#999;font-size:12px;">${item.size_breakdown}</span>` : ''}</td>
        <td style="padding:10px 8px; font-size:14px; text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px; font-size:14px; text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 8px; font-size:14px; text-align:right; font-weight:bold;">$${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    // Per-line-item mockup images
    const itemsWithMockups = (quote.line_items || []).filter(item => item.mockup_images?.length > 0);
    let artworkHtml = '';
    if (itemsWithMockups.length > 0) {
      artworkHtml = `<h3 style="color:#111; margin-top:30px;">Artwork Mockups</h3>`;
      for (const item of itemsWithMockups) {
        artworkHtml += `
          <div style="margin-bottom:20px; background:#f5f5f5; padding:16px; border-radius:8px;">
            <p style="font-weight:bold; font-size:14px; color:#333; margin:0 0 10px 0;">${item.product_name}${item.color ? ' · ' + item.color : ''}</p>
            <div style="display:flex; flex-wrap:wrap; gap:10px;">
              ${item.mockup_images.map(img => `
                <div style="text-align:center;">
                  <p style="font-weight:bold; color:#555; font-size:12px; margin-bottom:4px;">${img.view}</p>
                  <img src="${img.url}" style="max-width:160px; border:1px solid #ddd; border-radius:6px; background:#fff;" />
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background:${brandColor}; padding: 24px 30px; border-radius:8px 8px 0 0;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:48px; max-width:200px; object-fit:contain; display:block; margin-bottom:12px;" />` : ''}
          ${companyName ? `<p style="color:rgba(255,255,255,0.9); font-size:13px; margin:0 0 4px 0;">${companyName}</p>` : ''}
          <h2 style="color:#fff; margin:0; font-size:20px;">Quote: ${quote.title}</h2>
        </div>
        <div style="padding: 24px 30px; background:#fff; border:1px solid #eee; border-top:none; border-radius:0 0 8px 8px;">
        <p style="color:#555;">Hi ${quote.customer_name}, please review your quote below.</p>

        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px; text-align:left; font-size:13px; color:#777;"></th>
              <th style="padding:8px; text-align:left; font-size:13px; color:#777;">Product</th>
              <th style="padding:8px; text-align:center; font-size:13px; color:#777;">Qty</th>
              <th style="padding:8px; text-align:right; font-size:13px; color:#777;">Unit Price</th>
              <th style="padding:8px; text-align:right; font-size:13px; color:#777;">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>

        <div style="text-align:right; margin-top:12px; padding:12px; background:#f9f9f9; border-radius:8px;">
          <p style="color:#555; font-size:14px;">Subtotal: <strong>$${Number(quote.subtotal).toFixed(2)}</strong></p>
          ${quote.tax_rate ? `<p style="color:#555; font-size:14px;">Tax (${quote.tax_rate}%): <strong>$${(Number(quote.subtotal) * Number(quote.tax_rate) / 100).toFixed(2)}</strong></p>` : ''}
          <p style="color:#111; font-size:18px; font-weight:bold;">Total: $${Number(quote.total).toFixed(2)}</p>
        </div>

        ${artworkHtml}

        ${quote.notes ? `<p style="color:#555; font-size:14px; margin-top:16px;"><strong>Notes:</strong> ${quote.notes}</p>` : ''}

        <div style="text-align:center; margin-top:30px;">
          <a href="${reviewUrl}" style="background:${brandColor}; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-size:16px; font-weight:bold;">Review &amp; Approve Quote</a>
        </div>
        </div>
      </div>
    `;

    // If preview_to is provided, send to that address instead (for previewing) without changing status
    const sendTo = preview_to || quote.customer_email;
    const subjectPrefix = preview_to ? '[PREVIEW] ' : '';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: sendTo,
      subject: `${subjectPrefix}Quote for Review: ${quote.title}`,
      body: emailBody,
    });

    if (!preview_to) {
      await base44.asServiceRole.entities.Quote.update(quote_id, { status: 'sent' });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});