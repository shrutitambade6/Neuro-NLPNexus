import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical";
}) {
  const iconTone = tone === "critical" ? "text-rose-400" : tone === "warning" ? "text-amber-400" : "text-indigo-400";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{label}</p>
        <Icon size={15} className={iconTone} />
      </div>
      <p className="text-2xl font-display font-semibold text-slate-100 mt-1">{value}</p>
    </div>
  );
}
