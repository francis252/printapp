// Ported from the supplied Base44 source. Authentication is enforced by the Edge entry point.
const SS_BASE = 'https://api.ssactivewear.com/v2';
const result = (data, options={}) => ({data,status:options.status||200});

export async function ssBrowse(input,deps) {
    const { query } = input;
    if (!query || query.trim().length < 2) return result({ error: 'query required (min 2 chars)' }, { status: 400 });

    const auth = deps.ssAuth;

    // Search styles
    const stylesRes = await deps.fetch(`${SS_BASE}/styles/?search=${encodeURIComponent(query.trim())}`, {
      headers: { 'Authorization': auth }
    });

    if (!stylesRes.ok) {
      const text = await stylesRes.text();
      return result({ error: `S&S API error: ${stylesRes.status}` }, { status: 502 });
    }

    const styles = await stylesRes.json();
    if (!styles || styles.length === 0) return result({ styles: [] });

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

    return result({ styles: results });
}


export async function ssGetStyle(input,deps) {
    const { styleID } = input;
    if (!styleID) return result({ error: 'styleID required' }, { status: 400 });

    const auth = deps.ssAuth;

    // Fetch all SKUs for this style to get full color/size/pricing data
    const [skusRes, stylesRes] = await Promise.all([
      deps.fetch(`${SS_BASE}/products/?styleid=${styleID}`, { headers: { 'Authorization': auth } }),
      deps.fetch(`${SS_BASE}/styles/?styleID=${styleID}`, { headers: { 'Authorization': auth } }),
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

    return result({ product, colors: Object.values(colorMap) });
}


export async function ssProductSearch(input,deps) {
    const { style_number } = input;
    if (!style_number) return result({ error: 'style_number required' }, { status: 400 });

    const auth = deps.ssAuth;
    const query = style_number.trim();

    // Step 1: Search styles to find the styleID
    const stylesRes = await deps.fetch(`${SS_BASE}/styles/?search=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': auth }
    });

    if (!stylesRes.ok) {
      const text = await stylesRes.text();
      return result({ error: `S&S styles API error: ${stylesRes.status}` }, { status: 502 });
    }

    const styles = await stylesRes.json();

    if (!styles || styles.length === 0) {
      return result({ product: null, colors: [] });
    }

    // Use the first matching style
    const style = styles[0];

    // Step 2: Fetch products (SKUs) for this styleID to get color images
    const productsRes = await deps.fetch(`${SS_BASE}/products/?styleid=${style.styleID}`, {
      headers: { 'Authorization': auth }
    });

    if (!productsRes.ok) {
      // Return style info without colors if products fail
      return result({
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

    return result({ product, colors: Object.values(colorMap) });
}
