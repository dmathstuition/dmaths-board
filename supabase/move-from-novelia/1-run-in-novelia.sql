-- ════════════════════════════════════════════════════════════════
--  MOVE D-MATHS BOARD TEACHERS — STEP 1 of 2
--  Run this in NOVELIA's Supabase project: SQL Editor → New query → Run.
--  It only READS. It returns up to 3 rows; each row's "copy_this" cell is a
--  ready-made script for STEP 2 (run those in the new "dmaths board" project).
--    row 1  accounts   teachers (with their passwords), trials and payments
--    row 2  lessons    their prepared lessons and saved quizzes
--    row 3  classes    their past classes and results (optional)
--  Who moves: every D-Maths Board teacher, plus the owner's admin account.
-- ════════════════════════════════════════════════════════════════
with ids as (
  select id from public.profiles
  where role = 'board_teacher' or (role = 'admin' and lower(email) = 'dmathstuition@gmail.com')
),
sess as (select id from public.live_sessions where kind = 'board' and host_id in (select id from ids)),
quiz as (select id from public.live_quizzes where session_id in (select id from sess)),
parts as (
  select 1 as step, 'accounts' as part, jsonb_build_object(
    'auth.users',            (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from auth.users x where id in (select id from ids)),
    'auth.identities',       (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from auth.identities x where user_id in (select id from ids)),
    'public.profiles',       (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.profiles x where id in (select id from ids)),
    'public.board_accounts', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.board_accounts x where user_id in (select id from ids)),
    'public.board_payments', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.board_payments x where user_id in (select id from ids))
  ) as data
  union all
  select 2, 'lessons', jsonb_build_object(
    'public.board_lessons',  (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.board_lessons x where owner_id in (select id from ids)),
    'public.quiz_sets',      (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.quiz_sets x where owner_id in (select id from ids))
  )
  union all
  select 3, 'classes', jsonb_build_object(
    'public.live_sessions',       (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.live_sessions x where id in (select id from sess)),
    'public.live_session_guests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.live_session_guests x where session_id in (select id from sess)),
    'public.live_quizzes',        (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.live_quizzes x where id in (select id from quiz)),
    'public.live_quiz_answers',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.live_quiz_answers x where quiz_id in (select id from quiz)),
    'public.live_class_marks',    (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.live_class_marks x where session_id in (select id from sess))
  )
)
select step, part,
  (select sum(jsonb_array_length(v)) from jsonb_each(data) as e(k, v)) as rows_inside,
  -- STEP 2 script: inserts each table's rows, only into columns both projects
  -- share, skipping anything already there. Safe to run twice.
  'do $move$ declare d jsonb := $data$' || data::text || $tail$$data$::jsonb; t text; cols text; n int; begin
  foreach t in array array['auth.users','auth.identities','public.profiles','public.board_accounts','public.board_payments','public.board_lessons','public.quiz_sets','public.live_sessions','public.live_session_guests','public.live_quizzes','public.live_quiz_answers','public.live_class_marks'] loop
    continue when not (d ? t) or jsonb_array_length(d->t) = 0;
    select string_agg(quote_ident(c.column_name), ', ') into cols from information_schema.columns c
     where c.table_schema = split_part(t, '.', 1) and c.table_name = split_part(t, '.', 2)
       and c.is_generated = 'NEVER' and (d->t->0) ? c.column_name;
    execute format('insert into %s (%s) select %s from jsonb_populate_recordset(null::%s, $1) on conflict do nothing', t, cols, cols, t) using d->t;
    get diagnostics n = row_count;
    raise notice '% : % new rows', t, n;
  end loop;
end $move$;$tail$ as copy_this
from parts
order by step;
