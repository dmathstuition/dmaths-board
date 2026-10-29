import Link from "next/link";
import { BoardFooter, BoardTopBar } from "@/components/board/BoardBrand";
import { BOARD_PRICE_NGN, BOARD_TRIAL_DAYS } from "@/lib/boardPlan";

export const metadata = {
  title: { absolute: "D-Maths Board — your board on every student's phone" },
  description: `A live interactive whiteboard for maths and English teachers: write on your slides, see every student's answer, run live quizzes. Students join with a PIN. ₦${BOARD_PRICE_NGN.toLocaleString("en-NG")} a month, ${BOARD_TRIAL_DAYS}-day free trial.`,
  alternates: { canonical: "/" },
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const PER_DAY = Math.ceil(BOARD_PRICE_NGN / 30);

// One line-icon set (24px grid, 1.6px stroke) with a small lime dot, like a marker.
const ICONS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  flask: "M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.5V3M7.2 15h9.6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  ruler: "M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  cards: "M4 7h11v13H4zM8 4h12v13",
  book: "M5 4h11l3 3v13H5zM9 9h6M9 13h6",
  replay: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M15.5 4.1a3 3 0 0 1 0 5.8",
  hand: "M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.5V12a1.5 1.5 0 0 1 3 0v1",
} as const;
type IconName = keyof typeof ICONS;
function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}
function MarkedIcon({ name, dark = false }: { name: IconName; dark?: boolean }) {
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center">
      <Icon name={name} className={`h-8 w-8 ${dark ? "text-dmb-ink" : "text-dmb-ink"}`} />
      <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ${dark ? "bg-dmb-ink" : "bg-dmb-lime"}`} aria-hidden />
    </span>
  );
}

// A small stat chip floating over the hero picture.
function Chip({ icon, label, value, className }: { icon: IconName; label: string; value: string; className: string }) {
  return (
    <div className={`absolute hidden rounded-2xl border border-white/20 bg-dmb-tealDark/90 px-3.5 py-3 text-white shadow-[0_12px_24px_-12px_rgba(0,0,0,.5)] sm:block ${className}`}>
      <span className="relative inline-flex"><Icon name={icon} className="h-6 w-6" /><span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-dmb-lime" aria-hidden /></span>
      <p className="mt-1.5 text-xs text-white/80">{label}</p>
      <p className="text-[15px] font-bold">{value}</p>
    </div>
  );
}

// The product in the hero: the teacher's board, and a student's phone.
function HeroPicture() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-10 sm:pt-16" aria-hidden>
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.55)] sm:ml-auto sm:w-[86%]">
        <div className="flex items-center gap-2 border-b border-dmb-rule px-4 py-2.5">
          {["#0F2326", "#0E6E72", "#C2451C", "#2563EB"].map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}
          <span className="ml-auto rounded-full bg-dmb-paper px-2.5 py-0.5 font-mono text-[11px] font-semibold text-dmb-muted">PIN 482 913</span>
        </div>
        <svg viewBox="0 0 480 260" className="block w-full">
          <defs><pattern id="hp-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#0F2326" strokeOpacity=".05" /></pattern></defs>
          <rect width="480" height="260" fill="url(#hp-grid)" />
          <g fill="#0F2326" fontFamily="var(--font-dmb-hand), cursive" fontWeight="700">
            <text x="26" y="56" fontSize="32">x² − 5x + 6 = 0</text>
            <text x="26" y="108" fontSize="30">(x − 2)(x − 3) = 0</text>
            <text x="26" y="162" fontSize="30" fill="#0E6E72">x = 2  or  x = 3</text>
          </g>
          <path d="M20 176c60 8 150 6 196-4" fill="none" stroke="#C2451C" strokeWidth="3" strokeLinecap="round" />
          <text x="26" y="222" fill="#C2451C" fontFamily="var(--font-dmb-hand), cursive" fontSize="23" fontWeight="700">check: 4 − 10 + 6 = 0 ✓</text>
          <g transform="translate(330 30)">
            <path d="M0 110H120M18 0V124" stroke="#0F2326" strokeOpacity=".35" strokeWidth="1.5" />
            <path d="M8 8C28 118 66 118 112 8" fill="none" stroke="#0E6E72" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <div className="absolute -bottom-2 right-3 w-[128px] rounded-[22px] border-[5px] border-dmb-ink bg-white shadow-[0_18px_30px_-16px_rgba(0,0,0,.5)]">
        <div className="border-b border-dmb-rule px-2.5 py-1.5 text-[9px] font-bold text-dmb-muted">Maths · SS2 <span className="float-right text-red-600">● LIVE</span></div>
        <div className="px-2.5 py-2 font-dmbHand text-[13px] font-bold leading-tight">(x − 2)(x − 3) = 0<br /><span className="text-dmb-teal">x = 2 or 3</span></div>
        <div className="flex gap-1 px-2 pb-2">
          <span className="flex-1 rounded-full bg-dmb-lime py-1 text-center text-[9px] font-bold">Raise hand</span>
          <span className="flex-1 rounded-full border border-dmb-rule py-1 text-center text-[9px] font-bold">Answer</span>
        </div>
      </div>
      <Chip icon="users" label="Join with a PIN" value="Up to 300" className="right-[30%] top-0" />
      <Chip icon="check" label="Answered" value="24 of 26" className="left-0 top-28" />
      <Chip icon="hand" label="Hands up" value="Chidera" className="left-0 bottom-6" />
    </div>
  );
}

const STRIP: { icon: IconName; title: string; text: string }[] = [
  { icon: "pen", title: "Write on your slides", text: "Upload a PDF of your slides and mark up every page as you teach." },
  { icon: "grid", title: "See every answer", text: "Each student works on their own mini board — you see them all at once." },
  { icon: "bolt", title: "Live quizzes", text: "Timer, points and a leaderboard. Students answer on their phones." },
  { icon: "phone", title: "Works on any phone", text: "No app, no student accounts. Just the PIN and their first name." },
];

const LESSON = [
  { t: "0:00", title: "Open the board", text: "Pick a saved lesson or upload your PowerPoint as a PDF. Every slide becomes a page you can write on." },
  { t: "0:02", title: "Students join", text: "They type your 6-digit PIN and their name at dmaths.academy/join." },
  { t: "0:10", title: "Teach and annotate", text: "Write over your slides, zoom into the detail, bring out a graph, protractor or number line." },
  { t: "0:25", title: "Everyone answers", text: "Send a question to answer boards and see every student's working come in, side by side." },
  { t: "0:35", title: "Quick quiz", text: "A live quiz with a timer, points and a leaderboard on the big screen." },
  { t: "0:40", title: "Saved for next time", text: "The board saves itself. Replay it, or reuse the lesson with your next class." },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "ruler", title: "Maths & English tools", text: "Graphs, protractor, number lines, fraction bars, word builder, timers, name picker and more." },
  { icon: "cards", title: "Activities", text: "Card sorts, matching, cover-and-reveal and drag-and-drop tasks that run on the board." },
  { icon: "book", title: "Lesson library", text: "Prepare lessons ahead and open them in one click. Everything you write is kept." },
  { icon: "replay", title: "Replay & zoom", text: "Zoom in on the detail, then replay how the board was built — good for revision." },
  { icon: "flask", title: "Science & maths lab", text: "39 interactive experiments — pendulums, circuits, titration, circle theorems. Put one on the board and annotate it together." },
  { icon: "bolt", title: "Games & ready-made quizzes", text: "Class games and live quizzes for Reception to Year 6, following the England curriculum — launch one with no preparation." },
  { icon: "pen", title: "Draw or type answers", text: "Students answer on their own mini board or type their answer — you choose, and see them all at once." },
];

const FAQ = [
  { q: "Do my students need to pay or sign up?", a: "No. Students join free with your class PIN and their first name. Only you need an account." },
  { q: "What happens after the free trial?", a: `Pay ${naira(BOARD_PRICE_NGN)} for a month at a time. Any trial days you have left are added on top. We never store your card or charge you automatically — we email you before your month ends, and you renew only if you want to.` },
  { q: "How do I pay?", a: "Securely through Paystack — card, bank transfer or USSD." },
  { q: "Does it work in a physical classroom?", a: "Yes. Put the board on a projector or smart TV, or share your screen in Zoom, Google Meet or WhatsApp. Students can follow on their phones either way." },
  { q: "Will it work on cheap phones and slow data?", a: "Students only need a web browser. The board sends drawing as small updates rather than video, and slides are compressed for mobile data." },
  { q: "How many students can join one class?", a: "Up to 300." },
];

const eyebrow = "text-sm font-semibold text-dmb-teal";
const h2 = "font-dmbDisplay text-[36px] font-normal leading-[1.1] sm:text-[46px]";

export default function BoardLandingPage() {
  return (
    <div className="dmb-sky min-h-dvh">
      {/* Hero */}
      <section className="dmb-hero pb-32 text-white sm:pb-36">
        <BoardTopBar onTeal />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 sm:pt-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-[15px] text-white/80">Your live classroom, on every phone</p>
            <h1 className="mt-4 font-dmbDisplay text-[44px] font-normal leading-[1.08] sm:text-[62px]">
              Teach, Engage and <span className="text-dmb-lime">See Every Answer</span> on One Board
            </h1>
            <p className="mt-6 max-w-[32rem] text-[16px] leading-relaxed text-white/80">
              Write on your slides, watch every student&apos;s working come in, and run live quizzes — in class, on a projector, or over Zoom and WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="dmb-btn !min-h-[52px] !px-7">Start {BOARD_TRIAL_DAYS}-day free trial</Link>
              <Link href="/join" className="dmb-link rounded-full px-4 py-3 text-[15px] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">I&apos;m a student — join a class</Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2" aria-hidden>
                {[["AO", "#F4B740"], ["TB", "#7DD3C0"], ["NK", "#F2A7A0"]].map(([i, c]) => (
                  <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0E6E72] text-xs font-bold text-dmb-ink" style={{ background: c }}>{i}</span>
                ))}
              </div>
              <div className="leading-tight">
                <p className="font-semibold">Students join free with a PIN</p>
                <p className="text-sm text-white/70">{naira(BOARD_PRICE_NGN)} a month after a {BOARD_TRIAL_DAYS}-day free trial · no card needed</p>
              </div>
            </div>
          </div>
          <HeroPicture />
        </div>
      </section>

      {/* Feature strip overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-20 max-w-6xl px-4">
        <ul className="grid gap-3 rounded-3xl bg-white p-3 shadow-[0_25px_50px_-30px_rgba(15,35,38,.45)] sm:grid-cols-2 lg:grid-cols-4">
          {STRIP.map((f, i) => (
            <li key={f.title} className={`rounded-2xl p-5 ${i === 1 ? "bg-dmb-lime" : ""}`}>
              <MarkedIcon name={f.icon} dark={i === 1} />
              <h3 className="mt-4 text-[17px] font-bold">{f.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${i === 1 ? "text-dmb-ink/75" : "text-dmb-muted"}`}>{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <main>
        {/* A lesson, minute by minute */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className={eyebrow}>How it works</p>
              <h2 className={`${h2} mt-2`}>Forty minutes, one board, the whole class taking part.</h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {LESSON.map((s) => (
                <li key={s.t} className="rounded-2xl border border-dmb-rule bg-white p-5">
                  <span className="inline-flex rounded-full bg-dmb-mint px-2.5 py-0.5 font-mono text-xs font-semibold text-dmb-teal">{s.t}</span>
                  <h3 className="mt-3 text-[17px] font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-dmb-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Answer boards + live quiz */}
        <section id="features" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <p className={eyebrow}>On the board</p>
            <h2 className={`${h2} mt-2 max-w-2xl`}>Everything you reach for in class.</h2>
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl bg-dmb-paper p-6 sm:p-8">
                <h3 className="font-dmbDisplay text-2xl font-medium">See every answer at once</h3>
                <p className="mt-1 text-dmb-muted">Each student works on their own mini board. Show one to the class in a tap.</p>
                <ul className="mt-6 grid grid-cols-3 gap-2" aria-hidden>
                  {([["Ada", "x = 2, 3", true], ["Tunde", "x = 2, 3", true], ["Ngozi", "x = −2, −3", false], ["Femi", "x = 2, 3", true], ["Zainab", "x = 6", false], ["Chidera", "x = 2, 3", true]] as const).map(([n, a, ok]) => (
                    <li key={n} className="rounded-xl bg-white p-2">
                      <div className="rounded-lg bg-dmb-paper px-2 py-2 font-dmbHand text-[15px] font-bold">{a}</div>
                      <p className="mt-1.5 flex items-center justify-between text-xs font-semibold">{n}<span className={ok ? "text-dmb-teal" : "text-dmb-pen"}>{ok ? "✓" : "✗"}</span></p>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-3xl bg-dmb-teal p-6 text-white sm:p-8">
                <h3 className="font-dmbDisplay text-2xl font-medium">Live quizzes</h3>
                <p className="mt-1 text-white/75">Timer, points and a leaderboard. Write the questions or let the A.I. draft them.</p>
                <ol className="mt-6 space-y-2.5" aria-hidden>
                  {([["Zainab", 92, 1840], ["Femi", 78, 1560], ["Ada", 64, 1280], ["Tunde", 50, 1000]] as const).map(([n, w, pts], i) => (
                    <li key={n} className="flex items-center gap-3 text-sm font-semibold">
                      <span className="w-4 font-mono text-white/60">{i + 1}</span>
                      <span className="relative h-9 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span className={`absolute inset-y-0 left-0 rounded-full ${i === 0 ? "bg-dmb-lime" : "bg-white/25"}`} style={{ width: `${w}%` }} />
                        <span className={`relative flex h-full items-center px-4 ${i === 0 ? "text-dmb-ink" : ""}`}>{n}</span>
                      </span>
                      <span className="w-12 text-right font-mono text-white/70">{pts}</span>
                    </li>
                  ))}
                </ol>
              </article>
            </div>
            <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <MarkedIcon name={f.icon} />
                  <h3 className="mt-3 text-[17px] font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-dmb-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Price */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className={eyebrow}>Pricing</p>
              <h2 className={`${h2} mt-2`}>One simple plan. <span className="text-dmb-teal">{naira(BOARD_PRICE_NGN)}</span> a month.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-dmb-muted">Every feature and unlimited classes for under ₦{PER_DAY} a day. Try it free for {BOARD_TRIAL_DAYS} days first — unused trial days are added to your first month.</p>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-3xl bg-dmb-teal p-7 text-white shadow-[0_30px_60px_-35px_rgba(14,110,114,.8)]">
              <p className="text-sm text-white/75">D-Maths Board · per month</p>
              <p className="mt-2 font-dmbDisplay text-6xl font-medium">{naira(BOARD_PRICE_NGN)}</p>
              <ul className="mt-6 space-y-3 text-[15px]">
                {["Board, slides & every tool", "Science & maths lab (39 experiments)", "Games & ready-made quizzes (Reception – Year 6)", "Answer boards & live quizzes", "Lesson library & replays", "Students join free, up to 300", `${BOARD_TRIAL_DAYS}-day free trial`, "Never charged automatically"].map((t) => (
                  <li key={t} className="flex items-center gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dmb-lime text-dmb-ink"><Icon name="check" className="h-3.5 w-3.5" /></span>{t}</li>
                ))}
              </ul>
              <Link href="/signup" className="dmb-btn mt-8 w-full">Start free trial</Link>
              <p className="mt-3 text-center text-xs text-white/65">Paid securely with Paystack</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-24 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className={eyebrow}>FAQ</p>
              <h2 className={`${h2} mt-2`}>Questions teachers ask</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-dmb-paper px-5">
                  <summary className="dmb-link flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white transition-transform group-open:rotate-45 motion-reduce:transition-none"><Icon name="plus" className="h-4 w-4" /></span>
                  </summary>
                  <p className="max-w-2xl pb-5 leading-relaxed text-dmb-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="px-4 py-16">
          <div className="dmb-hero mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl px-6 py-12 text-white sm:flex-row sm:items-center sm:px-12">
            <div className="flex-1">
              <h2 className="font-dmbDisplay text-[34px] font-normal leading-tight sm:text-[42px]">Set up your board in <span className="text-dmb-lime">five minutes</span>.</h2>
              <p className="mt-1 text-white/75">Free for {BOARD_TRIAL_DAYS} days. No card needed.</p>
            </div>
            <Link href="/signup" className="dmb-btn !min-h-[52px] !px-7">Get started now <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
      <BoardFooter />
    </div>
  );
}
