"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/boardPlan";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return { ok: !!r?.ok, status: r?.status ?? 0, ...j } as { ok: boolean; status: number; error?: string } & Record<string, any>;
}

function PasswordField({ value, onChange, autoComplete, label = "Password", hint }: { value: string; onChange: (v: string) => void; autoComplete: string; label?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm font-bold text-dmb-ink">{label}
      <span className="relative mt-1 block">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} required autoComplete={autoComplete} className="dmb-field !pr-16" aria-describedby={hint ? "pw-hint" : undefined} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-black text-dmb-muted hover:text-dmb-ink" aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
      </span>
      {hint && <span id="pw-hint" className="mt-1 block text-xs font-semibold text-dmb-muted">{hint}</span>}
    </label>
  );
}

// ── Sign up ──
export function BoardSignupForm() {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", school: "", phone: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((o) => ({ ...o, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const weak = passwordProblem(f.password, f.email);
    if (weak) { setErr(weak); return; }
    if (!agree) { setErr("Please accept the terms to continue."); return; }
    setBusy(true);
    const r = await post("/api/board/signup", { ...f, agree });
    if (!r.ok) { setBusy(false); setErr(r.error ?? "We couldn't create your account — check your connection and try again."); return; }
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.password });
    if (error) { window.location.assign("/login?created=1"); return; }
    window.location.assign("/verify");
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-dmb-ink">First name<input value={f.firstName} onChange={set("firstName")} required maxLength={60} autoComplete="given-name" className="dmb-field mt-1" /></label>
        <label className="block text-sm font-bold text-dmb-ink">Last name<input value={f.lastName} onChange={set("lastName")} required maxLength={60} autoComplete="family-name" className="dmb-field mt-1" /></label>
      </div>
      <label className="block text-sm font-bold text-dmb-ink">Email<input type="email" value={f.email} onChange={set("email")} required maxLength={120} autoComplete="email" inputMode="email" className="dmb-field mt-1" /></label>
      <PasswordField value={f.password} onChange={(v) => setF((o) => ({ ...o, password: v }))} autoComplete="new-password" hint="At least 10 characters, with letters and a number." />
      <label className="block text-sm font-bold text-dmb-ink">School or organisation <span className="font-semibold text-dmb-muted">(optional)</span><input value={f.school} onChange={set("school")} maxLength={120} autoComplete="organization" className="dmb-field mt-1" /></label>
      <label className="block text-sm font-bold text-dmb-ink">Phone / WhatsApp <span className="font-semibold text-dmb-muted">(optional)</span><input type="tel" value={f.phone} onChange={set("phone")} maxLength={20} autoComplete="tel" inputMode="tel" className="dmb-field mt-1" /></label>
      {/* Hidden from people; bots fill it in. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>Website<input tabIndex={-1} value={f.website} onChange={set("website")} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-dmb-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-dmb-board" />
        <span>I agree to the <Link href="/terms" className="font-bold text-dmb-ink underline">terms</Link> and <Link href="/privacy" className="font-bold text-dmb-ink underline">privacy policy</Link>.</span>
      </label>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      <button type="submit" disabled={busy} className="dmb-btn w-full !min-h-[52px] text-base">{busy ? "Creating your account…" : "Create account & start free trial"}</button>
      <p className="text-center text-sm text-dmb-muted">Already have an account? <Link href="/login" className="font-bold text-dmb-ink hover:underline">Sign in</Link></p>
    </form>
  );
}

// ── Sign in ──
export function BoardLoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) { setBusy(false); setErr("That email and password don't match. Check them and try again."); return; }
    const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (p?.role === "admin") {
      // Admins use the board too. If their account has two-step sign-in, finish it on the academy login, which then returns here.
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      window.location.assign(aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2" ? "/login?next=/app" : "/app");
      return;
    }
    if (p?.role !== "board_teacher") {
      // An academy account: use the academy sign-in (it handles 2FA and the right portal).
      await sb.auth.signOut();
      setBusy(false);
      setErr("This is a Novelia Academy account — sign in at noveliaacademy.com/login instead.");
      return;
    }
    fetch("/api/auth/touch", { method: "POST" }).catch(() => {});
    window.location.assign("/app");
  }

  async function forgot() {
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr("Type your email above first, then press “Forgot password”."); return; }
    await supabaseBrowser().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password` }).catch(() => {});
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {params.get("created") && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Your account is ready — sign in to confirm your email.</p>}
      <label className="block text-sm font-bold text-dmb-ink">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" className="dmb-field mt-1" /></label>
      <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {sent && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">If that email has an account, a reset link is on its way.</p>}
      <button type="submit" disabled={busy} className="dmb-btn w-full !min-h-[52px] text-base">{busy ? "Signing in…" : "Sign in"}</button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={forgot} className="font-bold text-dmb-muted hover:text-dmb-ink">Forgot password?</button>
        <Link href="/signup" className="font-bold text-dmb-ink hover:underline">Create an account</Link>
      </div>
    </form>
  );
}

// ── Confirm email ──
export function BoardVerifyForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setNote(""); setBusy(true);
    const r = await post("/api/board/verify", { code });
    if (!r.ok) { setBusy(false); setErr(r.error ?? "That code didn't work."); return; }
    window.location.assign("/app?welcome=1");
  }
  async function resend() {
    setErr(""); setNote("");
    const r = await post("/api/board/verify", { resend: true });
    if (r.ok) setNote(`A new code is on its way to ${email}.`); else setErr(r.error ?? "Couldn't send a new code.");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-dmb-muted">We sent a 6-digit code to <b className="text-dmb-ink">{email}</b>. Enter it below to start your free trial. Check your spam folder if you can&apos;t see it.</p>
      <label className="block text-sm font-bold text-dmb-ink">Code
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
          className="dmb-field mt-1 text-center font-dmbDisplay font-bold !text-2xl tracking-[.4em]" />
      </label>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {note && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{note}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="dmb-btn w-full !min-h-[52px] text-base">{busy ? "Checking…" : "Confirm email"}</button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={resend} className="font-bold text-dmb-muted hover:text-dmb-ink">Send a new code</button>
        <button type="button" onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.assign("/login"); }} className="font-bold text-dmb-muted hover:text-dmb-ink">Use another account</button>
      </div>
    </form>
  );
}

// ── Students: join a class with the PIN and a name ──
export function BoardJoinForm() {
  const params = useSearchParams();
  const [pin, setPin] = useState((params.get("pin") ?? "").replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await post("/api/board/join", { code: pin, name });
    if (!r.ok || !r.id) { setBusy(false); setErr(r.error ?? "Couldn't join — check the PIN and try again."); return; }
    window.location.assign(`/class/${r.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold text-dmb-ink">Class PIN
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="off" placeholder="6 digits"
          className="dmb-field mt-1 text-center font-dmbDisplay font-bold !text-3xl tracking-[.3em]" />
      </label>
      <label className="block text-sm font-bold text-dmb-ink">Your name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="given-name" placeholder="e.g. Chidera O." className="dmb-field mt-1" />
        <span className="mt-1 block text-xs font-semibold text-dmb-muted">Your teacher sees this name. No account needed.</span>
      </label>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      <button type="submit" disabled={busy || pin.length !== 6 || !name.trim()} className="dmb-btn w-full !min-h-[52px] text-base">{busy ? "Joining…" : "Join class"}</button>
      <p className="text-center text-xs text-dmb-muted">Board not updating? <Link href="/check" className="font-bold text-dmb-teal underline">Check my connection</Link></p>
    </form>
  );
}
