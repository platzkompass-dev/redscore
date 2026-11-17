-- RedRewards: the ledger is append-only for users; all changes go through a
-- constrained authenticated function. Points and stock are never client values.
create table public.reward_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.reward_ledger(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, points integer not null check(points<>0), description text not null,
 created_at timestamptz not null default now(), unique(user_id,event_key));
create table public.reward_lessons(
 id text primary key, title text not null, title_en text not null, body text not null, body_en text not null,
 question text not null, question_en text not null, options jsonb not null, options_en jsonb not null,
 video_url text, points integer not null check(points between 1 and 500), enabled boolean not null default true);
create table public.reward_answers(lesson_id text primary key references public.reward_lessons(id), correct integer not null check(correct between 0 and 3));
create table public.reward_learning(
 user_id uuid references auth.users(id) on delete cascade, lesson_id text references public.reward_lessons(id),
 started_at timestamptz not null default now(), attempts integer not null default 0, attempted_at timestamptz,
 completed_at timestamptz, primary key(user_id,lesson_id));
create table public.reward_proofs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(length(provider) between 2 and 120),course_date date not null,
 storage_path text not null unique,file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 review_note text not null default '',reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 created_at timestamptz not null default now(), unique(file_hash),unique(user_id,provider,course_date));
create table public.reward_catalog(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 3 and 100),
 name_en text not null,description text not null,description_en text not null,
 points integer not null check(points between 100 and 100000),stock integer not null default 0 check(stock between 0 and 10000),
 active boolean not null default false,updated_at timestamptz not null default now());
create table public.reward_redemptions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 reward_id uuid not null references public.reward_catalog(id),reward_name text not null,points integer not null check(points>0),
 request_key uuid not null,shipping jsonb not null,
 status text not null default 'requested' check(status in('requested','processing','shipped','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,request_key));
-- All tables deny client writes, including the admin allowlist and quiz answers.
do $$ declare t text; begin foreach t in array array['reward_admins','reward_ledger','reward_lessons','reward_answers','reward_learning','reward_proofs','reward_catalog','reward_redemptions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop; end $$;
create function public.is_reward_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.reward_admins where user_id=auth.uid()); $$;
revoke all on function public.is_reward_admin() from public;
grant execute on function public.is_reward_admin() to authenticated;
insert into public.reward_admins(user_id) select id from auth.users where lower(email)='administration@redscore.de' and email_confirmed_at is not null;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('reward-proofs','reward-proofs',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy reward_proof_upload on storage.objects for insert to authenticated with check(bucket_id='reward-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy reward_proof_read on storage.objects for select to authenticated using(bucket_id='reward-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_reward_admin()));
insert into public.reward_catalog(name,name_en,description,description_en,points) values
('LED-Taschenlampe','LED torch','Vorschlag: kompakte Taschenlampe für deine Notfallausrüstung. Modell und Bestand werden vor Freigabe festgelegt.','Proposal: a compact torch for your emergency kit. Model and stock will be set before release.',500),
('Erste-Hilfe-Set','First-aid kit','Vorschlag: kompaktes Erste-Hilfe-Set für unterwegs. Modell und Bestand werden vor Freigabe festgelegt.','Proposal: a compact travel first-aid kit. Model and stock will be set before release.',1000),
('Notfallrucksack','Emergency backpack','Vorschlag: robuster Rucksack ohne Befüllung. Modell und Bestand werden vor Freigabe festgelegt.','Proposal: a durable, empty backpack. Model and stock will be set before release.',2000);
insert into public.reward_lessons(id,title,title_en,body,body_en,question,question_en,options,options_en,points) values
('water-basics','Trinkwasser sinnvoll bevorraten','Store drinking water wisely',
'Plane Trinkwasser für deinen Haushalt ein. Das BBK empfiehlt möglichst zehn Tage Vorrat; schon drei Tage helfen. Rechne als Richtwert mit zwei Litern pro Person und Tag für Trinken und Kochen. Besondere Bedürfnisse, Hitze und Haustiere können zusätzlichen Bedarf verursachen. Lagere Wasser kühl, dunkel und hygienisch. Ein Filter ersetzt keinen Vorrat.',
'Plan drinking water for your household. Germany’s BBK recommends aiming for ten days; three days already help. Use two litres per person per day for drinking and cooking as a planning guide. Special needs, heat and pets may increase demand. Store water cool, dark and hygienically. A filter does not replace stored water.',
'Wie viel Wasser sind für zwei Personen und drei Tage nach diesem Richtwert einzuplanen?','Using this guide, how much water should two people plan for three days?',
'["2 Liter","6 Liter","12 Liter"]','["2 litres","6 litres","12 litres"]',30),
('power-basics','Sicher durch einen Stromausfall','Stay safe during a power cut',
'Halte Taschenlampe, passende Batterien und eine geladene Powerbank griffbereit. Ein batteriebetriebenes oder Kurbelradio hilft, Informationen zu empfangen. Nutze Campingkocher, Grills und Generatoren niemals in geschlossenen Räumen: Es besteht unter anderem die Gefahr einer Kohlenmonoxidvergiftung. Beachte immer die Hinweise des Herstellers und amtliche Anweisungen.',
'Keep a torch, compatible batteries and a charged power bank ready. A battery-powered or wind-up radio helps you receive information. Never use camping stoves, barbecues or generators indoors: carbon monoxide poisoning is one of the risks. Follow manufacturer instructions and official guidance.',
'Welche Vorbereitung ist bei einem Stromausfall sinnvoll und sicher?','Which preparation is useful and safe during a power cut?',
'["Grill in der Wohnung aufstellen","Geladene Powerbank und Taschenlampe bereithalten","Generator im Wohnzimmer starten"]','["Set up a barbecue indoors","Keep a charged power bank and torch ready","Run a generator in the living room"]',30);
insert into public.reward_answers values('water-basics',2),('power-basics',1);

create function public.red_rewards(p_action text default 'snapshot',p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); adm boolean; balance bigint; earned integer; k text; s jsonb; lesson public.reward_lessons;
 learning public.reward_learning; proof public.reward_proofs; prize public.reward_catalog; redemption public.reward_redemptions; rec record; rid uuid; st text;
begin
 if u is null then raise exception 'Anmeldung erforderlich'; end if;
 adm:=public.is_reward_admin();
 -- Serialize all requests spending or earning on this account.
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if p_action='earn' then
  k:=p_data->>'activity'; earned:=0;
  if k='profile' and exists(select 1 from public.user_profiles where user_id=u and onboarding_completed=true) then earned:=50;
  elsif k='assessment' and exists(select 1 from public.user_app_state where user_id=u and assessment->>'completedAt' is not null and jsonb_typeof(assessment->'answers')='object' and (select count(*) from jsonb_object_keys(assessment->'answers'))>=10) then earned:=100;
  elsif k='supplies' and exists(select 1 from public.user_app_state where user_id=u and supplies->>'water' is not null and supplies->>'food' is not null) then earned:=50;
  end if;
  if earned=0 then raise exception 'Aktivität noch nicht im Konto gespeichert'; end if;
  insert into public.reward_ledger(user_id,event_key,points,description) values(u,'activity:'||k,earned,'activity:'||k) on conflict(user_id,event_key) do nothing;
 elsif p_action='start_lesson' then
  if not exists(select 1 from public.reward_lessons where id=p_data->>'lesson' and enabled) then raise exception 'Lerneinheit nicht verfügbar'; end if;
  insert into public.reward_learning(user_id,lesson_id) values(u,p_data->>'lesson') on conflict do nothing;
 elsif p_action='complete_lesson' then
  select * into lesson from public.reward_lessons where id=p_data->>'lesson' and enabled;
  select * into learning from public.reward_learning where user_id=u and lesson_id=lesson.id for update;
  if learning.user_id is null or now()-learning.started_at<interval '30 seconds' then raise exception 'Bitte beschäftige dich zuerst mit der Lerneinheit'; end if;
  if learning.completed_at is not null then return jsonb_build_object('ok',true); end if;
  if learning.attempts>=3 and now()-learning.attempted_at<interval '1 hour' then raise exception 'Bitte versuche es in einer Stunde erneut'; end if;
  update public.reward_learning set attempts=case when now()-attempted_at>=interval '1 hour' then 1 else attempts+1 end,attempted_at=now() where user_id=u and lesson_id=lesson.id;
  if not exists(select 1 from public.reward_answers where lesson_id=lesson.id and correct=(p_data->>'answer')::integer) then return jsonb_build_object('ok',false,'error','Die Antwort stimmt noch nicht. Lies die Hinweise nochmals.'); end if;
  update public.reward_learning set completed_at=now() where user_id=u and lesson_id=lesson.id;
  insert into public.reward_ledger(user_id,event_key,points,description) values(u,'lesson:'||lesson.id,lesson.points,'lesson:'||lesson.id) on conflict do nothing;
 elsif p_action='submit_proof' then
  if (select count(*) from public.reward_proofs where user_id=u and status='pending')>=3 then raise exception 'Es sind bereits drei Nachweise in Prüfung'; end if;
  if (p_data->>'course_date')::date>current_date or (p_data->>'course_date')::date<current_date-interval '3 years' then raise exception 'Kursdatum muss in den letzten drei Jahren liegen'; end if;
  if split_part(p_data->>'path','/',1)<>u::text or not exists(select 1 from storage.objects where bucket_id='reward-proofs' and name=p_data->>'path') then raise exception 'Upload fehlt'; end if;
  insert into public.reward_proofs(user_id,provider,course_date,storage_path,file_hash) values(u,trim(p_data->>'provider'),(p_data->>'course_date')::date,p_data->>'path',p_data->>'hash');
 elsif p_action='proof_path' then
  select * into proof from public.reward_proofs where id=(p_data->>'id')::uuid and (user_id=u or adm);
  if proof.id is null then raise exception 'Nachweis nicht gefunden'; end if;
  return jsonb_build_object('path',proof.storage_path);
 elsif p_action='redeem' then
  if exists(select 1 from public.reward_redemptions where user_id=u and request_key=(p_data->>'request_key')::uuid) then return jsonb_build_object('ok',true); end if;
  select * into prize from public.reward_catalog where id=(p_data->>'reward_id')::uuid for update;
  if prize.id is null or not prize.active or prize.stock<1 then raise exception 'Prämie ist aktuell nicht verfügbar'; end if;
  select coalesce(sum(points),0) into balance from public.reward_ledger where user_id=u;
  if balance<prize.points then raise exception 'Nicht genügend RewardsPoints'; end if;
  s:=p_data->'shipping';
  if jsonb_typeof(s)<>'object' or length(trim(coalesce(s->>'name','')))<3 or length(trim(coalesce(s->>'street','')))<3 or coalesce(s->>'postal_code','')!~'^[0-9]{5}$' or length(trim(coalesce(s->>'city','')))<2 or s->>'country'<>'DE' or length(s::text)>1200 then raise exception 'Bitte vollständige Lieferadresse in Deutschland eingeben'; end if;
  rid:=gen_random_uuid();
  insert into public.reward_redemptions(id,user_id,reward_id,reward_name,points,request_key,shipping) values(rid,u,prize.id,prize.name,prize.points,(p_data->>'request_key')::uuid,jsonb_build_object('name',left(s->>'name',120),'street',left(s->>'street',160),'postal_code',s->>'postal_code','city',left(s->>'city',100),'country','DE'));
  insert into public.reward_ledger(user_id,event_key,points,description) values(u,'redemption:'||rid,-prize.points,prize.name);
  update public.reward_catalog set stock=stock-1,updated_at=now() where id=prize.id;
 elsif p_action in('review_proof','save_reward','fulfil','save_video') then
  if not adm then raise exception 'Keine Berechtigung'; end if;
  if p_action='review_proof' then
   select * into proof from public.reward_proofs where id=(p_data->>'id')::uuid for update;
   if proof.id is null or proof.status<>'pending' then raise exception 'Nachweis wurde bereits bearbeitet'; end if;
   if proof.user_id=u then raise exception 'Eigene Nachweise darfst du nicht selbst freigeben'; end if;
   st:=p_data->>'status'; if st not in('approved','rejected') then raise exception 'Ungültiger Status'; end if;
   if st='approved' then
    -- Only one first-aid participation award per account in each 24-month period.
    perform pg_advisory_xact_lock(hashtextextended(proof.user_id::text,0));
    if exists(select 1 from public.reward_ledger where user_id=proof.user_id and event_key like 'first-aid:%' and created_at>now()-interval '24 months') then raise exception 'Kursbonus wurde innerhalb der letzten 24 Monate bereits vergeben'; end if;
    perform pg_advisory_xact_lock(hashtextextended(proof.user_id::text,0));
    insert into public.reward_ledger(user_id,event_key,points,description) values(proof.user_id,'first-aid:'||proof.id,300,'first-aid');
   end if;
   update public.reward_proofs set status=st,review_note=left(coalesce(p_data->>'note',''),500),reviewed_by=u,reviewed_at=now() where id=proof.id;
  elsif p_action='save_reward' then
   update public.reward_catalog set name=left(trim(p_data->>'name'),100),points=(p_data->>'points')::integer,stock=(p_data->>'stock')::integer,active=(p_data->>'active')::boolean,updated_at=now() where id=(p_data->>'id')::uuid;
  elsif p_action='save_video' then
   if coalesce(p_data->>'url','')<>'' and (p_data->>'url' !~ '^https://' or length(p_data->>'url')>1000) then raise exception 'HTTPS-Video-Adresse erforderlich'; end if;
   update public.reward_lessons set video_url=nullif(p_data->>'url','') where id=p_data->>'id';
  else
   select * into redemption from public.reward_redemptions where id=(p_data->>'id')::uuid for update;
   st:=p_data->>'status';
   if redemption.id is null or redemption.status in('cancelled','shipped') or st not in('processing','shipped','cancelled') then raise exception 'Statuswechsel nicht möglich'; end if;
   if st='cancelled' then
    insert into public.reward_ledger(user_id,event_key,points,description) values(redemption.user_id,'refund:'||redemption.id,redemption.points,'refund') on conflict do nothing;
    update public.reward_catalog set stock=stock+1 where id=redemption.reward_id;
   end if;
   update public.reward_redemptions set status=st,updated_at=now() where id=redemption.id;
  end if;
 elsif p_action<>'snapshot' then raise exception 'Unbekannte Aktion';
 end if;
 if p_action<>'snapshot' then return jsonb_build_object('ok',true); end if;
 return jsonb_build_object(
  'balance',(select coalesce(sum(points),0) from public.reward_ledger where user_id=u),'admin',adm,
  'ledger',coalesce((select jsonb_agg(x order by x.created_at desc) from (select id,event_key,points,description,created_at from public.reward_ledger where user_id=u order by created_at desc limit 100)x),'[]'),
  'lessons',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('completed',exists(select 1 from public.reward_learning p where p.user_id=u and p.lesson_id=l.id and completed_at is not null))) from public.reward_lessons l where enabled),'[]'),
  'rewards',coalesce((select jsonb_agg(c order by c.points) from public.reward_catalog c),'[]'),
  'proofs',coalesce((select jsonb_agg(x order by x.created_at desc) from (select id,provider,course_date,status,review_note,created_at from public.reward_proofs where user_id=u)x),'[]'),
  'redemptions',coalesce((select jsonb_agg(x order by x.created_at desc) from (select id,reward_name,points,status,created_at from public.reward_redemptions where user_id=u)x),'[]'),
  'review_queue',case when adm then coalesce((select jsonb_agg(p order by p.created_at) from public.reward_proofs p where status='pending'),'[]') else '[]'::jsonb end,
  'fulfilment',case when adm then coalesce((select jsonb_agg(r order by r.created_at) from public.reward_redemptions r where status not in('cancelled','shipped')),'[]') else '[]'::jsonb end);
end $$;
revoke all on function public.red_rewards(text,jsonb) from public,anon;
grant execute on function public.red_rewards(text,jsonb) to authenticated;
