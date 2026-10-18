"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { logIn, requestPasswordReset, resetPassword, signUp, type AuthState } from "./actions";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-fg-3 hover:text-fg">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function FormError({ state }: { state: AuthState }) {
  if (!state?.error) return null;
  return <p role="alert" className="t-small rounded-xl bg-danger-soft px-4 py-3 text-danger">{state.error}</p>;
}

function DevLink({ href }: { href?: string }) {
  if (!href) return null;
  return <Notice title="Development mode">No email provider is configured, so the link is shown here: <a className="break-all font-medium text-accent underline" href={href}>{href}</a></Notice>;
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Email" error={fe.email}>{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      <Field label="Password" error={fe.password} hint="At least 8 characters, with a letter and a number.">{(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required />}</Field>
      <label className="t-small flex items-start gap-3 text-fg-2">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>I agree to the <Link href="/terms" className="text-fg underline">Terms</Link> and <Link href="/privacy" className="text-fg underline">Privacy Policy</Link>, and understand Forma is not medical advice.</span>
      </label>
      {fe.terms && <p role="alert" className="t-small text-danger">{fe.terms}</p>}
      <Button type="submit" size="lg" full loading={pending}>Create account</Button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(logIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      <Field label="Password">{(p) => <PasswordInput {...p} name="password" autoComplete="current-password" required />}</Field>
      <div className="flex justify-end"><Link href="/forgot-password" className="t-small text-fg-2 hover:text-fg">Forgot password?</Link></div>
      <Button type="submit" size="lg" full loading={pending}>Log in</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.message) return <div className="space-y-4"><Notice tone="success" icon={<MailCheck className="size-5" />} title="Check your inbox">{state.message}</Notice><DevLink href={state.devLink} /></div>;
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <Field label="Email" error={state?.fieldErrors?.email}>{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      <Button type="submit" size="lg" full loading={pending}>Send reset link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" error={state?.fieldErrors?.password} hint="At least 8 characters, with a letter and a number.">{(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required />}</Field>
      <Button type="submit" size="lg" full loading={pending}>Set new password</Button>
    </form>
  );
}
