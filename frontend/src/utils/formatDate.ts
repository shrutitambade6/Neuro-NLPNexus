// Small shared helper — several teacher pages (Students, Student Profile,
// Needs Attention, Activity, Heatmap) each need "Never" for a null
// timestamp and a short, consistent date format otherwise. Previously
// this was copy-pasted once inside AdminDashboard.tsx; centralizing it
// here means every teacher page renders dates identically.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
