import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PS_API_KEY = Deno.env.get("PSRESTFUL_API_KEY");
const BASE_URL = "https://api.psrestful.com";
const headers = { "X-API-Key": PS_API_KEY };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { supplier_code } = await req.json();

    // 1. Get suppliers (or just the one requested)
    let suppliers = [];
    if (supplier_code) {
      suppliers = [{ code: supplier_code, name: supplier_code }];
    } else {
      const res = await fetch(`${BASE_URL}/extra/v2/suppliers/?page_size=600`, { headers });
      const data = await res.json();
      suppliers = data.results || [];
    }

    let totalSynced = 0;
    let totalErrors = 0;

    for (const supplier of suppliers) {
      const scode = supplier.supplier_code || supplier.code;
      const sname = supplier.name || scode;

      // Page through all products for this supplier
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({ page, page_size: 50, supplier_code: scode });
        const res = await fetch(`${BASE_URL}/extra/v2/products/?${params}`, { headers });
        const data = await res.json();
        const products = data.results || [];
        if (products.length === 0) { hasMore = false; break; }

        // Fetch media for each product and upsert into entity
        for (const product of products) {
          try {
            const pid = product.extraId || product.id;
            const detailRes = await fetch(`${BASE_URL}/extra/v2/products/${pid}/?expand=medias`, { headers });
            const detail = await detailRes.json();

            const allMedias = detail?.medias?.MediaContentArray?.MediaContent || [];
            const seen = new Set();
            const media_urls = allMedias
              .filter(m => m.url && !seen.has(m.url) && seen.add(m.url))
              .map((m, i) => ({ url: m.url, view: m.description || m.color || `Image ${i + 1}` }));

            const record = {
              product_id: String(pid),
              product_name: detail.productName || detail.name || product.name || "",
              supplier_code: scode,
              supplier_name: sname,
              primary_image_url: detail.primaryImageURL || detail.primaryImageUrl || product.primaryImageUrl || "",
              media_urls,
            };

            // Check if already exists
            const existing = await base44.asServiceRole.entities.PSRestfulProduct.filter({ product_id: String(pid) });
            if (existing && existing.length > 0) {
              await base44.asServiceRole.entities.PSRestfulProduct.update(existing[0].id, record);
            } else {
              await base44.asServiceRole.entities.PSRestfulProduct.create(record);
            }
            totalSynced++;
          } catch (e) {
            totalErrors++;
          }
        }

        // Check if there are more pages
        const count = data.count || 0;
        if (page * 50 >= count) hasMore = false;
        else page++;
      }
    }

    return Response.json({ success: true, synced: totalSynced, errors: totalErrors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});