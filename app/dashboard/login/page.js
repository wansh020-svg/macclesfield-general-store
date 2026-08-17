"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Incorrect password");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto px-5 py-24">
      <span className="price-tag mb-4">Staff Only</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-6">Orders Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Checking..." : "Log In"}
        </button>
      </form>
    </section>
  );
}
