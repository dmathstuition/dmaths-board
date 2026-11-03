"use client";
import { useState } from "react";

// Send the progress page home: WhatsApp, copy the link, or print it.
export default function ProgressShare({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white">Send on WhatsApp</a>
      <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {})}
        className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 text-sm font-bold text-dmb-ink ring-1 ring-dmb-rule">{copied ? "Copied ✓" : "Copy link"}</button>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 text-sm font-bold text-dmb-ink ring-1 ring-dmb-rule">Print</button>
    </div>
  );
}
