"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  disabled: boolean;
};

export function SignInSubmitButton({ disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={disabled || pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-[#1e5a40] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184a34] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Belépés folyamatban..." : "Bejelentkezés"}
    </button>
  );
}
