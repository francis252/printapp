export const RECORD_TYPES = Object.freeze([
  'Customer','Product','Supplier','Quote','QuoteLineItem','Job','PurchaseOrder',
  'ColorPalette','Task','Presentation','Invoice','Expense','ShopSettings',
]);
export function stripMetadata(input = {}) {
  const { id, org_id, created_date, updated_date, created_by, _version, _ssColors, ...data } = input;
  return data;
}
export function flattenRecord(row) {
  return { ...row.data, id: row.id, org_id: row.org_id,
    created_date: row.created_at, updated_date: row.updated_at,
    created_by: row.created_by, _version: row.version };
}
const METADATA = { id:'id', created_date:'created_at', updated_date:'updated_at', org_id:'org_id' };
export function createEntityRepository(client, getOrgId, type, { hydrate = async x => x, dehydrate = x => x } = {}) {
  if (!RECORD_TYPES.includes(type)) throw new Error(`Unsupported entity: ${type}`);
  async function read(filters = {}, sort = '-created_date', limit) {
    const orgId = await getOrgId();
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) throw new Error('Invalid record limit');
    const rows = [];
    const ascending = !sort.startsWith('-');
    const key = sort.replace(/^-/, '');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) throw new Error('Invalid sort field');
    for (let offset = 0; limit === undefined || rows.length < limit; offset += 500) {
      const size = Math.min(500, limit === undefined ? 500 : limit - rows.length);
      let query = client.from('shop_records').select('*').eq('org_id', orgId).eq('record_type', type);
      const jsonFilters = {};
      for (const [field, value] of Object.entries(filters)) {
        if (Object.hasOwn(METADATA, field)) query = query.eq(METADATA[field], value);
        else jsonFilters[field] = value;
      }
      if (Object.keys(jsonFilters).length) query = query.contains('data', dehydrate(jsonFilters));
      query = query.order(METADATA[key] || `data->${key}`, { ascending }).order('id', { ascending:true });
      const { data, error } = await query.range(offset, offset + size - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < size) break;
    }
    return Promise.all(rows.map(row => hydrate(flattenRecord(row))));
  }
  return {
    list: (sort, limit) => read({}, sort, limit),
    filter: (filters, sort, limit) => read(filters, sort, limit),
    async create(input) {
      const org_id = await getOrgId();
      const { data, error } = await client.from('shop_records').insert({
        org_id, record_type:type, data:dehydrate(stripMetadata(input)),
      }).select().single();
      if (error) throw error;
      return hydrate(flattenRecord(data));
    },
    async update(id, input) {
      const org_id = await getOrgId();
      const { data, error } = await client.rpc('shop_patch_record', {
        p_org_id:org_id, p_record_type:type, p_id:id,
        p_patch:dehydrate(stripMetadata(input)), p_expected_version:input._version ?? null,
      });
      if (error) throw error;
      return hydrate(flattenRecord(data));
    },
    async delete(id) {
      const org_id = await getOrgId();
      const { error } = await client.from('shop_records').delete().eq('org_id',org_id).eq('record_type',type).eq('id',id);
      if (error) throw error;
    },
  };
}
