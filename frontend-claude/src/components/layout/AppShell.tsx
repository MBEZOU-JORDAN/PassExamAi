"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { getSupabaseClient } from "@/lib/supabase";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "home", group: "main" },
  { href: "/upload", label: "Upload docs", icon: "upload", group: "main" },
  { href: "/roadmap", label: "Study roadmap", icon: "map", group: "study" },
  { href: "/chapters", label: "Chapter study", icon: "book", group: "study" },
  { href: "/exercises", label: "Exercises", icon: "pen", group: "study" },
  { href: "/exam", label: "Mock exam", icon: "award", group: "study" },
  { href: "/results", label: "Results", icon: "star", group: "study" },
  { href: "/progress", label: "Progress", icon: "bar", group: "study" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Upload material",
  "/roadmap": "Study roadmap",
  "/chapters": "Chapter study",
  "/exercises": "Exercises",
  "/exam": "Mock exam",
  "/results": "Results",
  "/progress": "Progress",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  const pageTitle = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] || "";

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserEmail(data.user.email || "");
      const name = data.user.user_metadata?.full_name ||
        data.user.email?.split("@")[0] || "Student";
      setUserName(name);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar */}
      <aside
        className={`w-[240px] min-h-screen bg-bg-surf border-r border-[rgba(255,255,255,0.07)] flex flex-col fixed top-0 left-0 z-[100] transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-[10px] px-5 py-[20px] pb-4 border-b border-[rgba(255,255,255,0.07)]">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0">
            P
          </div>
          <span className="font-display text-[18px] font-bold text-txt tracking-[-0.3px]">
            PassExamAI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-[10px] py-3 overflow-y-auto">
          <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-txt-sub px-[10px] py-2 mt-2">
            Overview
          </p>
          {navItems.filter((n) => n.group === "main").map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-[10px] text-sm font-medium transition-all duration-150 no-underline mb-[2px]
                ${pathname.startsWith(n.href)
                  ? "bg-primary-dim text-primary"
                  : "text-txt-muted hover:bg-bg-card hover:text-txt"
                }`}
            >
              <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                <Icon name={n.icon} size={16} />
              </span>
              {n.label}
            </Link>
          ))}

          <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-txt-sub px-[10px] py-2 mt-3">
            Study flow
          </p>
          {navItems.filter((n) => n.group === "study").map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-[10px] text-sm font-medium transition-all duration-150 no-underline mb-[2px]
                ${pathname.startsWith(n.href)
                  ? "bg-primary-dim text-primary"
                  : "text-txt-muted hover:bg-bg-card hover:text-txt"
                }`}
            >
              <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                <Icon name={n.icon} size={16} />
              </span>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-[10px] py-3 border-t border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-[10px] px-[10px] py-2 rounded-[10px]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-txt leading-[1.2] truncate">
                {userName}
              </div>
              <div className="text-[11px] text-txt-muted leading-[1.2] truncate">
                {userEmail}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-icon btn-ghost w-7 h-7"
              title="Sign out"
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="md:ml-[240px] flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-[64px] border-b border-[rgba(255,255,255,0.07)] flex items-center px-4 md:px-7 gap-4 bg-bg sticky top-0 z-50">
          <button
            className="md:hidden btn btn-icon btn-ghost border border-[rgba(255,255,255,0.12)]"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <Icon name="menu" size={18} />
          </button>
          <h1 className="font-display text-[22px] font-semibold text-txt flex-1">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-2">
            <button className="btn btn-icon btn-ghost">
              <Icon name="info" size={16} />
            </button>
            <Link href="/settings" className="btn btn-icon btn-ghost">
              <Icon name="settings" size={16} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-7 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
