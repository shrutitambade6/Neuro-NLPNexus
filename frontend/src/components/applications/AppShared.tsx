import { Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad">
      <AlertCircle size={14} className="shrink-0" /> {message}
    </div>
  );
}

export const BACKEND_ERROR = "Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.";

export function RunButton({
  onClick,
  loading,
  label,
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 transition-colors"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  );
}

/** A small labeled dot-and-line trail for a "Text -> Preprocessing -> Model
 * -> Prediction" style pipeline, driven entirely by real stage data the
 * backend returned — never a decorative/fake step. */
export function PipelineTrail({ steps }: { steps: { stage: string; detail: string }[] }) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-nexus-accent shrink-0 mt-1" />
            {i < steps.length - 1 && <div className="w-px flex-1 bg-nexus-border my-0.5" />}
          </div>
          <div className="pb-3">
            <p className="text-xs font-semibold text-nexus-text">{s.stage}</p>
            <p className="text-xs text-nexus-muted mt-0.5">{s.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const CONCEPT_LINKS: Record<string, string> = {
  Tokenization: "/preprocessing",
  Stemming: "/preprocessing",
  Lemmatization: "/preprocessing",
  "Edit distance": "/preprocessing",
  "N-grams": "/language-modeling",
  Perplexity: "/language-modeling",
  Parsing: "/parsing",
  "TF-IDF": "/semantics",
  "Cosine similarity": "/semantics",
  "Jaccard similarity": "/semantics",
  "Word sense disambiguation": "/semantics",
  Discourse: "/discourse",
  Coreference: "/discourse",
  "Text pipelines": "/playground",
};

/** "NLP concepts behind this" — clicking a concept chip navigates to the
 * lab that actually teaches it, closing the loop the spec asks for
 * (learn theory -> lab -> application -> practice). */
export function ConceptChips({ concepts }: { concepts: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {concepts.map((c) => {
        const path = CONCEPT_LINKS[c];
        const chip = (
          <span className="text-[11px] rounded-full border border-nexus-border bg-nexus-surfaceAlt px-2.5 py-1 text-nexus-muted hover:text-nexus-accent hover:border-nexus-accentDim transition-colors">
            {c}
          </span>
        );
        return path ? (
          <Link key={c} to={path}>
            {chip}
          </Link>
        ) : (
          <span key={c}>{chip}</span>
        );
      })}
    </div>
  );
}

export function MethodNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-nexus-muted/80 italic border-t border-nexus-border/50 pt-2 mt-1">{children}</p>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-nexus-surfaceAlt overflow-hidden">
        <div className="h-full bg-nexus-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-nexus-muted w-9 text-right">{pct}%</span>
    </div>
  );
}
