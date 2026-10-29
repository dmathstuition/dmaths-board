-- ════════════════════════════════════════════════════════════════
--  D-MATHS BOARD — full database setup for a NEW, empty Supabase project
--  Creates every table, type, function, index and access rule the board
--  uses, plus the "materials" storage bucket for slides and pictures.
--  Run once in: Supabase Dashboard → SQL Editor → New query → Run.
--  Built from the academy's migrations (supabase/*.sql in the Novelia repo),
--  keeping only what the board needs.
-- ════════════════════════════════════════════════════════════════

SET check_function_bodies = false;
create extension if not exists pgcrypto;

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)


--
-- Name: app_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.app_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.app_status OWNER TO postgres;

--
-- Name: assignment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assignment_type AS ENUM (
    'written',
    'cbt',
    'code'
);


ALTER TYPE public.assignment_type OWNER TO postgres;

--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.submission_status AS ENUM (
    'pending',
    'submitted',
    'graded'
);


ALTER TYPE public.submission_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'admin',
    'parent',
    'tutor',
    'board_teacher'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: add_reward_points(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_reward_points(p_student uuid, p_points integer) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update profiles set reward_points = coalesce(reward_points, 0) + p_points
  where id = p_student returning reward_points;
$$;


ALTER FUNCTION public.add_reward_points(p_student uuid, p_points integer) OWNER TO postgres;

--
-- Name: enforce_staff_share(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_staff_share() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF COALESCE(NEW.shared, false) = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = NEW.user_id AND p.role IN ('admin', 'tutor')
    ) THEN
      NEW.shared := false;
      NEW.shared_by_name := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.enforce_staff_share() OWNER TO postgres;

--
-- Name: force_unverified_on_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.force_unverified_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.payment_verified := false;
  new.payment_verified_at := null;
  return new;
end; $$;


ALTER FUNCTION public.force_unverified_on_insert() OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','tutor')
  );
$$;


ALTER FUNCTION public.is_staff() OWNER TO postgres;

--
-- Name: next_student_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.next_student_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  yr        text := to_char(now(), 'YYYY');
  max_used  int;
  next_num  int;
begin
  -- Highest number currently in use for this year's prefix (0 if none).
  select coalesce(max((split_part(student_code, '-', 3))::int), 0)
    into max_used
    from profiles
   where student_code ~ ('^DM-' || yr || '-[0-9]+$');

  -- Lowest number in [1 .. max_used + 1] that no profile currently holds.
  -- A gap = the ID of a deleted learner, reused first; max_used + 1 guarantees
  -- a free slot when there are no gaps (i.e. normal sequential growth).
  select g
    into next_num
    from generate_series(1, max_used + 1) as g
   where not exists (
     select 1 from profiles
      where student_code = 'DM-' || yr || '-' || lpad(g::text, 4, '0')
   )
   order by g
   limit 1;

  return 'DM-' || yr || '-' || lpad(next_num::text, 4, '0');
end $_$;


ALTER FUNCTION public.next_student_code() OWNER TO postgres;

--
-- Name: recompute_attendance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recompute_attendance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update profiles set attendance = coalesce((
    select round(100.0 * count(*) filter (where present) / count(*))
    from attendance_records where student_id = new.student_id
  ), 0)
  where id = new.student_id;
  return new;
end; $$;


ALTER FUNCTION public.recompute_attendance() OWNER TO postgres;

--
-- Name: recompute_avg_score(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recompute_avg_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update profiles set avg_score = coalesce((
    select round(avg(grade)) from assignment_submissions
    where student_id = new.student_id and status = 'graded' and grade is not null
  ), 0)
  where id = new.student_id;
  return new;
end; $$;


ALTER FUNCTION public.recompute_avg_score() OWNER TO postgres;

--
-- Name: student_code_to_email(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.student_code_to_email(code text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select email from profiles
  where upper(student_code) = upper(trim(code)) and is_active = true
  limit 1;
$$;


ALTER FUNCTION public.student_code_to_email(code text) OWNER TO postgres;

--
-- Name: tutor_teaches(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tutor_teaches(student uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_students ts
    WHERE ts.teacher_id = auth.uid() AND ts.student_id = student
  ) OR EXISTS (
    SELECT 1 FROM classes c
    JOIN class_students cs ON cs.class_id = c.id
    WHERE c.tutor_id = auth.uid() AND cs.student_id = student
  );
$$;


ALTER FUNCTION public.tutor_teaches(student uuid) OWNER TO postgres;



--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: board_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_accounts (
    user_id uuid NOT NULL,
    school text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    email_verified_at timestamp with time zone,
    verify_code_hash text,
    verify_expires_at timestamp with time zone,
    verify_attempts integer DEFAULT 0 NOT NULL,
    verify_sent_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    paid_until timestamp with time zone,
    reminded_14_at timestamp with time zone,
    reminded_3_at timestamp with time zone,
    suspended boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.board_accounts OWNER TO postgres;

--
-- Name: board_lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    title text DEFAULT 'Untitled lesson'::text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    shared boolean DEFAULT false NOT NULL,
    board jsonb DEFAULT '{"v": 2, "bg": [null], "pages": [[]], "paper": ["plain"]}'::jsonb NOT NULL,
    widgets jsonb,
    pages integer DEFAULT 1 NOT NULL,
    items integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.board_lessons OWNER TO postgres;

--
-- Name: board_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_payments (
    reference text NOT NULL,
    user_id uuid NOT NULL,
    amount_ngn integer NOT NULL,
    channel text,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.board_payments OWNER TO postgres;

--
-- Name: class_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    level text DEFAULT ''::text NOT NULL,
    kind text DEFAULT 'group'::text NOT NULL,
    tutor_id uuid,
    capacity integer DEFAULT 12 NOT NULL,
    schedule_note text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    track text DEFAULT 'level'::text NOT NULL,
    exam text DEFAULT ''::text NOT NULL,
    promotes_to uuid,
    auto_created boolean DEFAULT false NOT NULL,
    CONSTRAINT class_groups_capacity_check CHECK (((capacity >= 1) AND (capacity <= 200))),
    CONSTRAINT class_groups_kind_check CHECK ((kind = ANY (ARRAY['group'::text, 'one_to_one'::text]))),
    CONSTRAINT class_groups_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text]))),
    CONSTRAINT class_groups_track_check CHECK ((track = ANY (ARRAY['level'::text, 'exam'::text, 'custom'::text])))
);


ALTER TABLE public.class_groups OWNER TO postgres;

--
-- Name: class_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_students (
    class_id uuid NOT NULL,
    student_id uuid NOT NULL
);


ALTER TABLE public.class_students OWNER TO postgres;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject text NOT NULL,
    tutor text NOT NULL,
    platform text DEFAULT 'Zoom'::text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    link text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reminded_at timestamp with time zone,
    series_id uuid,
    recording_url text DEFAULT ''::text NOT NULL,
    tutor_id uuid,
    live_since timestamp with time zone,
    mode text DEFAULT 'online'::text NOT NULL,
    location text,
    attendance_locked boolean DEFAULT false NOT NULL,
    group_id uuid,
    class_type text,
    rate_tier text DEFAULT 'standard'::text NOT NULL,
    CONSTRAINT classes_class_type_check CHECK (((class_type IS NULL) OR (class_type = ANY (ARRAY['group'::text, 'one_to_one'::text]))))
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: game_ai_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_ai_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    difficulty text NOT NULL,
    item_key text NOT NULL,
    item jsonb NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_ai_items_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


ALTER TABLE public.game_ai_items OWNER TO postgres;

--
-- Name: game_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_assignments (
    game_id text NOT NULL,
    level text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_assignments_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


ALTER TABLE public.game_assignments OWNER TO postgres;

--
-- Name: game_mastery; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_mastery (
    student_id uuid NOT NULL,
    tag text NOT NULL,
    game_id text DEFAULT ''::text NOT NULL,
    fixes integer DEFAULT 1 NOT NULL,
    first_try integer DEFAULT 0 NOT NULL,
    mastered_at timestamp with time zone DEFAULT now() NOT NULL,
    last_fixed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_mastery OWNER TO postgres;

--
-- Name: game_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    game_id text NOT NULL,
    level text DEFAULT ''::text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    score integer NOT NULL,
    correct integer DEFAULT 0 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stop_id text,
    avg_ms integer,
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT game_scores_score_check CHECK (((score >= 0) AND (score <= 10000)))
);


ALTER TABLE public.game_scores OWNER TO postgres;

--
-- Name: lesson_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid,
    subject text DEFAULT ''::text,
    topic text NOT NULL,
    notes text DEFAULT ''::text,
    homework text DEFAULT ''::text,
    taught_on date DEFAULT CURRENT_DATE NOT NULL,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_notes OWNER TO postgres;

--
-- Name: live_board_inbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_board_inbox (
    session_id uuid NOT NULL,
    item_id text NOT NULL,
    kind text DEFAULT 'add'::text NOT NULL,
    sender text NOT NULL,
    page integer DEFAULT 0 NOT NULL,
    item jsonb NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT live_board_inbox_kind_check CHECK ((kind = ANY (ARRAY['add'::text, 'move'::text])))
);


ALTER TABLE public.live_board_inbox OWNER TO postgres;

--
-- Name: live_class_marks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_class_marks (
    session_id uuid NOT NULL,
    round_id text NOT NULL,
    student_id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    question text DEFAULT ''::text NOT NULL,
    mark integer NOT NULL,
    max_mark integer NOT NULL,
    marked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT live_class_marks_mark_check CHECK ((mark >= 0)),
    CONSTRAINT live_class_marks_max_mark_check CHECK (((max_mark >= 1) AND (max_mark <= 100)))
);


ALTER TABLE public.live_class_marks OWNER TO postgres;

--
-- Name: live_quiz_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_quiz_answers (
    quiz_id uuid NOT NULL,
    idx integer NOT NULL,
    student_id uuid NOT NULL,
    choice integer NOT NULL,
    correct boolean NOT NULL,
    ms integer DEFAULT 0 NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    streak integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.live_quiz_answers OWNER TO postgres;

--
-- Name: live_quizzes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid,
    host_id uuid,
    title text DEFAULT 'Quick quiz'::text NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'lobby'::text NOT NULL,
    current integer DEFAULT '-1'::integer NOT NULL,
    started_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    session_id uuid,
    set_id uuid,
    CONSTRAINT live_quizzes_status_check CHECK ((status = ANY (ARRAY['lobby'::text, 'question'::text, 'reveal'::text, 'leaderboard'::text, 'ended'::text])))
);


ALTER TABLE public.live_quizzes OWNER TO postgres;

--
-- Name: live_session_guests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_session_guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    name text NOT NULL,
    token_hash text NOT NULL,
    can_write boolean DEFAULT false NOT NULL,
    removed boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    hand_raised_at timestamp with time zone,
    parent_contact text
);


ALTER TABLE public.live_session_guests OWNER TO postgres;

--
-- Name: live_session_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_session_participants (
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    can_write boolean DEFAULT false NOT NULL,
    removed boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    hand_raised_at timestamp with time zone
);


ALTER TABLE public.live_session_participants OWNER TO postgres;

--
-- Name: live_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    host_id uuid,
    class_id uuid,
    title text DEFAULT 'Interactive class'::text NOT NULL,
    status text DEFAULT 'live'::text NOT NULL,
    all_can_write boolean DEFAULT false NOT NULL,
    board jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    kind text DEFAULT 'academy'::text NOT NULL,
    CONSTRAINT live_sessions_status_check CHECK ((status = ANY (ARRAY['live'::text, 'ended'::text])))
);


ALTER TABLE public.live_sessions OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    email text DEFAULT ''::text,
    amount numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    channel text DEFAULT ''::text,
    plan text DEFAULT ''::text,
    camp text DEFAULT ''::text,
    status text NOT NULL,
    paid_at timestamp with time zone,
    raw jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    student_code text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text DEFAULT ''::text,
    dob date,
    address text DEFAULT ''::text,
    school text DEFAULT ''::text,
    level text DEFAULT ''::text,
    guardian_name text DEFAULT ''::text,
    guardian_contact text DEFAULT ''::text,
    subjects text[] DEFAULT '{}'::text[] NOT NULL,
    avg_score integer DEFAULT 0 NOT NULL,
    attendance integer DEFAULT 0 NOT NULL,
    stars integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    grade_target integer,
    reward_points integer DEFAULT 0 NOT NULL,
    sanction_points integer DEFAULT 0 NOT NULL,
    guardian_email text DEFAULT ''::text,
    last_login_at timestamp with time zone,
    streak_count integer DEFAULT 0 NOT NULL,
    streak_last_date date,
    last_digest_at timestamp with time zone,
    referred_by uuid,
    referral_count integer DEFAULT 0 NOT NULL,
    sub_active boolean DEFAULT false NOT NULL,
    sub_amount numeric DEFAULT 0 NOT NULL,
    sub_due_date date,
    sub_reminded_at timestamp with time zone,
    avatar_choice text,
    avatar_title text,
    learning_mode text,
    sub_billed_month text,
    package_tier text,
    streak_freezes integer DEFAULT 0 NOT NULL,
    boost_until timestamp with time zone,
    country text DEFAULT 'NG'::text,
    exam_target text DEFAULT ''::text,
    availability_slots text[] DEFAULT '{}'::text[] NOT NULL,
    availability_note text DEFAULT ''::text NOT NULL,
    pay_rate_one_to_one numeric(10,2) DEFAULT 0 NOT NULL,
    pay_rate_group numeric(10,2) DEFAULT 0 NOT NULL,
    bank_name text DEFAULT ''::text NOT NULL,
    bank_account_number text DEFAULT ''::text NOT NULL,
    bank_account_name text DEFAULT ''::text NOT NULL,
    CONSTRAINT profiles_attendance_check CHECK (((attendance >= 0) AND (attendance <= 100))),
    CONSTRAINT profiles_avg_score_check CHECK (((avg_score >= 0) AND (avg_score <= 100))),
    CONSTRAINT profiles_grade_target_check CHECK (((grade_target >= 0) AND (grade_target <= 100))),
    CONSTRAINT profiles_learning_mode_check CHECK (((learning_mode IS NULL) OR (learning_mode = ANY (ARRAY['group'::text, 'one_to_one'::text, 'both'::text])))),
    CONSTRAINT profiles_stars_check CHECK (((stars >= 0) AND (stars <= 5)))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    level text DEFAULT ''::text NOT NULL,
    topic text DEFAULT ''::text NOT NULL,
    question text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    answer integer DEFAULT 0 NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    exam text DEFAULT ''::text,
    group_name text DEFAULT ''::text,
    image_url text DEFAULT ''::text
);


ALTER TABLE public.question_bank OWNER TO postgres;

--
-- Name: quiz_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    title text DEFAULT 'Untitled quiz'::text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quiz_sets OWNER TO postgres;

--
-- Name: reward_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reward_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    source text NOT NULL,
    ref text NOT NULL,
    day date DEFAULT ((now() AT TIME ZONE 'Africa/Lagos'::text))::date NOT NULL,
    points integer NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reward_events_points_check CHECK ((points > 0))
);


ALTER TABLE public.reward_events OWNER TO postgres;

--
-- Name: student_code_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_code_seq OWNER TO postgres;

--
-- Name: teacher_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_students (
    teacher_id uuid NOT NULL,
    student_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teacher_students OWNER TO postgres;

--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: board_accounts board_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_accounts
    ADD CONSTRAINT board_accounts_pkey PRIMARY KEY (user_id);


--
-- Name: board_lessons board_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_lessons
    ADD CONSTRAINT board_lessons_pkey PRIMARY KEY (id);


--
-- Name: board_payments board_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_payments
    ADD CONSTRAINT board_payments_pkey PRIMARY KEY (reference);


--
-- Name: class_groups class_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_groups
    ADD CONSTRAINT class_groups_pkey PRIMARY KEY (id);


--
-- Name: class_students class_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_pkey PRIMARY KEY (class_id, student_id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: game_ai_items game_ai_items_kind_difficulty_item_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ai_items
    ADD CONSTRAINT game_ai_items_kind_difficulty_item_key_key UNIQUE (kind, difficulty, item_key);


--
-- Name: game_ai_items game_ai_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ai_items
    ADD CONSTRAINT game_ai_items_pkey PRIMARY KEY (id);


--
-- Name: game_assignments game_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_assignments
    ADD CONSTRAINT game_assignments_pkey PRIMARY KEY (game_id, level);


--
-- Name: game_mastery game_mastery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_mastery
    ADD CONSTRAINT game_mastery_pkey PRIMARY KEY (student_id, tag);


--
-- Name: game_scores game_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores
    ADD CONSTRAINT game_scores_pkey PRIMARY KEY (id);


--
-- Name: lesson_notes lesson_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_pkey PRIMARY KEY (id);


--
-- Name: live_board_inbox live_board_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_board_inbox
    ADD CONSTRAINT live_board_inbox_pkey PRIMARY KEY (session_id, item_id, kind);


--
-- Name: live_class_marks live_class_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_class_marks
    ADD CONSTRAINT live_class_marks_pkey PRIMARY KEY (session_id, round_id, student_id);


--
-- Name: live_quiz_answers live_quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quiz_answers
    ADD CONSTRAINT live_quiz_answers_pkey PRIMARY KEY (quiz_id, idx, student_id);


--
-- Name: live_quizzes live_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quizzes
    ADD CONSTRAINT live_quizzes_pkey PRIMARY KEY (id);


--
-- Name: live_session_guests live_session_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_session_guests
    ADD CONSTRAINT live_session_guests_pkey PRIMARY KEY (id);


--
-- Name: live_session_participants live_session_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_session_participants
    ADD CONSTRAINT live_session_participants_pkey PRIMARY KEY (session_id, student_id);


--
-- Name: live_sessions live_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_reference_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reference_key UNIQUE (reference);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_student_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_student_code_key UNIQUE (student_code);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: quiz_sets quiz_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_pkey PRIMARY KEY (id);


--
-- Name: reward_events reward_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward_events
    ADD CONSTRAINT reward_events_pkey PRIMARY KEY (id);


--
-- Name: reward_events reward_events_student_id_source_ref_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward_events
    ADD CONSTRAINT reward_events_student_id_source_ref_key UNIQUE (student_id, source, ref);


--
-- Name: teacher_students teacher_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_students
    ADD CONSTRAINT teacher_students_pkey PRIMARY KEY (teacher_id, student_id);


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id);


--
-- Name: board_accounts board_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_accounts
    ADD CONSTRAINT board_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: board_lessons board_lessons_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_lessons
    ADD CONSTRAINT board_lessons_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: board_payments board_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_payments
    ADD CONSTRAINT board_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: class_groups class_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_groups
    ADD CONSTRAINT class_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: class_groups class_groups_promotes_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_groups
    ADD CONSTRAINT class_groups_promotes_to_fkey FOREIGN KEY (promotes_to) REFERENCES public.class_groups(id) ON DELETE SET NULL;


--
-- Name: class_groups class_groups_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_groups
    ADD CONSTRAINT class_groups_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: class_students class_students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_students class_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: classes classes_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.class_groups(id) ON DELETE SET NULL;


--
-- Name: classes classes_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: game_assignments game_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_assignments
    ADD CONSTRAINT game_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: game_mastery game_mastery_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_mastery
    ADD CONSTRAINT game_mastery_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: game_scores game_scores_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_scores
    ADD CONSTRAINT game_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lesson_notes lesson_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: lesson_notes lesson_notes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: live_board_inbox live_board_inbox_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_board_inbox
    ADD CONSTRAINT live_board_inbox_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_class_marks live_class_marks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_class_marks
    ADD CONSTRAINT live_class_marks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_quiz_answers live_quiz_answers_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quiz_answers
    ADD CONSTRAINT live_quiz_answers_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.live_quizzes(id) ON DELETE CASCADE;


--
-- Name: live_quizzes live_quizzes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quizzes
    ADD CONSTRAINT live_quizzes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: live_quizzes live_quizzes_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quizzes
    ADD CONSTRAINT live_quizzes_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: live_quizzes live_quizzes_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quizzes
    ADD CONSTRAINT live_quizzes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_quizzes live_quizzes_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_quizzes
    ADD CONSTRAINT live_quizzes_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.quiz_sets(id) ON DELETE SET NULL;


--
-- Name: live_session_guests live_session_guests_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_session_guests
    ADD CONSTRAINT live_session_guests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_session_participants live_session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_session_participants
    ADD CONSTRAINT live_session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_session_participants live_session_participants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_session_participants
    ADD CONSTRAINT live_session_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: live_sessions live_sessions_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: live_sessions live_sessions_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_bank question_bank_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: quiz_sets quiz_sets_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sets
    ADD CONSTRAINT quiz_sets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reward_events reward_events_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward_events
    ADD CONSTRAINT reward_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: teacher_students teacher_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_students
    ADD CONSTRAINT teacher_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: teacher_students teacher_students_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_students
    ADD CONSTRAINT teacher_students_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: classes admin manage classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage classes" ON public.classes USING (public.is_admin());


--
-- Name: profiles admin manage profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage profiles" ON public.profiles USING (public.is_admin());


--
-- Name: class_students admin manage roster; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage roster" ON public.class_students USING (public.is_admin());


--
-- Name: teacher_students admin manage teacher_students; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage teacher_students" ON public.teacher_students USING (public.is_admin());


--
-- Name: audit_log admin read audit; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT USING (public.is_admin());


--
-- Name: payments admin read payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin read payments" ON public.payments FOR SELECT USING (public.is_admin());


--
-- Name: game_assignments admin write game assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin write game assignments" ON public.game_assignments USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: board_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.board_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: board_lessons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.board_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: board_payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.board_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: class_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: class_students; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: game_ai_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_ai_items ENABLE ROW LEVEL SECURITY;

--
-- Name: game_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: game_mastery; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_mastery ENABLE ROW LEVEL SECURITY;

--
-- Name: game_scores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: live_board_inbox; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_board_inbox ENABLE ROW LEVEL SECURITY;

--
-- Name: live_class_marks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_class_marks ENABLE ROW LEVEL SECURITY;

--
-- Name: live_quiz_answers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_quiz_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: live_quizzes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: live_session_guests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_session_guests ENABLE ROW LEVEL SECURITY;

--
-- Name: live_session_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: live_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles own profile read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.is_admin()));


--
-- Name: profiles own profile update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (((id = auth.uid()) OR public.is_admin()));


--
-- Name: notifications own_notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY own_notifications ON public.notifications USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions own_push_subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY own_push_subscriptions ON public.push_subscriptions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: question_bank; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_sets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quiz_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: game_assignments read game assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read game assignments" ON public.game_assignments FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: live_quiz_answers read own live answers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own live answers" ON public.live_quiz_answers FOR SELECT USING (((student_id = auth.uid()) OR public.is_staff()));


--
-- Name: game_mastery read own mastery; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own mastery" ON public.game_mastery FOR SELECT USING (((student_id = auth.uid()) OR public.is_staff()));


--
-- Name: game_scores read own or staff game scores; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own or staff game scores" ON public.game_scores FOR SELECT USING (((student_id = auth.uid()) OR public.is_staff()));


--
-- Name: reward_events read own reward events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own reward events" ON public.reward_events FOR SELECT USING (((student_id = auth.uid()) OR public.is_staff()));


--
-- Name: class_students read own roster; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own roster" ON public.class_students FOR SELECT USING (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: live_session_participants read own session seat; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own session seat" ON public.live_session_participants FOR SELECT USING (((student_id = auth.uid()) OR public.is_staff()));


--
-- Name: reward_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;

--
-- Name: class_groups staff read class groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read class groups" ON public.class_groups FOR SELECT USING (public.is_staff());


--
-- Name: lesson_notes staff read lesson notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read lesson notes" ON public.lesson_notes FOR SELECT USING (public.is_staff());


--
-- Name: live_quizzes staff read live quizzes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read live quizzes" ON public.live_quizzes FOR SELECT USING (public.is_staff());


--
-- Name: live_sessions staff read live sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read live sessions" ON public.live_sessions FOR SELECT USING (public.is_staff());


--
-- Name: question_bank staff read question bank; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read question bank" ON public.question_bank FOR SELECT USING (public.is_staff());


--
-- Name: quiz_sets staff read quiz sets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff read quiz sets" ON public.quiz_sets FOR SELECT USING (public.is_staff());


--
-- Name: lesson_notes staff write lesson notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "staff write lesson notes" ON public.lesson_notes USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: payments student reads own payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "student reads own payments" ON public.payments FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: classes students read own classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students read own classes" ON public.classes FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.class_students cs
  WHERE ((cs.class_id = classes.id) AND (cs.student_id = auth.uid()))))));


--
-- Name: teacher_students; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_students tutor own assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tutor own assignments" ON public.teacher_students FOR SELECT USING ((teacher_id = auth.uid()));


--
-- Name: class_students tutor read own class rosters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tutor read own class rosters" ON public.class_students FOR SELECT USING (public.tutor_teaches(student_id));


--
-- Name: classes tutor read own classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tutor read own classes" ON public.classes FOR SELECT USING ((tutor_id = auth.uid()));


--
-- Name: profiles tutor read own learners; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tutor read own learners" ON public.profiles FOR SELECT USING (public.tutor_teaches(id));


--
-- PostgreSQL database dump complete
--

-- Storage: slides and pictures put on the board (public read; uploads go
-- through the server with signed URLs).
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', true, 10485760)
on conflict (id) do nothing;
drop policy if exists "public read materials" on storage.objects;
create policy "public read materials" on storage.objects for select using (bucket_id = 'materials');
