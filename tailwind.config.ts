import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // D-Maths Board palette everywhere (as on the home page): deep teal,
        // lime accent, near-black teal ink, soft paper. The old token names are
        // kept so every screen picks the palette up.
        ink: "#0F2326",        // text
        board: "#0E6E72",      // teal — brand / dark surfaces
        boardDeep: "#0A4F52",  // deepest teal
        chalk: "#F4F8F8",      // paper background
        // `gold` is the accent token: lime, as on the home page's buttons.
        gold: {
          DEFAULT: "#C6F35C",
          soft: "#D4F77E",
          pale: "#F2FBDD",
          deep: "#4B6A0E",     // olive for accent text on white
        },
        sky: "#7FB8B9",
        mist: "#DDE7E7",
        line: "#DDE7E7",
        // D-Maths Board: deep teal with a lime accent. `dmb` and `dg` share
        // the palette (dg names are kept from earlier designs).
        dmb: {
          board: "#0E6E72", deep: "#0A5558", paper: "#F4F8F8", sheet: "#FFFFFF",
          ink: "#0F2326", muted: "#556B6E", rule: "#DDE7E7",
          chalk: "#C6F35C", chalkSoft: "#D4F77E", pen: "#C2451C", penSoft: "#FBEDE6", mint: "#E2F3F2",
          teal: "#0E6E72", tealDark: "#0A4F52", lime: "#C6F35C",
        },
        dg: { night: "#F4F8F8", text: "#0F2326", soft: "#556B6E", aqua: "#0E6E72", violet: "#0E6E72", rose: "#C2451C", sun: "#E8A317" },
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-poppins)", "sans-serif"],
        mono: ["var(--font-fira)", "monospace"],
        dmbDisplay: ["var(--font-dmb-display)", "Georgia", "serif"],
        dmbBody: ["var(--font-dmb-body)", "system-ui", "sans-serif"],
        dmbHand: ["var(--font-dmb-hand)", "cursive"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,110,114,.06), 0 8px 24px rgba(14,110,114,.08)",
        lift: "0 12px 40px rgba(14,110,114,.16)"
      }
    }
  },
  plugins: []
};
export default config;
