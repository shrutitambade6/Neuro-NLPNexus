import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

export default function StatCard({ label, value, icon: Icon, hint }: Props) {
  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 flex items-start gap-3">
      <div className="rounded-lg bg-nexus-accent/10 p-2">
        <Icon size={18} className="text-nexus-accent" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-tight">{value}</p>
        <p className="text-xs text-nexus-muted mt-0.5">{label}</p>
        {hint && <p className="text-[11px] text-nexus-muted/70 mt-1">{hint}</p>}
      </div>
    </div>
  );
}
