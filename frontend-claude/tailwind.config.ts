import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#080B12",
          surf: "#0F1420",
          card: "#161D2E",
          raise: "#1C2438",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          md: "rgba(255,255,255,0.12)",
          act: "rgba(255,255,255,0.20)",
        },
        primary: {
          DEFAULT: "#4F7EF5",
          dim: "rgba(79,126,245,0.12)",
          mid: "rgba(79,126,245,0.25)",
        },
        accent: {
          DEFAULT: "#F5A623",
          dim: "rgba(245,166,35,0.12)",
        },
        success: {
          DEFAULT: "#22C55E",
          dim: "rgba(34,197,94,0.10)",
        },
        danger: {
          DEFAULT: "#EF4444",
          dim: "rgba(239,68,68,0.10)",
        },
        txt: {
          DEFAULT: "#EDF0FF",
          muted: "#8A93B0",
          sub: "#4F5875",
        },
      },
      fontFamily: {
        display: ["var(--font-crimson)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "-apple-system", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "16px",
        xl: "24px",
      },
      width: {
        sidebar: "240px",
      },
      height: {
        header: "64px",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease both",
        "fade-in": "fadeIn 0.3s ease both",
        shimmer: "shimmer 1.5s infinite",
        pulse: "pulse 1.2s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;
