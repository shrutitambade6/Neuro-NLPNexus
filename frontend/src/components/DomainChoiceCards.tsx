import { Brain, ChevronRight, Cpu, LogIn } from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { useDomainStore, type Domain } from "../store/domainStore";
import { useProgressStore } from "../store/progressStore";
import { nexusVar } from "../utils/theme";

// The first major choice on the dashboard, per the NeuroNLP Nexus spec:
// two large, clearly distinct domain cards rather than a small toggle
// buried in the header. Clicking a card sets the real, persisted domain
// choice (store/domainStore.ts) that the rest of this page — and the
// sidebar, and the DomainSwitcher in the top bar — already reads; nothing
// new is invented here, this is just a bigger, more legible entry point
// onto that same real state. The progress percentage shown is the real
// backend number from /api/progress/my-summary (via progressStore), never
// a placeholder — signed-out visitors see an honest "sign in to track"
// prompt instead of a fabricated 0%.
//
// Tailwind's JIT scanner needs literal class strings, not
// `bg-nexus-${var}` interpolation — that would silently emit no CSS at
// all. So each domain's full class set is written out literally below
// rather than built from a shared color token name.

function DomainCard({ domain }: { domain: Domain }) {
  const activeDomain = useDomainStore((s) => s.domain);
  const setDomain = useDomainStore((s) => s.setDomain);
  const token = useAuthStore((s) => s.token);
  const summary = useProgressStore((s) => s.summary);
  const isActive = activeDomain === domain;
  const progress = summary ? summary[domain === "nlp" ? "nlp_progress" : "dl_progress"] : null;
  const colorToken = domain === "nlp" ? "purple" : "gold";

  const Icon = domain === "nlp" ? Brain : Cpu;
  const title = domain === "nlp" ? "NLP — Natural Language Processing" : "Deep Learning";
  const tagline =
    domain === "nlp"
      ? "Tokenization, parsing, POS tagging, semantics, and language modeling — all real computations."
      : "Neurons, backpropagation, CNNs, RNNs, attention, and your own uploaded course modules.";

  const cardClass =
    domain === "nlp"
      ? isActive
        ? "border-nexus-purple bg-nexus-purple/10 shadow-glow"
        : "border-nexus-border bg-nexus-surface hover:border-nexus-purple/50 hover:-translate-y-0.5"
      : isActive
        ? "border-nexus-gold bg-nexus-gold/10 shadow-glow"
        : "border-nexus-border bg-nexus-surface hover:border-nexus-gold/50 hover:-translate-y-0.5";

  const iconWrapClass =
    domain === "nlp"
      ? isActive
        ? "bg-nexus-purple/20"
        : "bg-nexus-surfaceAlt"
      : isActive
        ? "bg-nexus-gold/20"
        : "bg-nexus-surfaceAlt";

  const iconClass =
    domain === "nlp" ? (isActive ? "text-nexus-purple" : "text-nexus-muted") : isActive ? "text-nexus-gold" : "text-nexus-muted";

  const chevronClass =
    domain === "nlp"
      ? isActive
        ? "text-nexus-purple translate-x-0.5"
        : "text-nexus-muted"
      : isActive
        ? "text-nexus-gold translate-x-0.5"
        : "text-nexus-muted";

  const percentClass = domain === "nlp" ? "text-nexus-purple" : "text-nexus-gold";

  return (
    <button
      onClick={() => setDomain(domain)}
      aria-pressed={isActive}
      className={`group relative flex-1 text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-200 overflow-hidden ${cardClass}`}
    >
      <div
        className={`absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl transition-opacity ${
          isActive ? "opacity-30" : "opacity-0 group-hover:opacity-20"
        }`}
        style={{ background: nexusVar(colorToken) }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className={`rounded-xl p-2.5 ${iconWrapClass}`}>
          <Icon size={26} className={iconClass} />
        </div>
        <ChevronRight size={18} className={`transition-transform ${chevronClass}`} />
      </div>

      <h3 className="relative mt-4 text-lg font-semibold">{title}</h3>
      <p className="relative text-sm text-nexus-muted mt-1.5 leading-relaxed">{tagline}</p>

      <div className="relative mt-4">
        {!token ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-nexus-muted">
            <LogIn size={12} /> Sign in to track your real progress here.
          </span>
        ) : progress ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-nexus-muted">
                {progress.completed} / {progress.total} lessons complete
              </span>
              <span className={`font-mono font-semibold ${percentClass}`}>{progress.percentage}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-nexus-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress.percentage}%`, background: nexusVar(colorToken) }}
              />
            </div>
          </div>
        ) : (
          <span className="text-xs text-nexus-muted">Loading your progress…</span>
        )}
      </div>
    </button>
  );
}

export default function DomainChoiceCards() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <DomainCard domain="nlp" />
      <DomainCard domain="dl" />
    </div>
  );
}
