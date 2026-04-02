import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PS_API_KEY = Deno.env.get("PSRESTFUL_API_KEY");
const BASE_URL = "https://api.psrestful.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, supplier_code, product_id, search, page = 1 } = await req.json();

    const headers = { "X-API-Key": PS_API_KEY };

    if (action === "list_suppliers") {
      const res = await fetch(`${BASE_URL}/extra/v2/suppliers/?page_size=600`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === "search_products") {
      const params = new URLSearchParams({ page, page_size: 20 });
      if (supplier_code) params.set("supplier_code", supplier_code);
      if (search) params.set("search", search);
      const res = await fetch(`${BASE_URL}/extra/v2/products/?${params}`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === "get_product") {
      // Fetch product details with media expansion
      const res = await fetch(`${BASE_URL}/extra/v2/products/${product_id}/?expand=medias`, { headers });
      const data = await res.json();
      const medias = data.medias || [];
      // Return only what the UI needs to keep payload small
      return Response.json({
        productId: data.productId,
        productName: data.productName || data.name,
        primaryImageURL: data.primaryImageURL || data.primaryImageUrl,
        medias,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});