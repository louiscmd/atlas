import { features } from "@/lib/server/env";

export function SocialButtons() {
  const cls = "flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-btn)] border border-line bg-surface font-semibold transition-colors hover:bg-surface-2 aria-disabled:pointer-events-none aria-disabled:opacity-50";
  return (
    <div className="space-y-3">
      <a href={features.google ? "/api/auth/google" : undefined} aria-disabled={!features.google} className={cls}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </a>
      <a aria-disabled className={cls} title="Apple sign-in requires an Apple Developer configuration">
        <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden><path d="M788 341c-6 4-108 62-108 190 0 149 131 202 135 203-1 3-21 72-69 142-43 62-88 124-157 124s-87-40-166-40c-77 0-104 41-167 41s-107-58-157-129C41 789 0 676 0 569c0-172 112-263 222-263 59 0 107 39 144 39 35 0 90-41 157-41 25 0 117 2 177 88zM555 168c28-33 47-79 47-125 0-6-1-13-2-18-45 2-98 30-130 67-25 29-49 75-49 122 0 7 1 14 2 16 3 1 8 1 12 1 40 0 91-27 120-63z"/></svg>
        Continue with Apple
      </a>
      {!features.google && <p className="t-small text-center text-fg-3">Social sign-in becomes available once it's configured for this deployment.</p>}
    </div>
  );
}

export function OrDivider() {
  return <div className="t-small my-6 flex items-center gap-3 text-fg-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>;
}
