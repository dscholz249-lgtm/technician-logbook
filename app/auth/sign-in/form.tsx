"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-5 text-sm text-zinc-300">
        <p className="font-medium text-zinc-100 mb-1">Check your email</p>
        <p>
          We sent a magic link to <span className="text-zinc-100">{email}</span>.
          Click it to sign in — the link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@skillcatapp.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
