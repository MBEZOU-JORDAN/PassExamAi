"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  };

  return (
    <>
      <div className="flex items-center gap-[10px] mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-sm font-bold text-white">P</div>
        <span className="font-display text-xl font-bold text-txt">PassExamAI</span>
      </div>

      <div className="card w-full max-w-[420px]">
        <div className="flex border-b border-[rgba(255,255,255,0.07)] mb-6">
          <Link href="/login" className="flex-1 py-[10px] text-center text-sm font-medium text-txt-muted border-b-2 border-transparent hover:text-txt transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="flex-1 py-[10px] text-center text-sm font-medium text-primary border-b-2 border-primary">
            Sign up
          </Link>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" type="text" placeholder="Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>

          {error && (
            <div className="text-danger text-sm bg-danger-dim border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-txt-muted mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </>
  );
}
