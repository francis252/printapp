export const BUCKET = 'shop-files';
export const FILE_REF = 'shop-file://';
const mapDeep = (value, fn) => Array.isArray(value) ? value.map(x => mapDeep(x,fn)) :
  value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapDeep(v,fn)])) : fn(value);
export function privateFileReference(value, origin) {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    if (url.origin !== origin) return value;
    const prefix = `/storage/v1/object/sign/${BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return value;
    return FILE_REF + decodeURIComponent(url.pathname.slice(prefix.length));
  } catch { return value; }
}
export function createStorageAdapter(client, getOrgId, origin) {
  const cache = new Map();
  const dehydrate = value => mapDeep(value, leaf => privateFileReference(leaf,origin));
  async function hydrate(value) {
    if (Array.isArray(value)) return Promise.all(value.map(hydrate));
    if (value && typeof value==='object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k,v])=>[k,await hydrate(v)])));
    if (typeof value!=='string' || !value.startsWith(FILE_REF)) return value;
    const path = value.slice(FILE_REF.length);
    const org = await getOrgId();
    if (!path.startsWith(`${org}/`) || path.split('/').some(s=>s==='..')) throw new Error('Invalid private file reference');
    const cached = cache.get(path);
    if (cached && cached.until>Date.now()) return cached.url;
    const {data,error} = await client.storage.from(BUCKET).createSignedUrl(path,3600);
    if(error) throw error;
    cache.set(path,{url:data.signedUrl,until:Date.now()+50*60*1000});
    return data.signedUrl;
  }
  async function UploadFile({file}) {
    const org = await getOrgId();
    const {data:{user},error:authError} = await client.auth.getUser();
    if(authError || !user) throw new Error('Sign in to upload artwork');
    if(!file || file.size>25*1024*1024) throw new Error('Choose a file smaller than 25 MB');
    const name = file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
    const path = `${org}/${user.id}/${crypto.randomUUID()}-${name}`;
    const {error} = await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
    if(error) throw error;
    return {file_url:await hydrate(FILE_REF+path)};
  }
  return {hydrate,dehydrate,UploadFile};
}
