"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BoardAccess } from "@/lib/boardPlan";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");

// Sends the teacher to Paystack for a month's subscription.
export function PayButton({ price, label, className = "btn-gold !min-h-[52px] text-base" }: { price: number; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pay() {
    setBusy(true); setErr("");
    const r = await fetch("/api/board/pay", { method: "POST" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !j.url) { setBusy(false); setErr(j.error ?? "Couldn't open the payment page — try again."); return; }
    window.location.assign(j.url);
  }
  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className={className}>{busy ? "Opening Paystack…" : label ?? `Pay ${naira(price)} for a month`}</button>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
    </div>
  );
}

type Payment = { reference: string; amount_ngn: number; paid_at: string; paid_until: string };

export default function BoardBilling({ access, price, payments }: { access: BoardAccess; price: number; payments: Payment[] }) {
  const params = useSearchParams();
  const ref = params.get("reference") ?? params.get("trxref") ?? "";
  const [checking, setChecking] = useState(!!ref);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const done = useRef(false);

  // Back from Paystack: confirm the payment with the server (the webhook does too).
  useEffect(() => {
    if (!ref || done.current) return;
    done.current = true;
    (async () => {
      for (let i = 0; i < 3; i++) {
        const r = await fetch("/api/board/pay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: ref }) }).catch(() => null);
        const j = r ? await r.json().catch(() => ({})) : {};
        if (r?.ok) {
          setResult({ ok: true, text: `Payment received — thank you! Your subscription now runs until ${day(j.paidUntil)}.` });
          setChecking(false);
          window.history.replaceState(null, "", "/app/billing");
          setTimeout(() => window.location.reload(), 2500);
          return;
        }
        if (r && r.status >= 400 && r.status < 500 && r.status !== 429) { setResult({ ok: false, text: j.error ?? "That payment wasn't completed." }); setChecking(false); return; }
        await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
      }
      setResult({ ok: false, text: "We couldn't confirm the payment yet. If you were charged, it will show here within a few minutes — or email support@dmaths.academy with your reference: " + ref });
      setChecking(false);
    })();
  }, [ref]);

  const status = {
    trial: { tone: "bg-sky-50 ring-sky-200", title: `Free trial — ${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left`, text: `Your trial ends on ${day(access.until)}. Pay now and your month starts when the trial ends — you don't lose any days.` },
    active: { tone: "bg-emerald-50 ring-emerald-200", title: "Subscription active", text: `Paid until ${day(access.until)} (${access.daysLeft} days). Renew any time — another month is added to the end of this one.` },
    expired: { tone: "bg-amber-50 ring-amber-200", title: "Your subscription has ended", text: `It ended on ${day(access.until)}. Your lessons, quizzes and saved boards are safe — renew to keep teaching.` },
    suspended: { tone: "bg-red-50 ring-red-200", title: "Account on hold", text: "Please contact support@dmaths.academy to sort this out." },
    unverified: { tone: "bg-amber-50 ring-amber-200", title: "Confirm your email", text: "Confirm your email to start your free trial." },
  }[access.state];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {checking && <p role="status" className="card animate-pulse p-4 font-bold text-ink">Confirming your payment with Paystack…</p>}
      {result && <p role={result.ok ? "status" : "alert"} className={`rounded-2xl p-4 font-bold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{result.text}</p>}

      <section className={`rounded-[1.5rem] p-6 ring-1 ${status.tone}`}>
        <h1 className="font-display text-2xl font-black text-ink">{status.title}</h1>
        <p className="mt-1 text-ink/70">{status.text}</p>
        {access.state !== "suspended" && (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <PayButton price={price} label={access.state === "active" ? `Renew — ${naira(price)} for another month` : undefined} />
            <p className="text-sm text-ink/55">Card, bank transfer or USSD via Paystack.<br />No card is saved and nothing renews by itself.</p>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-black text-ink">Payments</h2>
        {payments.length ? (
          <ul className="mt-3 divide-y divide-line">
            {payments.map((p) => (
              <li key={p.reference} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-bold text-ink">{naira(p.amount_ngn)}</span>
                <span className="text-ink/60">paid {day(p.paid_at)}</span>
                <span className="text-ink/60">covers until {day(p.paid_until)}</span>
                <span className="ml-auto font-mono text-xs text-ink/45">{p.reference}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink/55">No payments yet.</p>}
      </section>
    </div>
  );
}
