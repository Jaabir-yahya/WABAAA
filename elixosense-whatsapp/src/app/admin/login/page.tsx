"use client";

import { useMemo, useState } from "react";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export default function AdminLoginPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!supabase) {
      setStatus("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message);
        return;
      }
      window.location.href = "/admin";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ margin: "0 0 12px 0" }}>Admin Login</h1>

      {!supabase && (
        <p style={{ margin: "0 0 12px 0", color: "#b42318" }}>
          Missing Supabase browser env vars. Set <code>.env.local</code> (local) or Vercel env vars
          (staging/prod).
        </p>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d0d5dd" }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d0d5dd" }}
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}

