import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import ConceptTooltip from "../components/ConceptTooltip";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import StagesPipeline from "../components/StagesPipeline";
import { AMBIGUITY_TYPES } from "../data/ambiguity";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Foundations() {
  const [ambiguityIdx, setAmbiguityIdx] = useState(0);
  const active = AMBIGUITY_TYPES[ambiguityIdx];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">NLP Foundations</h1>
        <p className="text-nexus-muted text-sm mt-1">
          The concepts every other lab in NeuroNLP Nexus builds on. Underlined
          terms are interactive — hover or tap for a definition.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="nlp-foundations" label="NLP Foundations" />

      <Section title="Language, knowledge, and grammar">
        <p className="text-sm text-nexus-muted leading-relaxed">
          NLP sits at the intersection of linguistics and computer science — a
          system needs a formal <ConceptTooltip term="grammar" /> to recognize
          valid sentence structure, plus real-world knowledge to resolve what
          sentences actually mean. <ConceptTooltip term="syntax" />,{" "}
          <ConceptTooltip term="semantics" />, and{" "}
          <ConceptTooltip term="pragmatics" /> are separate but connected
          problems, each with its own lab in this app.
        </p>
        <ReadInBookLink book="nlp" chapterId="introduction-to-nlp" label="Read the full chapter in the NLP Book" />
      </Section>

      <Section title="Stages of NLP">
        <p className="text-sm text-nexus-muted">
          Classical NLP pipelines process text through a sequence of
          analysis stages. Click each stage below to see what it does.
        </p>
        <StagesPipeline />
      </Section>

      <Section title="Ambiguity">
        <p className="text-sm text-nexus-muted leading-relaxed">
          <ConceptTooltip term="ambiguity" /> occurs whenever language allows
          more than one valid interpretation. Pick a type below to explore it.
        </p>
        <ReadInBookLink book="nlp" chapterId="ambiguity-in-language" label="Read all 5 types in the NLP Book" />
        <div className="flex flex-wrap gap-2">
          {AMBIGUITY_TYPES.map((a, i) => (
            <button
              key={a.type}
              onClick={() => setAmbiguityIdx(i)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === ambiguityIdx
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                  : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {a.type}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3">
          <p className="text-sm text-nexus-muted">{active.description}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {active.examples.map((ex) => (
              <div key={ex.language} className="rounded-lg bg-nexus-bg border border-nexus-border p-3">
                <p className="text-[10px] uppercase tracking-wide text-nexus-accent mb-1">
                  {ex.language}
                </p>
                <p className="text-sm font-mono mb-1.5">{ex.text}</p>
                <p className="text-xs text-nexus-muted">{ex.explanation}</p>
              </div>
            ))}
          </div>
          {active.type === "Referential Ambiguity" && (
            <Link
              to="/discourse"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-nexus-accent hover:text-nexus-data"
            >
              Try resolving referential ambiguity yourself in the Discourse Lab <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </Section>

      <Section title="Why NLP is hard for Indian languages too">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Richer morphology, freer word order, and far smaller labeled
          datasets than English — this app is honest about the gap rather
          than implying parity it can't back up.
        </p>
        <ReadInBookLink book="nlp" chapterId="introduction-to-nlp" />
      </Section>
    </div>
  );
}
