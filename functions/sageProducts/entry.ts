import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skus } = await req.json();

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return Response.json({ error: 'Invalid SKUs provided' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SAGE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Sage API key not configured' }, { status: 500 });
    }

    const products = [];

    for (const sku of skus) {
      try {
        const response = await fetch(`https://api.sagefootwear.com/product/${sku}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();

        products.push({
          sku: data.sku || sku,
          name: data.name || data.description || '',
          thumbnail: data.thumbnail || data.image || '',
          inventory: {
            available: data.inventory?.available || 0
          },
          colors: (data.colors || []).map(color => ({
            colorName: color.name || color.colorName || '',
            colorCode: color.code || color.colorCode || '',
            colorSwatch: color.swatch || color.colorSwatch || '',
            images: {
              Front: color.images?.front || color.front || '',
              Back: color.images?.back || color.back || '',
              'Left Sleeve': color.images?.leftSleeve || color.leftSleeve || '',
              'Right Sleeve': color.images?.rightSleeve || color.rightSleeve || ''
            }
          }))
        });
      } catch (err) {
        console.error(`Failed to fetch Sage product ${sku}:`, err);
      }
    }

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});