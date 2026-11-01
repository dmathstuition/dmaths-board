-- Feedback and handed-in work kept with class-work marks, so each learner can
-- look back at their results after the class (My results).
--   feedback: the tutor's note to the learner
--   answer:   what they handed in — { text, imgs } (typed answer and photo links)
--   mark may now be empty: feedback given before (or without) a mark.
alter table public.live_class_marks add column if not exists feedback text not null default '';
alter table public.live_class_marks add column if not exists answer jsonb;
alter table public.live_class_marks alter column mark drop not null;
