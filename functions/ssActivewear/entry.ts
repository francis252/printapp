import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://api.ssactivewear.com/v2';

Deno.serve(async (req) => {
  const body = await req.json();
  const { action, styleNumber, brandName, categoryID, search } = body;

  const accountNumber = Deno.env.get('SS_ACCOUNT_NUMBER');
  const apiKey = Deno.env.get('SS_API_KEY');
  const credentials = btoa(`${accountNumber}:${apiKey}`);
  const headers = { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' };

  // Action: fetch brands list
  if (action === 'getBrands') {
    const res = await fetch(`${BASE_URL}/brands/?mediatype=json`, { headers });
    const data = await res.json();
    return Response.json({ brands: data });
  }

  // Action: fetch categories list
  if (action === 'getCategories') {
    const res = await fetch(`${BASE_URL}/categories/?mediatype=json`, { headers });
    const data = await res.json();
    return Response.json({ categories: data });
  }

  // Action: browse styles by brand or category or search
  if (action === 'browseStyles') {
    const searchTerm = search || brandName;
    if (!searchTerm) return Response.json({ error: 'Provide search or brandName' }, { status: 400 });
    const url = `${BASE_URL}/styles?search=${encodeURIComponent(searchTerm)}&mediatype=json`;
    const res = await fetch(url, { headers });
    if (!res.ok) return Response.json({ styles: [] });
    let styles = await res.json();
    // Filter by exact brand if browsing by brand
    if (brandName && !search && styles?.length) {
      styles = styles.filter(s => s.brandName?.toLowerCase() === brandName.toLowerCase());
    }
    // Filter by category if provided
    if (categoryID && styles?.length) {
      styles = styles.filter(s => s.categories && s.categories.split(',').includes(String(categoryID)));
    }
    return Response.json({ styles: styles || [] });
  }

  // Default: fetch products by style number / name (search by style code)
  const style = (styleNumber || '').trim();
  if (!style) return Response.json({ error: 'styleNumber is required' }, { status: 400 });

  // Try search first
  const searchRes = await fetch(`${BASE_URL}/styles?search=${encodeURIComponent(style)}&mediatype=json`, { headers });
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData?.length) {
      return await fetchProductsByStyleID(searchData[0].styleID, searchData[0], headers);
    }
  }

  // Fallback: direct path
  const styleRes = await fetch(`${BASE_URL}/styles/${encodeURIComponent(style)}?mediatype=json`, { headers });
  if (!styleRes.ok) return Response.json({ error: `Style "${style}" not found.` }, { status: 404 });
  const styleData = await styleRes.json();
  if (!styleData?.length) return Response.json({ error: `Style "${style}" not found.` }, { status: 404 });
  return await fetchProductsByStyleID(styleData[0].styleID, styleData[0], headers);
});

async function fetchProductsByStyleID(styleID, styleInfo, headers) {
  const productsRes = await fetch(`https://api.ssactivewear.com/v2/products/?styleid=${styleID}&mediatype=json`, { headers });
  if (!productsRes.ok) return Response.json({ error: 'Could not fetch products.' }, { status: 500 });

  const data = await productsRes.json();
  const colorMap = {};
  for (const product of data) {
    const key = product.colorName || product.colorCode;
    if (!colorMap[key]) {
      colorMap[key] = {
        colorName: product.colorName,
        colorCode: product.colorCode,
        brandName: product.brandName,
        styleName: product.styleName,
        color1: product.color1 || '',
        colorSwatch: product.colorSwatchImage ? `https://www.ssactivewear.com/${product.colorSwatchImage}` : '',
        images: {
          Front: product.colorFrontImage ? `https://www.ssactivewear.com/${product.colorFrontImage.replace('_fm', '_fl')}` : '',
          Back: product.colorBackImage ? `https://www.ssactivewear.com/${product.colorBackImage.replace('_fm', '_fl')}` : '',
          'Left Sleeve': product.colorSideImage ? `https://www.ssactivewear.com/${product.colorSideImage.replace('_fm', '_fl')}` : '',
          'Right Sleeve': product.colorDirectSideImage
            ? `https://www.ssactivewear.com/${product.colorDirectSideImage.replace('_fm', '_fl')}`
            : (product.colorSideImage ? `https://www.ssactivewear.com/${product.colorSideImage.replace('_fm', '_fl')}` : ''),
        }
      };
    }
  }

  return Response.json({ products: Object.values(colorMap), styleID, styleInfo });
}