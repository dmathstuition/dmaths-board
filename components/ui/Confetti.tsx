"use client";
import { useEffect, useState } from "react";

// A tiny dependency-free celebration burst. Renders a handful of brand-coloured
// pieces that fall and fade, then unmounts itself. Skipped entirely under
// prefers-reduced-motion, so it can be fired anywhere without an a11y worry.
const COLORS = ["#F5951E", "#1657C9", "#059669", "#F9B24E", "#7BA3CA", "#C56A12"];

export default function Confetti({ fire, pieces = 28 }: { fire: boolean; pieces?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!fire) return;
    if (typeof window !== "undefined" && (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-lowdata"))) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [fire]);

  if (!show) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.35;
        const duration = 1.4 + Math.random() * 0.8;
        const size = 6 + Math.random() * 6;
        const rotate = Math.random() * 360;
        return (
          <span
            key={i}
            className="confetti-piece absolute top-[-16px] block"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.5,
              background: COLORS[i % COLORS.length],
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotate}deg)`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}
