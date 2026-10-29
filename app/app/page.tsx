import Link from "next/link";
import { boardPage } from "@/lib/boardPages";
import { PayButton } from "@/components/board/BoardBilling";
import { BOARD_PRICE_NGN, BOARD_WHATSAPP_GROUP } from "@/lib/boardPlan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

const TILES = [
  { href: "/app/live", title: "Start a class", text: "Open the board, get a PIN and teach live.", primary: true },
  { href: "/app/lessons", title: "Prepare a lesson", text: "Build boards with slides and activities before class.", primary: false },
  { href: "/app/quizzes", title: "Live quizzes", text: "Make quizzes to launch in class.", primary: false },
];
const panel = "dmb-glass flex flex-wrap items-center gap-4 p-5";

function WhatsAppGroup({ big }: { big: boolean }) {
  return (
    <section className={`${panel} ${big ? "!border-[#25D366] !bg-[#25D366]/10" : ""}`} aria-label="WhatsApp group">
      <div className="min-w-0 flex-1">
        <p className={big ? "text-lg font-bold" : "font-bold"}>{big ? "One last step: join our WhatsApp group" : "D-Maths Board WhatsApp group"}</p>
        <p className="text-sm text-dmb-muted">Get updates, ask for help and send complaints. We&apos;ve also sent this link to your email.</p>
      </div>
      <a href={BOARD_WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#25D366] px-5 text-base font-bold text-white hover:bg-[#1EBE5A]">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"/></svg>
        Join the group
      </a>
    </section>
  );
}

export default async function BoardHomePage({ searchParams }: { searchParams: { welcome?: string } }) {
  const t = await boardPage();
  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-board">{searchParams.welcome ? "Welcome to D-Maths Board" : "D-Maths Board"}</p>
        <h1 className="mt-2 font-dmbDisplay text-[44px] leading-tight">Hello, {t.firstName || "teacher"}</h1>
        <p className="mt-1 max-w-2xl text-dmb-muted">
          {searchParams.welcome ? "Your email is confirmed and your free trial has started. Start a class to try the board — students join at dmaths.academy/join with your PIN." : "Start a class, open a prepared lesson, or launch a live quiz."}
        </p>
      </section>

      {searchParams.welcome && <WhatsAppGroup big />}

      {t.isAdmin && (
        <section className={panel}>
          <p className="min-w-0 flex-1 text-sm text-dmb-muted"><b className="text-dmb-ink">You&apos;re in as an admin.</b> Classes you start here are D-Maths Board classes — students join with the PIN and their name. Track teachers, trials and payments on the subscribers page.</p>
          <Link href="/admin/board" className="dmb-btn !min-h-[44px]">Subscribers</Link>
        </section>
      )}
      {t.access.state === "trial" && (
        <section className={panel}>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{t.access.daysLeft} day{t.access.daysLeft === 1 ? "" : "s"} of your free trial left</p>
            <p className="text-sm text-dmb-muted">Keep everything for ₦{BOARD_PRICE_NGN.toLocaleString("en-NG")} a month. Unused trial days are added on.</p>
          </div>
          <PayButton price={BOARD_PRICE_NGN} className="dmb-btn" />
        </section>
      )}
      {t.access.state === "active" && !t.isAdmin && t.access.daysLeft <= 5 && (
        <section className={`${panel} !border-amber-300`}>
          <p className="min-w-0 flex-1 font-bold">Your subscription ends in {t.access.daysLeft} day{t.access.daysLeft === 1 ? "" : "s"}. Renew now — the new month starts when this one ends.</p>
          <PayButton price={BOARD_PRICE_NGN} label="Renew" className="dmb-btn" />
        </section>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {TILES.map((x) => (
          <li key={x.href}>
            <Link href={x.href} className={`dmb-link block h-full rounded-2xl border p-6 transition-colors ${x.primary ? "border-dmb-board bg-dmb-board text-white hover:bg-dmb-deep" : "border-dmb-rule bg-white hover:border-dmb-ink/30"}`}>
              <p className="text-lg font-bold">{x.title} →</p>
              <p className={`mt-1 text-sm ${x.primary ? "text-white/80" : "text-dmb-muted"}`}>{x.text}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="dmb-glass p-5">
        <h2 className="text-lg font-bold">How students join</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-dmb-muted">
          <li>Start a class — you get a 6-digit PIN and a link.</li>
          <li>Students open <b className="text-dmb-ink">dmaths.academy/join</b> (or tap your link) and type the PIN and their name.</li>
          <li>They see your board live. Tap the pencil next to a name to let them write; launch a quiz from the Live quiz tab.</li>
        </ol>
      </section>

      {!searchParams.welcome && <WhatsAppGroup big={false} />}
    </div>
  );
}
