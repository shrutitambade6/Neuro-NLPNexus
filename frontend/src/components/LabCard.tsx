import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Lock } from "lucide-react";

interface Props {
  label: string;
  path: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
}

// No experiment/usage counts here — the app doesn't track real experiment
// history yet (see Dashboard's stat cards), so a number here would be
// fabricated. This card shows only what's actually known: the lab's name,
// what it covers, and whether it's really open yet.
export default function LabCard({ label, path, description, icon: Icon, ready }: Props) {
  return (
    <Link
      to={path}
      className="group rounded-2xl border border-nexus-border bg-nexus-surface p-5 flex flex-col gap-3 hover:border-nexus-accentDim hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-nexus-accent/10 p-2">
          <Icon size={18} className="text-nexus-accent" />
        </div>
        {!ready && (
          <span className="flex items-center gap-1 text-[10px] text-nexus-muted">
            <Lock size={10} /> Planned
          </span>
        )}
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-nexus-text">{label}</p>
        <p className="text-xs text-nexus-muted mt-1 leading-relaxed">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-nexus-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Open lab <ArrowRight size={12} />
      </span>
    </Link>
  );
}
