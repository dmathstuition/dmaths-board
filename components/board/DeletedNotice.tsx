"use client";
import { useEffect, useState } from "react";

// After a teacher deletes their account they land here with ?deleted=1.
export default function DeletedNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("deleted") === "1") setShow(true); }, []);
  if (!show) return null;
  return (
    <div role="status" className="mx-auto max-w-6xl px-4 pt-3">
      <p className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-4 py-3 text-sm font-bold text-dmb-ink shadow">
        Your account has been deleted. Thank you for teaching with D-Maths Board.
        <button type="button" onClick={() => { setShow(false); window.history.replaceState(null, "", "/"); }} className="rounded-lg px-2 py-1 text-dmb-muted hover:bg-dmb-mint" aria-label="Close">✕</button>
      </p>
    </div>
  );
}
