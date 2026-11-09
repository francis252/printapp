// Modern named keys first; legacy variables remain a compatibility fallback.
export function projectKey(type:'publishable'|'secret'):string {
 const name=type==='publishable'?'SUPABASE_PUBLISHABLE_KEYS':'SUPABASE_SECRET_KEYS';
 const legacy=type==='publishable'?'SUPABASE_ANON_KEY':'SUPABASE_SERVICE_ROLE_KEY';
 const raw=Deno.env.get(name);
 if(raw){const keys=JSON.parse(raw);if(typeof keys.default==='string'&&keys.default)return keys.default;}
 const fallback=Deno.env.get(legacy);if(fallback)return fallback;
 throw new Error('Supabase server keys are not configured.');
}
