import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";

import ConceptDetailPanel from "../components/conceptdna/ConceptDetailPanel";
import ConceptDnaHero from "../components/conceptdna/ConceptDnaHero";
import ConceptGraph from "../components/conceptdna/ConceptGraph";
import CrossDomainPanel from "../components/conceptdna/CrossDomainPanel";
import EmptyConceptDna from "../components/conceptdna/EmptyConceptDna";
import GraphControls, { type DomainFilter, type StatusFilter } from "../components/conceptdna/GraphControls";
import GraphLegend from "../components/conceptdna/GraphLegend";
import MobileConceptList from "../components/conceptdna/MobileConceptList";
import RecommendedNext from "../components/conceptdna/RecommendedNext";
import WeakConceptRadar from "../components/conceptdna/WeakConceptRadar";
import { useAuthStore } from "../store/authStore";
import { fetchConceptDna, type ConceptDnaResponse } from "../services/api";

// Concept DNA — spec section 21's "end-to-end" feature: one real backend
// computation (app/services/concept_dna_service.py), fetched once here,
// then sliced/filtered entirely client-side for search/filter/focus mode
// (point 16 — no graph recreation or re-fetch on every click).
export default function ConceptDna() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<ConceptDnaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchConceptDna()
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setError("Couldn't load your Concept DNA right now — please try again shortly.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const byId = useMemo(() => new Map((data?.concepts ?? []).map((c) => [c.id, c])), [data]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const recommendedId = data?.recommendation?.concept_id ?? null;

  const visibleIds = useMemo(() => {
    if (!data) return new Set<string>();
    const q = search.trim().toLowerCase();

    const matchesFilters = (c: (typeof data.concepts)[number]) => {
      if (domainFilter !== "all" && c.domain !== domainFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && !c.label.toLowerCase().includes(q)) return false;
      return true;
    };

    if (focusMode && selected) {
      const focusSet = new Set<string>([selected.id, ...selected.prerequisite_ids, ...selected.related_ids]);
      if (recommendedId) focusSet.add(recommendedId);
      return new Set([...focusSet].filter((id) => byId.has(id)));
    }

    return new Set(data.concepts.filter(matchesFilters).map((c) => c.id));
  }, [data, search, domainFilter, statusFilter, focusMode, selected, recommendedId, byId]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-3">
        <p className="text-sm text-nexus-muted">Sign in to see your Concept DNA.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
        >
          <LogIn size={14} /> Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Building your Concept DNA…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error ?? "Something went wrong."}
      </div>
    );
  }

  if (!data.has_any_activity) {
    return (
      <div className="space-y-8">
        <ConceptDnaHero summary={data.summary} />
        <EmptyConceptDna />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConceptDnaHero summary={data.summary} />

      <GraphControls
        search={search}
        onSearchChange={setSearch}
        domainFilter={domainFilter}
        onDomainFilterChange={setDomainFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((f) => !f)}
        focusModeDisabled={!selected}
      />

      <GraphLegend />

      {/* Desktop/tablet: graph + insight rail side by side. Mobile: a
          plain concept list instead of squeezing the graph (point 18) —
          selecting a concept there opens the same detail panel, with an
          optional focused mini graph underneath. */}
      <div className="hidden md:grid md:grid-cols-[1fr_320px] gap-5 items-start">
        <ConceptGraph
          concepts={data.concepts}
          edges={data.edges}
          visibleIds={visibleIds}
          selectedId={selectedId}
          recommendedId={recommendedId}
          onSelect={setSelectedId}
        />
        <div className="space-y-4">
          {selected ? (
            <ConceptDetailPanel
              concept={selected}
              allConcepts={data.concepts}
              onSelectConcept={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <>
              <RecommendedNext recommendation={data.recommendation} onSelect={setSelectedId} />
              <WeakConceptRadar weakConcepts={data.weak_concepts} onSelect={setSelectedId} />
            </>
          )}
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {selected ? (
          <div className="space-y-4">
            <ConceptDetailPanel
              concept={selected}
              allConcepts={data.concepts}
              onSelectConcept={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
            <div>
              <p className="text-xs font-semibold text-nexus-muted mb-1.5">Focused view</p>
              <ConceptGraph
                concepts={data.concepts}
                edges={data.edges}
                visibleIds={
                  new Set([selected.id, ...selected.prerequisite_ids, ...selected.related_ids].filter((id) => byId.has(id)))
                }
                selectedId={selectedId}
                recommendedId={recommendedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>
        ) : (
          <>
            <RecommendedNext recommendation={data.recommendation} onSelect={setSelectedId} />
            <MobileConceptList concepts={data.concepts.filter((c) => visibleIds.has(c.id))} selectedId={selectedId} onSelect={setSelectedId} />
            <WeakConceptRadar weakConcepts={data.weak_concepts} onSelect={setSelectedId} />
          </>
        )}
      </div>

      <CrossDomainPanel highlights={data.cross_domain_highlights} />
    </div>
  );
}
