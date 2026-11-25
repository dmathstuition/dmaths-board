-- Assignments (homework) for D-Maths Board classes. Run once in the Supabase
-- SQL editor; safe to run again. Only the server (service role) reads and
-- writes these — learners reach their work through a signed personal link.

-- An assignment: set during or after a class, done at home by the deadline.
create table if not exists public.board_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  host_id uuid,
  title text not null default 'Assignment',
  instructions text not null default '',
  items jsonb not null default '[]'::jsonb,   -- lib/assignments.ts: choice | typed | written | page | board | upload
  files jsonb not null default '[]'::jsonb,   -- notes / resources for learners (pictures of pages)
  for_ids jsonb,                              -- null: everyone in the class; else these learners
  due_at timestamptz,
  late_ok boolean not null default true,      -- learners may still hand in after the due date (marked late)
  review boolean not null default true,       -- show the answers and worked solutions once it's marked
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists board_assignments_session on public.board_assignments (session_id, created_at desc);

-- One learner's work on an assignment: their answers (by item number), the
-- teacher's marks and marking on their pages, feedback, and where it's at.
create table if not exists public.board_assignment_entries (
  assignment_id uuid not null references public.board_assignments(id) on delete cascade,
  student_id text not null,
  name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  marks jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  feedback text not null default '',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  returned_at timestamptz,
  sent_back boolean not null default false,
  tries integer not null default 0,
  score integer,
  total integer,
  primary key (assignment_id, student_id)
);

-- The evening reminder email to parents (lib/homeworkReminders.ts): on or off,
-- and when it went (once per assignment).
alter table public.board_assignments add column if not exists remind boolean not null default true;
alter table public.board_assignments add column if not exists reminded_at timestamptz;

alter table public.board_assignments enable row level security;
alter table public.board_assignment_entries enable row level security;
-- No policies: only the server (service role) reads and writes them.
