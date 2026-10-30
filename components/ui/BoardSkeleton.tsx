// What a board page shows the moment a link is tapped, while the server
// prepares the real page: the same shapes, gently pulsing.
export default function BoardSkeleton({ variant = "cards" }: { variant?: "cards" | "list" | "dashboard" | "class" }) {
  const block = "animate-pulse rounded-2xl bg-white ring-1 ring-dmb-rule";
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl space-y-4 px-3 py-6 sm:px-4">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-dmb-rule/70" />
      {variant === "dashboard" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className={`h-28 ${block}`} />)}</div>
          <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <div key={i} className={`h-64 ${block}`} />)}</div>
        </>
      )}
      {variant === "cards" && <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className={`h-36 ${block}`} />)}</div>}
      {variant === "list" && <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-16 ${block}`} />)}</div>}
      {variant === "class" && <div className={`h-[60vh] ${block}`} />}
    </div>
  );
}
