import type { Metadata } from "next";
import { Crimson_Pro, DM_Sans, DM_Mono } from "next/font/google";
import "@/styles/globals.css";

// display: "swap" + preload: false évite le blocage au démarrage
// quand fonts.gstatic.com est inaccessible (réseau Cameroun)
const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
  preload: false,    // ← ne bloque plus le démarrage si Google Fonts timeout
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "PassExamAI — AI-Powered Exam Preparation",
  description:
    "Transform your study materials into a personalized revision roadmap powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${crimsonPro.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}