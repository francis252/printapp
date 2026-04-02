import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jdsApiKey = Deno.env.get('JDS_API_KEY');
    if (!jdsApiKey) {
      return Response.json({ error: 'JDS API key not configured' }, { status: 500 });
    }

    // Popular JDS product categories with sample SKUs
    const categories = {
      "Drinkware": ["LTM7216", "STM651", "LTM7352", "LTM7319", "PCG105", "PCG106", "PCG107"],
      "Awards": ["AWD001", "AWD002", "AWD003", "AWD004", "AWD005"],
      "Tumblers": ["LTM7216", "LTM7352", "LTM7319", "STM651", "STM652"],
      "Vacuum Insulated": ["STM651", "STM652", "STM653", "STM654"],
      "Stemless Wine": ["PCG105", "PCG106", "PCG107", "PCG108"],
      "Sport & Golf": ["GOLF001", "GOLF002", "GOLF003"],
      "Polar Camel": ["LTM7216", "STM651", "PCG105"]
    };

    const productsToImport = [];
    
    // Fetch products from JDS API for each category
    for (const [categoryName, skus] of Object.entries(categories)) {
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

        if (!response.ok) continue;

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : data.products || [];
        
        // Group by base SKU to collect color variants
        const productsMap = new Map();
        
        allProducts.forEach(p => {
          const baseSku = p.sku?.substring(0, 6) || '';
          const baseName = p.name?.replace(/\s+(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Coral|Blush|Peach|Lavender|Mint)(\s.*)?$/i, '') || p.sku;
          
          if (!productsMap.has(baseSku)) {
            productsMap.set(baseSku, {
              name: baseName,
              brand: categoryName,
              image: p.image || p.thumbnail || '',
              colors: []
            });
          }
          
          const product = productsMap.get(baseSku);
          
          // Extract color from product name
          const colorMatch = p.name?.match(/(Black|White|Navy|Blue|Red|Green|Yellow|Orange|Purple|Pink|Gray|Grey|Olive|Tan|Beige|Brown|Cream|Silver|Gold|Charcoal|Burgundy|Maroon|Rose|Sage|Copper|Bronze|Slate|Gunmetal|Linen|Mauve|Plum|Rust|Teal|Coral|Blush|Peach|Lavender|Mint)(\s|$)/i);
          const colorName = colorMatch ? colorMatch[1] : 'Default';
          
          // Check if color already exists
          const existingColor = product.colors.find(c => c.color_name === colorName);
          if (!existingColor) {
            product.colors.push({
              color_name: colorName,
              color_code: '#999999',
              swatch_url: p.image || p.thumbnail || ''
            });
          }
        });
        
        // Convert to import format
        for (const [baseSku, product] of productsMap) {
          if (product.image || product.colors.some(c => c.swatch_url)) {
            productsToImport.push({
              name: product.name,
              brand: product.brand,
              images: {
                Front: product.image
              },
              color_swatches: product.colors.filter(c => c.swatch_url || c.color_code)
            });
          }
        }
      } catch (err) {
        // Continue on category error
        console.error(`Failed to fetch category ${categoryName}:`, err);
      }
    }

    if (productsToImport.length === 0) {
      return Response.json({
        success: false,
        imported: 0,
        message: 'No products found from JDS API'
      });
    }

    // Bulk import products
    const result = await base44.entities.CustomProduct.bulkCreate(productsToImport);

    return Response.json({
      success: true,
      imported: result.length || productsToImport.length,
      message: `Successfully imported ${result.length || productsToImport.length} JDS products`
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: error.message,
      success: false,
      imported: 0
    }, { status: 500 });
  }
});