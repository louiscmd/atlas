"use client";
import { ErrorState } from "@/components/ui/States";
import { Button, ButtonLink } from "@/components/ui/Button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="This page didn't load" body="Something went wrong on our side. Your data is safe — try again." actions={<><Button onClick={reset}>Try again</Button><ButtonLink href="/home" variant="secondary">Go home</ButtonLink></>} />;
}
