import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
export default function NotFound() {
  return <EmptyState title="We couldn't find that" body="It may have been moved or deleted." actions={<ButtonLink href="/home">Go home</ButtonLink>} />;
}
