import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Domain = "nlp" | "dl";

// Which domain the student is currently focused on. Persisted to
// localStorage (via zustand's persist middleware, already a project
// dependency — no new library added) purely as a per-browser convenience so
// the choice survives a reload; it is not shared across devices and nothing
// server-side depends on it.
//
// As of Stage 2 this only drives the Domain Switcher's own highlighted
// state. Dashboard and Challenges are meant to read it to filter what they
// show, but those surfaces are still real, single-domain pages today (or
// honest placeholders) — wiring domain-filtered *content* into them
// happens when each of those is actually rebuilt (Stage 9/13), not here.
// Building that filtering now, against pages that don't have dual-domain
// content yet, would be exactly the kind of decorative control this
// project avoids.
interface DomainState {
  domain: Domain;
  setDomain: (domain: Domain) => void;
  toggleDomain: () => void;
}

export const useDomainStore = create<DomainState>()(
  persist(
    (set) => ({
      domain: "nlp",
      setDomain: (domain) => set({ domain }),
      toggleDomain: () => set((s) => ({ domain: s.domain === "nlp" ? "dl" : "nlp" })),
    }),
    { name: "neuronlp-nexus-domain" },
  ),
);
