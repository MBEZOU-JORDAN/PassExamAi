"use client";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

const features = [
  {
    icon: "upload",
    color: "var(--tw-color-primary, #4F7EF5)",
    bg: "rgba(79,126,245,0.12)",
    title: "Upload your exam",
    desc: "Upload past papers, syllabuses, or notes — PDF or text.",
  },
  {
    icon: "map",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.10)",
    title: "Get a roadmap",
    desc: "AI generates a personalized study plan adapted to your deadline.",
  },
  {
    icon: "book",
    color: "#F5A623",
    bg: "rgba(245,166,35,0.12)",
    title: "Study with AI tutor",
    desc: "Chapter-by-chapter lessons with a contextual AI tutor.",
  },
  {
    icon: "award",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.12)",
    title: "Test yourself",
    desc: "Auto-generated exercises and timed mock exams with AI grading.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-[10px]">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-sm font-bold text-white">
            P
          </div>
          <span className="font-display text-[18px] font-bold text-txt tracking-tight">
            PassExamAI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-[760px] mx-auto animate-fade-up">
        <span className="text-xs font-semibold tracking-[.1em] uppercase text-primary bg-primary-dim px-[14px] py-1 rounded-full inline-block mb-4">
          AI for Education · GCD4F 2026
        </span>
        <h1 className="font-display text-[clamp(40px,6vw,68px)] font-bold leading-[1.1] text-txt mb-5 tracking-[-0.5px]">
          Pass your exam with{" "}
          <span className="text-primary">AI-powered</span> preparation
        </h1>
        <p className="text-[17px] text-txt-muted leading-[1.7] mb-9 max-w-[540px]">
          Upload your exam paper, get a personalized study roadmap, learn
          chapter by chapter, and test yourself — all guided by AI grounded in
          your own materials.
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Start for free <Icon name="arrow" size={16} />
          </Link>
          <Link href="/login" className="btn btn-outline btn-lg">
            Sign in
          </Link>
        </div>
      </div>

      {/* Flow steps */}
      <div className="flex items-center justify-center gap-0 mb-14 flex-wrap px-6">
        {["Upload exam", "AI roadmap", "Study chapters", "Practice", "Pass!"].map(
          (step, i, arr) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-[6px] px-5">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-[13px] font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <span className="text-xs text-txt-muted whitespace-nowrap">{step}</span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-txt-sub text-lg mx-[-8px]">→</span>
              )}
            </div>
          )
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 px-6 max-w-[900px] mx-auto w-full mb-16">
        {features.map((f) => (
          <div
            key={f.title}
            className="card animate-fade-up"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-[14px] text-[18px]"
              style={{ background: f.bg, color: f.color }}
            >
              <Icon name={f.icon} size={20} />
            </div>
            <h3 className="font-display text-[17px] font-semibold mb-[6px] text-txt">
              {f.title}
            </h3>
            <p className="text-[13px] text-txt-muted leading-[1.6]">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-[rgba(255,255,255,0.07)] px-6 py-6 text-center text-[13px] text-txt-sub">
        PassExamAI · GCD4F 2026 · AI for Education · SDG 4 — Quality Education
      </footer>
    </div>
  );
}
