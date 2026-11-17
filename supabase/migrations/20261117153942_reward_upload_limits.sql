create function public.reward_upload_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select (select count(*) from storage.objects where bucket_id='reward-proofs' and split_part(name,'/',1)=auth.uid()::text)<10
 and (select count(*) from public.reward_proofs where user_id=auth.uid() and status='pending')<3;
$$;
create function public.reward_upload_is_orphan(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select split_part(p_path,'/',1)=auth.uid()::text and not exists(select 1 from public.reward_proofs where storage_path=p_path);
$$;
revoke all on function public.reward_upload_allowed(),public.reward_upload_is_orphan(text) from public,anon;
grant execute on function public.reward_upload_allowed(),public.reward_upload_is_orphan(text) to authenticated;
alter policy reward_proof_upload on storage.objects with check(bucket_id='reward-proofs' and (storage.foldername(name))[1]=auth.uid()::text and public.reward_upload_allowed());
create policy reward_orphan_cleanup on storage.objects for delete to authenticated using(bucket_id='reward-proofs' and public.reward_upload_is_orphan(name));
