alter table public.reward_lessons
 add column video_url_en text,
 add column video_poster text,
 add column video_poster_en text,
 add column subtitles_url text,
 add column subtitles_url_en text,
 add column source_url text,
 add column min_seconds integer not null default 30 check(min_seconds between 30 and 1800);
insert into public.reward_lessons(id,title,title_en,body,body_en,question,question_en,options,options_en,points,video_url,video_url_en,video_poster,video_poster_en,subtitles_url,subtitles_url_en,source_url,min_seconds) values(
'first-aid-basics','Erste Hilfe: Prüfen. Rufen. Drücken.','First aid: Check. Call. Compress.','Kurztraining für Notfälle bei Erwachsenen. Eigene Sicherheit beachten. Keine Reaktion: sofort 112 organisieren, Lautsprecher einschalten. Normale Atmung höchstens zehn Sekunden prüfen. Schnappatmung ist keine normale Atmung. Bei normaler Atmung: stabile Seitenlage und weiter überwachen. Bei fehlender oder nicht normaler Atmung: sofort Herzdruckmassage. Auf fester Unterlage auf den Rücken legen; Handballen übereinander auf die untere Hälfte des Brustbeins. Mit gestreckten Armen 100–120 Mal pro Minute 5–6 cm tief drücken, vollständig entlasten. Wenn bereit und in der Lage: 30 Kompressionen und 2 Atemspenden, sonst durchgehend drücken. Andere Helfende einen AED holen lassen; Gerät einschalten und Anweisungen befolgen. Bei Analyse und Schock berührt niemand die Person. Weiterhelfen, bis der Rettungsdienst übernimmt oder normale Atmung und Lebenszeichen zurückkehren. Dieses Video ersetzt keinen praktischen Erste-Hilfe-Kurs und ist keine Teilnahmebescheinigung.','Mini training for adult emergencies. Keep yourself safe. No response: arrange an immediate call to 112 and use speakerphone. Check normal breathing for no more than ten seconds. Gasping is not normal breathing. With normal breathing: recovery position and monitoring. With absent or abnormal breathing: start chest compressions immediately. Place the adult on their back on a firm surface; put hands one on top of the other on the lower half of the breastbone. With straight arms, compress 100–120 times per minute, 5–6 cm deep, allowing full recoil. If willing and able: 30 compressions and 2 breaths; otherwise keep compressing. Ask another helper to fetch an AED; switch it on and follow instructions. Nobody touches the person during analysis or shock. Continue until emergency professionals take over or normal breathing and signs of life return. This video does not replace a practical first-aid course and is not an attendance certificate.','Eine erwachsene Person reagiert nicht und atmet nicht normal. Was tust du?','An adult is unresponsive and not breathing normally. What do you do?','["Nur in die stabile Seitenlage bringen und abwarten", "112 alarmieren und sofort Herzdruckmassage beginnen", "Zuerst nach einem Ausweis suchen"]','["Only put them in the recovery position and wait", "Call 112 and start chest compressions immediately", "Look for identification first"]',30,'https://www.redscore.de/media/training/redscore-erste-hilfe-de.mp4','https://www.redscore.de/media/training/redscore-erste-hilfe-en.mp4','https://www.redscore.de/media/training/redscore-erste-hilfe-de-poster.webp','https://www.redscore.de/media/training/redscore-erste-hilfe-en-poster.webp','https://www.redscore.de/media/training/redscore-erste-hilfe-de.vtt','https://www.redscore.de/media/training/redscore-erste-hilfe-en.vtt','https://www.grc-org.de/laien-schulen/39-44-Wie-funktioniert-eine-Reanimation',225);
insert into public.reward_answers values('first-aid-basics',1);
-- Preserve all other points and attempt rules.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.red_rewards(text,jsonb)'::regprocedure) into definition;
 if position('now()-learning.started_at<interval ''30 seconds''' in definition)=0 then raise exception 'Expected lesson timing guard was not found';end if;
 definition:=replace(definition,'now()-learning.started_at<interval ''30 seconds''','now()-learning.started_at<make_interval(secs => lesson.min_seconds)');
 definition:=replace(definition,
  'insert into public.reward_learning(user_id,lesson_id) values(u,p_data->>''lesson'') on conflict do nothing;',
  'insert into public.reward_learning(user_id,lesson_id) values(u,p_data->>''lesson'') on conflict do nothing; return (select jsonb_build_object(''ok'',true,''started_at'',started_at) from public.reward_learning where user_id=u and lesson_id=p_data->>''lesson'');');
 definition:=replace(definition,
  'update public.reward_lessons set video_url=nullif(p_data->>''url'','''') where id=p_data->>''id'';',
  'if coalesce(p_data->>''url_en'','''')<>'''' and (p_data->>''url_en'' !~ ''^https://'' or length(p_data->>''url_en'')>1000) then raise exception ''HTTPS-Video-Adresse erforderlich''; end if; update public.reward_lessons set video_url=nullif(p_data->>''url'',''''),video_url_en=nullif(p_data->>''url_en'','''') where id=p_data->>''id'';');
 execute definition;
end $migration$;
