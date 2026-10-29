import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Novelia Academy brand palette (blue + orange)
        ink: "#1657C9",        // Novelia blue — primary text/brand
        board: "#0F3A6B",      // deep navy for sidebar/dark surfaces
        boardDeep: "#0A2A4F",  // deepest shade for gradients
        chalk: "#F6F6F3",      // Light Gray Background
        // `gold` is the accent token used across the app; its values are now the
        // Novelia orange so every existing accent class picks up the new brand.
        gold: {
          DEFAULT: "#F5951E",  // Novelia orange accent
          soft: "#F9B24E",
          pale: "#FEF2E1",
          deep: "#C56A12",     // darker orange for accent text on white
        },
        sky: "#7BA3CA",        // Light Blue — shading/secondary
        mist: "#D6E3E9",       // Pale Blue-Gray — subtle highlights
        line: "#D6E3E9",       // borders use the pale blue-gray
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
        card: "0 1px 2px rgba(22,87,201,.06), 0 8px 24px rgba(22,87,201,.08)",
        lift: "0 12px 40px rgba(22,87,201,.16)"
      }
    }
  },
  plugins: []
};
export default config;
