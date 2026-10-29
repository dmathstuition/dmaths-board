// Turn a (Nigerian-friendly) phone number into a wa.me click-to-chat link.
// Handles the common local formats: "0803…", "+234803…", "234803…", "803…".
// Returns null when the number can't be made into a plausible international one,
// so callers can simply not render the button.

export function waNumber(raw: string | null | undefined, defaultCountry = "234"): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  const hadPlus = d.startsWith("+");
  d = d.replace(/\D/g, "");
  if (!d) return null;

  if (hadPlus) {
    // already international (e.g. +234803…) — take the digits as-is
  } else if (d.startsWith("00")) {
    d = d.slice(2); // 00234803… → 234803…
  } else if (d.startsWith("0")) {
    d = defaultCountry + d.slice(1); // local 0803… → 234803…
  } else if (d.length <= 10) {
    d = defaultCountry + d; // 803… (no leading 0) → 234803…
  }
  // otherwise assume it already carries a country code

  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function waLink(raw: string | null | undefined, text?: string): string | null {
  const n = waNumber(raw);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
