"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BoardFormPage } from "@/components/board/BoardBrand";
import { supabaseBrowser } from "@/lib/supabase/client";

// Set a new password after following the reset link. /auth/confirm has already
// signed the teacher in for this; no session means the link was bad or expired.
export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();
  const [checked, setChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setReady(!!data.user); setChecked(true); });
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== pw2) return setError("Passwords do not match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) { setBusy(false); return setError("Couldn't update your password. The link may have expired — ask for a new one."); }
    await supabase.auth.signOut();
    window.location.assign("/login?reset=done");
  }

  return (
    <BoardFormPage title="Set a new password" kicker="D-Maths Board account">
      {!checked ? (
        <p className="text-sm text-dmb-muted">Checking your reset link…</p>
      ) : !ready ? (
        <div className="space-y-4">
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">This reset link is invalid or has expired. Please ask for a new one.</p>
          <Link href="/login" className="dmb-btn w-full !min-h-[52px] text-base">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <label className="block text-sm font-bold text-dmb-ink">New password
            <input type="password" className="dmb-field mt-1" autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          <label className="block text-sm font-bold text-dmb-ink">Confirm new password
            <input type="password" className="dmb-field mt-1" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </label>
          <button className="dmb-btn w-full !min-h-[52px] text-base disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
        </form>
      )}
    </BoardFormPage>
  );
}
