# Moving D-Maths Board teachers from Novelia

Teachers keep their email, password, trial, paid-until date, payments, lessons,
quizzes and past classes. Nothing is deleted from Novelia.

1. Open **Novelia's** Supabase project → **SQL Editor** → **New query**.
   Paste all of [`1-run-in-novelia.sql`](1-run-in-novelia.sql) and click **Run**.
   You get up to 3 rows: `accounts`, `lessons`, `classes`. `rows_inside` says how
   many records each one carries.
2. For each row, in order (accounts first):
   - Click its **copy_this** cell and copy the whole value.
   - Open the **dmaths board** Supabase project → **SQL Editor** → **New query**,
     paste, and click **Run**. "Success. No rows returned" means it worked.
   - Skip a row whose `rows_inside` is 0.
3. Check in the dmaths board project: **Authentication → Users** lists the teachers.

Running a step twice is safe: anything already copied is skipped.

If a copied cell looks cut off (the paste doesn't end with `end $move$;`), use the
**Export → Download CSV** button on the results instead and copy the value from
the file.

Slides and pictures in lessons still load from Novelia's storage, so keep that
project's "materials" bucket.
