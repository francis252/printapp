-- REVIEW ONLY. Run on the selected staging project after creating the real owner's Auth account.
-- Creates shop access: do not run until the owner, destination project and UUID are confirmed.
-- This file is deliberately outside migrations and is never executed by the application.
begin;
do $$
declare
 owner_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- REPLACE with the verified real Auth user UUID
 new_shop_id uuid;
begin
 if owner_user_id='00000000-0000-0000-0000-000000000000' or not exists(select 1 from auth.users where id=owner_user_id) then
  raise exception 'Replace the placeholder with the verified owner Auth user UUID';
 end if;
 insert into public.shop_organizations(name) values('4R Shop Management') returning id into new_shop_id;
 insert into public.shop_members(org_id,user_id,role,display_name) values(new_shop_id,owner_user_id,'owner','Francis Rogers');
 -- Baseline confirmed from the current Base44 Pricing screen. No business records are created.
 insert into public.shop_records(org_id,record_type,id,created_by,data)
 values(new_shop_id,'ShopSettings','preferences',owner_user_id,'{"qm_markup":"125","qm_roundup":"false","qm_markup_tiers":"[]","qm_company_info":"{}"}'::jsonb);
end $$;
commit;
