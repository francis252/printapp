begin;
create table public.shop_presentation_shares (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.shop_organizations(id),
 presentation_id text not null, record_type text generated always as ('Presentation') stored,
 revision integer not null, token_hash text unique not null, snapshot jsonb not null,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 expires_at timestamptz not null, revoked_at timestamptz,
 foreign key(org_id,record_type,presentation_id) references public.shop_records(org_id,record_type,id)
);
create table public.shop_presentation_feedback (
 share_id uuid not null references public.shop_presentation_shares(id), item_id text not null,visitor_id uuid not null,
 reaction text check(reaction in ('like','dislike') or reaction is null),
 comment text not null default '' check(length(comment)<=2000),updated_at timestamptz not null default now(),
 primary key(share_id,item_id,visitor_id)
);
alter table public.shop_presentation_shares enable row level security;
alter table public.shop_presentation_feedback enable row level security;
revoke all on public.shop_presentation_shares,public.shop_presentation_feedback from anon,authenticated;
grant select(id,org_id,presentation_id,revision,created_by,created_at,expires_at,revoked_at) on public.shop_presentation_shares to authenticated;
grant select on public.shop_presentation_feedback to authenticated;
create policy shop_share_staff on public.shop_presentation_shares for select to authenticated using(public.shop_can_access(org_id,'Presentation',created_by));
create policy shop_feedback_staff on public.shop_presentation_feedback for select to authenticated using(exists(select 1 from public.shop_presentation_shares s where s.id=share_id));

create function public.shop_create_presentation_share(p_org_id uuid,p_id text,p_expected_version integer,p_show_prices boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.shop_records; v_token text; v_id uuid; v_items jsonb; v_exp timestamptz;
begin
 select * into r from public.shop_records where org_id=p_org_id and record_type='Presentation' and id=p_id for update;
 if not found or not public.shop_can_access(p_org_id,'Presentation',r.created_by) then raise exception 'Presentation not found or access denied'; end if;
 if r.version<>p_expected_version then raise exception 'Presentation changed. Save and reload first.'; end if;
 if jsonb_array_length(coalesce(r.data->'items','[]'))=0 then raise exception 'Add products before sharing'; end if;
 v_exp=now()+interval '7 days';
 if coalesce(r.data->>'expiration_date','')<>'' then v_exp=least(v_exp,((r.data->>'expiration_date')::date+1)::timestamp at time zone 'America/Chicago'); end if;
 if v_exp<=now() then raise exception 'This presentation has expired'; end if;
 select jsonb_agg(jsonb_build_object(
  'id',i->>'id','collection',i->>'collection','product_name',i->>'product_name',
  'style_number',i->>'style_number','color',i->>'color','description',i->>'description',
  'decoration_method',i->>'decoration_method','images',case when jsonb_array_length(coalesce(i->'mockups','[]'))>0
   then (select jsonb_agg(m->>'url') from jsonb_array_elements(i->'mockups') m)
   else jsonb_build_array(i->>'product_image_url') end,
  'unit_price',case when p_show_prices then i->'unit_price' else null end
 )) into v_items from jsonb_array_elements(r.data->'items') i;
 if exists(select 1 from jsonb_array_elements(v_items) i cross join lateral jsonb_array_elements_text(i->'images') u
  where u like 'shop-file://%' and (u not like 'shop-file://'||p_org_id::text||'/%' or u like '%/../%')) then raise exception 'Artwork belongs to another shop'; end if;
 v_token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.shop_presentation_shares(org_id,presentation_id,revision,created_by,expires_at,token_hash,snapshot)
 values(p_org_id,p_id,r.version,auth.uid(),v_exp,encode(sha256(convert_to(v_token,'UTF8')),'hex'),
 jsonb_build_object('name',r.data->>'name','expiration_date',r.data->>'expiration_date','items',v_items)) returning id into v_id;
 return jsonb_build_object('id',v_id,'token',v_token,'expires_at',v_exp);
end $$;
create function public.shop_get_presentation_share(p_token text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.shop_presentation_shares;
begin
 if p_token is null or p_token!~'^[0-9a-f]{64}$' then raise exception 'Link unavailable'; end if;
 select * into s from public.shop_presentation_shares where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now();
 if not found then raise exception 'Link expired or unavailable'; end if;
 return jsonb_build_object('presentation',s.snapshot,'expires_at',s.expires_at,'revision',s.revision);
end $$;
create function public.shop_submit_presentation_feedback(p_token text,p_item_id text,p_visitor_id uuid,p_reaction text,p_comment text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.shop_presentation_shares;
begin
 if p_token is null or p_token!~'^[0-9a-f]{64}$' then raise exception 'Link unavailable'; end if;
 select * into s from public.shop_presentation_shares where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'Link expired or unavailable'; end if;
 if p_visitor_id is null or (p_reaction is not null and p_reaction not in ('like','dislike')) or length(coalesce(p_comment,''))>2000 then raise exception 'Invalid feedback'; end if;
 if not exists(select 1 from jsonb_array_elements(s.snapshot->'items') i where i->>'id'=p_item_id) then raise exception 'Item unavailable'; end if;
 if exists(select 1 from public.shop_presentation_feedback where share_id=s.id and item_id=p_item_id and visitor_id=p_visitor_id and updated_at>now()-interval '2 seconds') then raise exception 'Please wait a moment before resubmitting'; end if;
 if (select count(*) from public.shop_presentation_feedback where share_id=s.id and updated_at>now()-interval '1 minute')>=100 then raise exception 'Too many responses. Try again shortly.'; end if;
 insert into public.shop_presentation_feedback(share_id,item_id,visitor_id,reaction,comment)
 values(s.id,p_item_id,p_visitor_id,p_reaction,coalesce(p_comment,'')) on conflict(share_id,item_id,visitor_id)
 do update set reaction=excluded.reaction,comment=excluded.comment,updated_at=now();
end $$;
create function public.shop_revoke_presentation_share(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.shop_presentation_shares set revoked_at=now() where id=p_id and public.shop_can_access(org_id,'Presentation',created_by);
 if not found then raise exception 'Share not found or access denied'; end if;
end $$;
revoke all on function public.shop_create_presentation_share(uuid,text,integer,boolean),public.shop_get_presentation_share(text),public.shop_submit_presentation_feedback(text,text,uuid,text,text),public.shop_revoke_presentation_share(uuid) from public,anon,authenticated;
grant execute on function public.shop_create_presentation_share(uuid,text,integer,boolean),public.shop_revoke_presentation_share(uuid) to authenticated;
grant execute on function public.shop_get_presentation_share(text),public.shop_submit_presentation_feedback(text,text,uuid,text,text) to anon,authenticated;
commit;
