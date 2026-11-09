-- Review and run on a staging Supabase project first. Additive, shop-prefixed schema.
-- JSONB preserves the exact fields used by the exported application.
begin;
create table public.shop_organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name)>0),
 created_at timestamptz not null default now()
);
create table public.shop_members (
 org_id uuid not null references public.shop_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','manager','employee')),
 display_name text not null default '', primary key(org_id,user_id)
);
create table public.shop_records (
 org_id uuid not null references public.shop_organizations(id) on delete cascade,
 record_type text not null check(record_type in ('Customer','Product','Supplier','Quote','QuoteLineItem','Job','PurchaseOrder','ColorPalette','Task','Presentation','Invoice','Expense','ShopSettings')),
 id text not null default gen_random_uuid()::text,
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0), primary key(org_id,record_type,id)
);
create index shop_records_list on public.shop_records(org_id,record_type,created_at desc,id);
create index shop_records_data on public.shop_records using gin(data jsonb_path_ops);
create index shop_members_user on public.shop_members(user_id,org_id);
create table public.shop_conversions (
 org_id uuid not null, presentation_id text not null, request_id text not null,
 quote_id text not null, record_type text generated always as ('Presentation') stored,
 primary key(org_id,presentation_id,request_id),
 foreign key(org_id,record_type,presentation_id) references public.shop_records(org_id,record_type,id)
);
create function public.shop_role(p_org_id uuid) returns text
language sql stable security definer set search_path=public,pg_temp as $$
 select role from public.shop_members where org_id=p_org_id and user_id=auth.uid()
$$;
create function public.shop_can_access(p_org_id uuid,p_type text,p_creator uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.shop_role(p_org_id) in ('owner','manager') or
 (public.shop_role(p_org_id)='employee' and p_type not in ('Invoice','Expense')
 and (p_type<>'Presentation' or p_creator=auth.uid())),false)
$$;
alter table public.shop_organizations enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_records enable row level security;
alter table public.shop_conversions enable row level security;
revoke all on public.shop_organizations,public.shop_members,public.shop_records,public.shop_conversions from anon,authenticated;
grant select on public.shop_organizations,public.shop_members to authenticated;
grant select,insert,update,delete on public.shop_records to authenticated;
grant select,insert on public.shop_conversions to authenticated;
create policy shop_org_read on public.shop_organizations for select to authenticated using(public.shop_role(id) is not null);
create policy shop_members_read on public.shop_members for select to authenticated using(public.shop_role(org_id) is not null);
create policy shop_record_read on public.shop_records for select to authenticated using(public.shop_can_access(org_id,record_type,created_by));
create policy shop_record_insert on public.shop_records for insert to authenticated with check(public.shop_can_access(org_id,record_type,auth.uid()) and created_by=auth.uid() and (record_type<>'ShopSettings' or public.shop_role(org_id) in ('owner','manager')));
create policy shop_record_update on public.shop_records for update to authenticated using(public.shop_can_access(org_id,record_type,created_by) and (record_type<>'ShopSettings' or public.shop_role(org_id) in ('owner','manager'))) with check(public.shop_can_access(org_id,record_type,created_by) and (record_type<>'ShopSettings' or public.shop_role(org_id) in ('owner','manager')));
create policy shop_record_delete on public.shop_records for delete to authenticated using(public.shop_can_access(org_id,record_type,created_by) and (record_type<>'ShopSettings' or public.shop_role(org_id) in ('owner','manager')));
create policy shop_conversion_read on public.shop_conversions for select to authenticated using(exists(select 1 from public.shop_records r where r.org_id=shop_conversions.org_id and r.record_type='Presentation' and r.id=shop_conversions.presentation_id));
-- No direct conversion writes. Only the invoker RPC below can receive a scoped grant.
revoke insert on public.shop_conversions from authenticated;

create function public.shop_record_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_parent_type text; v_field text; v_parent_id text;
begin
 if tg_op='UPDATE' then
  if (new.org_id,new.record_type,new.id,new.created_by,new.created_at) is distinct from
     (old.org_id,old.record_type,old.id,old.created_by,old.created_at) then
    raise exception 'Record identity cannot be changed';
  end if;
  new.updated_at=now(); new.version=old.version+1;
 else
  if current_user in ('authenticated','anon') then
   new.created_by=auth.uid(); new.created_at=now(); new.version=1;
  end if;
 end if;
 -- Deny cross-shop relationships while retaining original text IDs.
 foreach v_field in array array['quote_id','customer_id'] loop
  v_parent_id=new.data->>v_field;
  v_parent_type=case v_field when 'quote_id' then 'Quote' else 'Customer' end;
  if coalesce(v_parent_id,'')<>'' and not exists(
    select 1 from public.shop_records where org_id=new.org_id and record_type=v_parent_type and id=v_parent_id
  ) then raise exception 'Related % is missing or belongs to another shop',v_parent_type; end if;
 end loop;
 return new;
end $$;
create trigger shop_record_guard before insert or update on public.shop_records for each row execute function public.shop_record_guard();

create function public.shop_patch_record(p_org_id uuid,p_record_type text,p_id text,p_patch jsonb,p_expected_version integer default null)
returns public.shop_records language plpgsql set search_path=public,pg_temp as $$
declare v_row public.shop_records;
begin
 if jsonb_typeof(p_patch)<>'object' then raise exception 'Patch must be an object'; end if;
 select * into v_row from public.shop_records where org_id=p_org_id and record_type=p_record_type and id=p_id for update;
 if not found then raise exception 'Record not found or access denied'; end if;
 if p_expected_version is not null and v_row.version<>p_expected_version then raise exception 'This record changed. Reload before saving.'; end if;
 update public.shop_records set data=data || (p_patch-array['id','org_id','created_by','created_date','updated_date','_version'])
 where org_id=p_org_id and record_type=p_record_type and id=p_id returning * into v_row;
 return v_row;
end $$;

create function public.shop_save_preferences(p_org_id uuid,p_patch jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if jsonb_typeof(p_patch)<>'object' or (p_patch-array['qm_markup','qm_roundup','qm_markup_tiers','qm_company_info'])<>'{}'::jsonb then raise exception 'Invalid settings'; end if;
 insert into public.shop_records(org_id,record_type,id,data) values(p_org_id,'ShopSettings','preferences',p_patch)
 on conflict(org_id,record_type,id) do update set data=shop_records.data||excluded.data returning data into result;
 return result;
end $$;
revoke all on function public.shop_save_preferences(uuid,jsonb) from public,anon;
grant execute on function public.shop_save_preferences(uuid,jsonb) to authenticated;

-- Conversion is one transaction. Existing quote editor owns the final totals and pricing.
create function public.shop_presentation_to_quote(p_org_id uuid,p_presentation_id text,p_item_ids text[],p_request_id text,p_expected_version integer)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.shop_records; v_quote text; v_item jsonb; v_selected text[]; v_found integer=0; v_order integer=0;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into v_p from public.shop_records where org_id=p_org_id and record_type='Presentation' and id=p_presentation_id for update;
 if not found or not public.shop_can_access(p_org_id,'Presentation',v_p.created_by) then raise exception 'Presentation not found or access denied'; end if;
 if cardinality(p_item_ids)=0 or p_item_ids is null then raise exception 'Choose at least one item'; end if;
 select array_agg(distinct x order by x) into v_selected from unnest(p_item_ids) x;
 if cardinality(v_selected)<>cardinality(p_item_ids) then raise exception 'Duplicate item selection'; end if;
 if p_request_id<>p_presentation_id||':'||p_expected_version::text||':'||array_to_string(v_selected,',') then raise exception 'Invalid conversion key'; end if;
 select quote_id into v_quote from public.shop_conversions where org_id=p_org_id and presentation_id=p_presentation_id and request_id=p_request_id;
 if found then return v_quote; end if;
 if v_p.version<>p_expected_version then raise exception 'Presentation changed. Save and reload before conversion.'; end if;
 for v_item in select value from jsonb_array_elements(coalesce(v_p.data->'items','[]'::jsonb)) loop
  if v_item->>'id'=any(v_selected) then v_found=v_found+1; end if;
 end loop;
 if v_found<>cardinality(v_selected) then raise exception 'One or more selected items are missing'; end if;
 insert into public.shop_records(org_id,record_type,created_by,data) values(p_org_id,'Quote',auth.uid(),jsonb_build_object(
   'quote_number','4R-'||substr(gen_random_uuid()::text,1,8),'job_name',coalesce(v_p.data->>'name',v_p.data->>'title','Presentation'),
   'customer_id',coalesce(v_p.data->>'customer_id',''),'customer_name',coalesce(v_p.data->>'customer_name',''),
   'customer_email',coalesce(v_p.data->>'customer_email',''),'company_name',coalesce(v_p.data->>'company_name',''),
   'sales_rep',coalesce(v_p.data->>'sales_rep',''),'status','Open','total',0,'shipping',0,'tax_rate',0,'discount',0,'deposit_percent',50,
   'terms','No Terms','notes','','internal_notes','Created from presentation. Review sizes and pricing before sending.',
   'source_presentation_id',p_presentation_id,'source_presentation_revision',p_expected_version
 )) returning id into v_quote;
 for v_item in select value from jsonb_array_elements(coalesce(v_p.data->'items','[]'::jsonb)) loop
  if v_item->>'id'=any(v_selected) then
   insert into public.shop_records(org_id,record_type,created_by,data) values(p_org_id,'QuoteLineItem',auth.uid(),
    (v_item-array['id','org_id','created_by','created_date','updated_date','_version','collection','selected','feedback','display_price'])
     ||jsonb_build_object('quote_id',v_quote,'sort_order',v_order,'item_type',coalesce(v_item->>'item_type','catalog'),
     'unit_price',coalesce(v_item->'unit_price','0'::jsonb),'sizes',coalesce(v_item->'sizes','[]'::jsonb)));
   v_order=v_order+1;
  end if;
 end loop;
 insert into public.shop_conversions(org_id,presentation_id,request_id,quote_id) values(p_org_id,p_presentation_id,p_request_id,v_quote);
 return v_quote;
end $$;

-- Private artwork. Each upload gets a unique path; no overwrite or anonymous read.
insert into storage.buckets(id,name,public,file_size_limit) values('shop-files','shop-files',false,26214400);
create policy shop_files_read on storage.objects for select to authenticated using(bucket_id='shop-files' and public.shop_role(((storage.foldername(name))[1])::uuid) is not null);
create policy shop_files_upload on storage.objects for insert to authenticated with check(bucket_id='shop-files' and public.shop_role(((storage.foldername(name))[1])::uuid) is not null and (storage.foldername(name))[2]=auth.uid()::text);

revoke all on function public.shop_role(uuid),public.shop_can_access(uuid,text,uuid),public.shop_record_guard(),public.shop_patch_record(uuid,text,text,jsonb,integer),public.shop_presentation_to_quote(uuid,text,text[],text,integer) from public,anon;
grant execute on function public.shop_role(uuid),public.shop_can_access(uuid,text,uuid),public.shop_patch_record(uuid,text,text,jsonb,integer),public.shop_presentation_to_quote(uuid,text,text[],text,integer) to authenticated;
commit;
