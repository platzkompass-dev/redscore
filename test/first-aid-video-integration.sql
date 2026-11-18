-- Run inside a rollback-only transaction after the video lesson migration.
do $$
declare u uuid:=gen_random_uuid(); result jsonb;
begin
 insert into auth.users(id,aud,role,email) values(u,'authenticated','authenticated','first-aid-video-qa@example.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 result:=public.red_rewards('start_lesson','{"lesson":"first-aid-basics"}');
 if result->>'started_at' is null then raise exception 'Missing lesson start timestamp';end if;
 update public.reward_learning set started_at=now()-interval '224 seconds' where user_id=u;
 begin
  perform public.red_rewards('complete_lesson','{"lesson":"first-aid-basics","answer":1}');
  raise exception 'Early video quiz accepted';
 exception when others then
  if sqlerrm='Early video quiz accepted' then raise;end if;
 end;
 update public.reward_learning set started_at=now()-interval '226 seconds' where user_id=u;
 perform public.red_rewards('complete_lesson','{"lesson":"first-aid-basics","answer":1}');
 perform public.red_rewards('complete_lesson','{"lesson":"first-aid-basics","answer":1}');
 if(public.red_rewards('snapshot')->>'balance')::integer<>30 then raise exception 'Incorrect video lesson credit';end if;
 if(select count(*) from public.reward_lessons where id='first-aid-basics' and video_url like 'https://www.redscore.de/%de.mp4' and video_url_en like 'https://www.redscore.de/%en.mp4' and min_seconds=225)<>1 then raise exception 'Missing video metadata';end if;
end $$;
