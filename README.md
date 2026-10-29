# D-Maths Board

The live interactive whiteboard for teachers, at **https://dmaths.academy**.

Teachers sign up, get a 7-day free trial, then pay ₦5,000 a year (Paystack). They start a
class, share a 6-digit PIN, and students join at `/join` with the PIN and their name (no
account). The board has slides, activities, answer boards, group boards, quick polls, live
quizzes, games, the e-lab and class reports to parents.

Split out of the Novelia Academy portal (`dmathstuition/dmaths`) in October 2026.

## Pages

| Path | What it is |
|---|---|
| `/` | Landing page |
| `/signup`, `/verify`, `/login` | Teacher account |
| `/app` | Teacher home: classes, lessons, quizzes, billing |
| `/join`, `/class/[id]` | Students join and follow a class |
| `/check` | "Check my class" connection test |
| `/report` | A parent's class report (signed link) |
| `/admin/board` | Subscribers (admins only) |

Old links under `/board/...` redirect to the same page without `/board`.

## Set-up

1. **Database:** in a new Supabase project, run `supabase/schema.sql` in the SQL Editor.
2. **Environment variables** (Vercel → Project → Settings → Environment Variables):

| Name | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | The board's Supabase project |
| `NEXT_PUBLIC_SITE_URL` | `https://dmaths.academy` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `EMAIL_RELAY_URL`, `EMAIL_RELAY_SECRET` | Apps Script email relay (same one as the academy) |
| `BOARD_SECRET` (optional) | Long random string for sign-in codes, signed class messages and report links (falls back to the service role key) |
| `CRON_SECRET` | Long random string; Vercel Cron sends it to `/api/cron/board-reminders` |
| `DEEPSEEK_API_KEY` (optional) | AI game questions and the lab tutor |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (optional) | Shared rate limits |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional) | Push notifications |

3. **Admin:** sign up on `/signup`, then in the SQL Editor run
   `update profiles set role = 'admin' where email = 'you@example.com';`

## Development

```bash
npm ci
npm run dev        # http://localhost:3000
npx vitest run     # unit tests
npm run build && CI=1 npm run e2e   # live-class browser tests
```
