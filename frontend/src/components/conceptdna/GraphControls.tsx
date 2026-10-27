import { Search } from "lucide-react";

import type { ConceptStatus } from "../../services/api";

export type DomainFilter = "all" | "nlp" | "dl";
export type StatusFilter = "all" | ConceptStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "strong", label: "Strong" },
  { value: "developing", label: "Developing" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "not_started", label: "Not Started" },
  { value: "locked", label: "Locked" },
];

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  domainFilter: DomainFilter;
  onDomainFilterChange: (v: DomainFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  focusModeDisabled: boolean;
}

// Spec point 12 — search, domain/status filters, and the optional Focus
// Mode toggle. Zoom/reset live on the graph itself (ConceptGraph.tsx).
export default function GraphControls({
  search,
  onSearchChange,
  domainFilter,
  onDomainFilterChange,
  statusFilter,
  onStatusFilterChange,
  focusMode,
  onToggleFocusMode,
  focusModeDisabled,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex-1 min-w-0 max-w-xs">
        <Search size={13} className="absolute left-2.5 top-2.5 text-nexus-muted" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search concepts…"
          className="w-full rounded-lg border border-nexus-border bg-nexus-bg pl-8 pr-2 py-1.5 text-xs outline-none focus:border-nexus-accentDim"
        />
      </div>

      <div className="inline-flex rounded-lg border border-nexus-border bg-nexus-bg p-0.5 shrink-0">
        {(["all", "nlp", "dl"] as DomainFilter[]).map((d) => (
          <button
            key={d}
            onClick={() => onDomainFilterChange(d)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              domainFilter === d ? "bg-nexus-accent/15 text-nexus-text" : "text-nexus-muted hover:text-nexus-text"
            }`}
          >
            {d === "all" ? "All" : d === "nlp" ? "NLP" : "Deep Learning"}
          </button>
        ))}
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-nexus-border bg-nexus-bg px-2 py-1.5 text-xs outline-none focus:border-nexus-accentDim shrink-0"
      >
        {STATUS_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <button
        onClick={onToggleFocusMode}
        disabled={focusModeDisabled}
        title={focusModeDisabled ? "Select a concept to use Focus Mode" : "Show only this concept, its prerequisites, and its connections"}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0 disabled:opacity-40 ${
          focusMode ? "border-nexus-accent bg-nexus-accent/10 text-nexus-accent" : "border-nexus-border text-nexus-muted hover:text-nexus-text"
        }`}
      >
        Focus Mode
      </button>
    </div>
  );
}
