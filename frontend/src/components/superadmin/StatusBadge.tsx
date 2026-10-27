import { Circle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  suspended: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  deactivated: "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

// Account-status pill — reused on Students, Teachers, and both detail
// pages. Deliberately icon + label + color (never color alone), matching
// the "status colors ship with an icon, never color alone" rule.
export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "text-slate-400 bg-slate-500/10 border-slate-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize ${cls}`}>
      <Circle size={6} className="fill-current" />
      {status}
    </span>
  );
}
