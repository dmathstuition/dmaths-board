-- Exam mode and the class leaderboard (D-Maths Board). Run once in the
-- Supabase SQL editor. Only the server (service role) reads and writes these.

-- An exam: a timed test learners take on their own phones.
create table if not exists public.board_exams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  host_id uuid,
  title text not null default 'Class test',
  questions jsonb not null default '[]'::jsonb,   -- [{ q, kind: "choice" | "typed", options, answer, marks }]
  minutes integer not null default 20 check (minutes between 1 and 180),
  review boolean not null default true,           -- learners see the right answers once it ends
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  ends_at timestamptz not null,
  closed_at timestamptz
);
create index if not exists board_exams_session on public.board_exams (session_id, created_at desc);

-- One learner's go at an exam: their answers (by question number), how often
-- they left the exam page, and their mark.
create table if not exists public.board_exam_entries (
  exam_id uuid not null references public.board_exams(id) on delete cascade,
  student_id text not null,
  name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  flags integer not null default 0,
  flag_log jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  total integer,
  primary key (exam_id, student_id)
);

-- Games learners play when the teacher sends one to their phones (for stars).
create table if not exists public.board_game_scores (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id text not null,
  name text not null default '',
  game_id text not null,
  difficulty text not null default 'easy',
  score integer not null default 0,
  correct integer not null default 0,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists board_game_scores_session on public.board_game_scores (session_id);

alter table public.board_exams enable row level security;
alter table public.board_exam_entries enable row level security;
alter table public.board_game_scores enable row level security;
