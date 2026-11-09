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

    const { styleID } = await req.json();
    if (!styleID) return Response.json({ error: 'styleID required' }, { status: 400 });

    const auth = getAuth();

    // Fetch all SKUs for this style to get full color/size/pricing data
    const [skusRes, stylesRes] = await Promise.all([
      fetch(`${SS_BASE}/products/?styleid=${styleID}`, { headers: { 'Authorization': auth } }),
      fetch(`${SS_BASE}/styles/?styleID=${styleID}`, { headers: { 'Authorization': auth } }),
    ]);

    const skus = skusRes.ok ? await skusRes.json() : [];
    const stylesArr = stylesRes.ok ? await stylesRes.json() : [];
    const style = stylesArr[0] || {};

    // Deduplicate colors
    const colorMap = {};
    const sizeSet = new Set();
    let lowestPrice = null;

    for (const sku of (skus || [])) {
      const { colorName, sizeName, customerPrice } = sku;
      if (sizeName) sizeSet.add(sizeName);
      if (customerPrice && (lowestPrice === null || customerPrice < lowestPrice)) {
        lowestPrice = customerPrice;
      }
      if (!colorName || colorMap[colorName]) continue;
      colorMap[colorName] = {
        colorName,
        colorCode: sku.colorCode,
        frontImage: sku.colorFrontImage ? `https://www.ssactivewear.com/${sku.colorFrontImage}` : null,
        backImage: sku.colorBackImage ? `https://www.ssactivewear.com/${sku.colorBackImage}` : null,
        sideImage: sku.colorSideImage ? `https://www.ssactivewear.com/${sku.colorSideImage}` : null,
        swatchImage: sku.colorSwatchImage ? `https://www.ssactivewear.com/${sku.colorSwatchImage}` : null,
        customerPrice: sku.customerPrice || null,
      };
    }

    // Determine canonical size order
    const SIZE_ORDER = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','OSFA'];
    const sizes = [...sizeSet].sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.toUpperCase());
      const bi = SIZE_ORDER.indexOf(b.toUpperCase());
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const product = {
      styleID,
      title: style.title || `${style.brandName} ${style.styleName}`,
      brandName: style.brandName,
      styleName: style.styleName,
      partNumber: style.partNumber,
      description: style.description || '',
      lowestPrice,
      sizes,
    };

    return Response.json({ product, colors: Object.values(colorMap) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});