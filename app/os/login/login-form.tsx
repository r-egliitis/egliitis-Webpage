"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

const inputClass =
  "mt-2 block w-full rounded-xl border border-line bg-transparent px-4 py-3 text-fg outline-none transition-[border-color,box-shadow] focus:border-fg focus:shadow-[0_0_24px_var(--glow-soft)]";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-5">
      <label className="block text-sm font-medium">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-fg px-6 py-3 text-[0.9375rem] font-medium text-surface transition-[box-shadow,opacity] duration-300 hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
