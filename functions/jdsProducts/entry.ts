import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, skus, style } = await req.json();

    const jdsApiKey = Deno.env.get('JDS_API_KEY');
    if (!jdsApiKey) {
      return Response.json({ error: 'JDS API key not configured' }, { status: 500 });
    }

    // JDS popular product categories with real SKUs
    const categories = {
      "Tumblers": ["LTM7216", "STM651", "LTM7352", "LTM7319"],
      "Ringneck Tumblers": ["LTM7216", "LTM7352", "LTM7319"],
      "Sport & Golf": ["LTMGOLF1", "LTMGOLF2", "LTMGOLF3"],
      "Stemless Wine": ["PCG105", "PCG106", "PCG107"],
      "Drinkware Sets": ["DW500", "DW501", "DW502"],
      "Vacuum Insulated": ["STM651", "STM652", "STM653"],
      "Polar Camel": ["LTM7216", "STM651", "PCG105"]
    };

    // Get categories list
    if (action === 'getCategories') {
      const categoryList = Object.keys(categories).map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name
      }));
      return Response.json({ categories: categoryList });
    }

    // Get products by style category
    if (action === 'getProductsByStyle' && style) {
      try {
        const skuList = categories[style] || [];
        
        if (skuList.length === 0) {
          return Response.json({ products: [] });
        }

        const response = await fetch('https://api.jdsapp.com/get-product-details-by-skus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: jdsApiKey, 
            skus: skuList
          }),
        });

        if (!response.ok) {
          return Response.json({ products: [] });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : data.products || [];
        
        // Group by base SKU (first 5-6 chars) to collect all color variants
        const productsMap = new Map();
        allProducts.forEach(p => {
          // Extract base SKU and base name
          const baseSku = p.sku?.substring(0, 6) || '';
          const baseName = p.name?.replace(/\s+(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Red|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Tumbleweed|Coral|Blush|Peach|Lavender|Mint)(\s.*)?$/i, '') || p.sku;
          
          if (!productsMap.has(baseSku)) {
            productsMap.set(baseSku, {
              id: p.sku,
              sku: baseSku,
              name: baseName,
              thumbnail: p.thumbnail || p.image || '',
              inventory: {
                available: 0,
                local: 0
              },
              colors: []
            });
          }
          
          const product = productsMap.get(baseSku);
          product.inventory.available += p.availableQuantity || 0;
          product.inventory.local += p.localQuantity || 0;
          
          // Extract color from product name more accurately
          const colorMatch = p.name?.match(/(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Tumbleweed|Coral|Blush|Peach|Lavender|Mint)(\s|$)/i);
          const colorName = colorMatch ? colorMatch[1] : 'Default';
          
          // Check if this color already exists
          const existingColor = product.colors.find(c => c.colorName === colorName);
          if (!existingColor) {
            product.colors.push({
              colorName: colorName,
              colorCode: '#999999',
              colorSwatch: p.thumbnail || p.image || '',
              images: {
                Front: p.image || p.thumbnail || '',
                Back: '',
                'Left Sleeve': '',
                'Right Sleeve': ''
              }
            });
          }
        });
        
        const products = Array.from(productsMap.values());

        return Response.json({ products });
      } catch (err) {
        console.error('Failed to get JDS products by style:', err);
        return Response.json({ products: [] });
      }
    }

    // Get products by custom SKU list
    if (action === 'getProductsBySkus' && skus && Array.isArray(skus)) {
      try {
        const response = await fetch('https://api.jdsapp.com/get-product-details-by-skus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: jdsApiKey, 
            skus: skus
          }),
        });

        if (!response.ok) {
          return Response.json({ products: [] });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : data.products || [];
        
        // Group by base SKU (first 5-6 chars) to collect all color variants
        const productsMap = new Map();
        allProducts.forEach(p => {
          // Extract base SKU and base name
          const baseSku = p.sku?.substring(0, 6) || '';
          const baseName = p.name?.replace(/\s+(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Red|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Tumbleweed|Coral|Blush|Peach|Lavender|Mint)(\s.*)?$/i, '') || p.sku;
          
          if (!productsMap.has(baseSku)) {
            productsMap.set(baseSku, {
              id: p.sku,
              sku: baseSku,
              name: baseName,
              thumbnail: p.thumbnail || p.image || '',
              inventory: {
                available: 0,
                local: 0
              },
              colors: []
            });
          }
          
          const product = productsMap.get(baseSku);
          product.inventory.available += p.availableQuantity || 0;
          product.inventory.local += p.localQuantity || 0;
          
          // Extract color from product name more accurately
          const colorMatch = p.name?.match(/(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Tumbleweed|Coral|Blush|Peach|Lavender|Mint)(\s|$)/i);
          const colorName = colorMatch ? colorMatch[1] : 'Default';
          
          // Check if this color already exists
          const existingColor = product.colors.find(c => c.colorName === colorName);
          if (!existingColor) {
            product.colors.push({
              colorName: colorName,
              colorCode: '#999999',
              colorSwatch: p.thumbnail || p.image || '',
              images: {
                Front: p.image || p.thumbnail || '',
                Back: '',
                'Left Sleeve': '',
                'Right Sleeve': ''
              }
            });
          }
        });
        
        const products = Array.from(productsMap.values());

        return Response.json({ products });
      } catch (err) {
        console.error('Failed to get JDS products by SKUs:', err);
        return Response.json({ products: [] });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});