import { Link } from "react-router-dom";

import EmptyState from "../components/nexi/EmptyState";

interface Props {
  label: string;
}

/**
 * Per the project's "do not fake features" rule: modules not yet built
 * show an honest placeholder rather than mock data or fake results — now
 * as a proper EmptyState (NEXI + a real CTA back to the Dashboard) instead
 * of a bare icon and two lines of text. No reference to internal build
 * phases here — that's development bookkeeping, not something a student
 * needs to see.
 */
export default function PhasePlaceholder({ label }: Props) {
  return (
    <EmptyState
      mood="empty"
      title={label}
      description="This module isn't built yet, so nothing fake is shown here — check back once it's ready."
      action={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      }
    />
  );
}
