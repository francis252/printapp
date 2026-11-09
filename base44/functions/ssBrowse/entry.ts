import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SS_BASE = 'https://api.ssactivewear.com/v2';

function getAuth() {
  const account = Deno.env.get('SS_ACCOUNT_NUMBER');
  const apiKey = Deno.env.get('SS_API_KEY');
  return `Basic ${btoa(`${account}:${apiKey}`)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || query.trim().length < 2) return Response.json({ error: 'query required (min 2 chars)' }, { status: 400 });

    const auth = getAuth();

    // Search styles
    const stylesRes = await fetch(`${SS_BASE}/styles/?search=${encodeURIComponent(query.trim())}`, {
      headers: { 'Authorization': auth }
    });

    if (!stylesRes.ok) {
      const text = await stylesRes.text();
      return Response.json({ error: `S&S API error: ${stylesRes.status}`, detail: text }, { status: 502 });
    }

    const styles = await stylesRes.json();
    if (!styles || styles.length === 0) return Response.json({ styles: [] });

    // Return up to 50 styles with basic info
    const results = (styles || []).slice(0, 50).map(s => ({
      styleID: s.styleID,
      title: s.title || `${s.brandName} ${s.styleName}`,
      brandName: s.brandName,
      styleName: s.styleName,
      partNumber: s.partNumber,
      description: s.description || '',
      image: s.colorFrontImage ? `https://www.ssactivewear.com/${s.colorFrontImage}` : null,
      basePrice: s.basePrice || null,
      // source marker
      _source: 'ss',
    }));

    return Response.json({ styles: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});