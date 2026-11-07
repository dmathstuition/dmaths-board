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
