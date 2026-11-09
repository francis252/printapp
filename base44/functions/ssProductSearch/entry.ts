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

    const { style_number } = await req.json();
    if (!style_number) return Response.json({ error: 'style_number required' }, { status: 400 });

    const auth = getAuth();
    const query = style_number.trim();

    // Step 1: Search styles to find the styleID
    const stylesRes = await fetch(`${SS_BASE}/styles/?search=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': auth }
    });

    if (!stylesRes.ok) {
      const text = await stylesRes.text();
      return Response.json({ error: `S&S styles API error: ${stylesRes.status}`, detail: text }, { status: 502 });
    }

    const styles = await stylesRes.json();

    if (!styles || styles.length === 0) {
      return Response.json({ product: null, colors: [] });
    }

    // Use the first matching style
    const style = styles[0];

    // Step 2: Fetch products (SKUs) for this styleID to get color images
    const productsRes = await fetch(`${SS_BASE}/products/?styleid=${style.styleID}`, {
      headers: { 'Authorization': auth }
    });

    if (!productsRes.ok) {
      // Return style info without colors if products fail
      return Response.json({
        product: {
          title: style.title,
          brandName: style.brandName,
          styleName: style.styleName,
          styleID: style.styleID,
          partNumber: style.partNumber,
        },
        colors: []
      });
    }

    const skus = await productsRes.json();

    const product = {
      title: style.title || `${style.brandName} ${style.styleName}`,
      brandName: style.brandName,
      styleName: style.styleName,
      styleID: style.styleID,
      partNumber: style.partNumber,
    };

    // Deduplicate colors - one entry per colorName
    const colorMap = {};
    for (const sku of (skus || [])) {
      const { colorName } = sku;
      if (!colorName || colorMap[colorName]) continue;
      colorMap[colorName] = {
        colorName,
        colorCode: sku.colorCode,
        frontImage: sku.colorFrontImage ? `https://www.ssactivewear.com/${sku.colorFrontImage}` : null,
        backImage: sku.colorBackImage ? `https://www.ssactivewear.com/${sku.colorBackImage}` : null,
        sideImage: sku.colorSideImage ? `https://www.ssactivewear.com/${sku.colorSideImage}` : null,
        swatchImage: sku.colorSwatchImage ? `https://www.ssactivewear.com/${sku.colorSwatchImage}` : null,
        color1: sku.color1 || null,
        customerPrice: sku.customerPrice || null,
      };
    }

    return Response.json({ product, colors: Object.values(colorMap) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});