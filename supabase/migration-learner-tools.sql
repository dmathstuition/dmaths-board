-- Learner tools: saved A.I results (practice sets and revision flashcards),
-- so each is written once and opens instantly after that.
-- Safe to run more than once. Without it everything still works; the A.I
-- results are just kept in the server's memory for a while instead.
create table if not exists public.board_ai_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.board_ai_cache enable row level security;
-- No policies: only the server (service role) reads and writes it.

-- Exams: whether learners may use the calculator on their phone (on unless the teacher switches it off),
-- whether everyone gets the questions in the same order (a SATs paper), and the
-- teacher's marks for pages of a paper they mark by hand.
-- (Skipped if exams aren't set up yet — run migration-exams-stars.sql, then this again.)
do $$ begin
  if to_regclass('public.board_exams') is not null then
    alter table public.board_exams add column if not exists calculator boolean not null default true;
    alter table public.board_exams add column if not exists in_order boolean not null default false;
    -- Papers the teacher marks by hand, page by page: their marks, by page.
    alter table public.board_exam_entries add column if not exists page_marks jsonb not null default '{}'::jsonb;
    -- Extra time for one learner (access arrangements), in milliseconds.
    alter table public.board_exam_entries add column if not exists extra_ms integer not null default 0;
    -- A spelling test: each learner's own words from earlier tests, added to their paper.
    alter table public.board_exam_entries add column if not exists extra_qs jsonb;
    alter table public.board_exams add column if not exists personal_words smallint not null default 0;
    -- A reading paper: the booklet's pages, shown beside the questions.
    alter table public.board_exams add column if not exists booklet jsonb;
  end if;
end $$;
