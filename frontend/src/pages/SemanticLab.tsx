import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import AmbiguityExplorer from "../components/AmbiguityExplorer";
import ConceptTooltip from "../components/ConceptTooltip";
import CosineCalculator from "../components/CosineCalculator";
import JaccardCalculator from "../components/JaccardCalculator";
import KnowledgeGraphLab from "../components/KnowledgeGraphLab";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import RelationQuiz from "../components/RelationQuiz";
import SemanticPipeline from "../components/SemanticPipeline";
import TfidfLab from "../components/TfidfLab";
import TryYourOwnRelation from "../components/TryYourOwnRelation";
import WordNetExplorer from "../components/WordNetExplorer";
import WsdLab from "../components/WsdLab";

type Tab = "lexical" | "relations" | "wsd" | "wordnet" | "similarity" | "knowledge";

const VALID_TABS: Tab[] = ["lexical", "relations", "wsd", "wordnet", "similarity", "knowledge"];

const TABS: { id: Tab; label: string }[] = [
  { id: "lexical", label: "Lexical Semantics" },
  { id: "relations", label: "Semantic Relations" },
  { id: "wsd", label: "Word Sense Disambiguation" },
  { id: "wordnet", label: "WordNet / BabelNet" },
  { id: "similarity", label: "Similarity & TF-IDF" },
  { id: "knowledge", label: "Knowledge Graph" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function SemanticLab() {
  // Deep-link support for the redesigned Knowledge Map
  // (components/KnowledgeMap.tsx): clicking its WSD / WordNet / Similarity
  // module cards links here as /semantics?tab=wsd (etc.), so the right tab
  // is already open instead of defaulting to Lexical Semantics every time.
  // A plain visit to /semantics (no query string, or an unrecognized one)
  // behaves exactly as before.
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: Tab = VALID_TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "lexical";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Semantic Laboratory</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Explore how NLP systems represent, compare, disambiguate, and
          reason about meaning. Underlined terms are interactive.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="semantics" label="Semantic Lab" />

      <Card title="From word to meaning">
        <SemanticPipeline />
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                : "border-nexus-border text-nexus-muted hover:text-nexus-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lexical" && (
        <>
          <Card title="Lexical Semantics">
            <p className="text-sm text-nexus-muted leading-relaxed">
              The study of word meaning — how individual <ConceptTooltip term="lexeme" /> units carry meaning, and how one word can have multiple senses.
            </p>
            <ReadInBookLink book="nlp" chapterId="lexical-semantics" />
          </Card>
          <Card title="Ambiguity: one sentence, two meanings">
            <AmbiguityExplorer />
          </Card>
        </>
      )}

      {tab === "relations" && (
        <>
          <Card title="Semantic relation types">
            <p className="text-sm text-nexus-muted leading-relaxed">
              Words relate structurally: <ConceptTooltip term="synonymy" />, <ConceptTooltip term="antonymy" />, <ConceptTooltip term="hypernym" />/<ConceptTooltip term="hyponym" />, and <ConceptTooltip term="meronym" />/<ConceptTooltip term="holonym" />.
            </p>
            <ReadInBookLink book="nlp" chapterId="lexical-semantics" label="Read all semantic relation types in the NLP Book" />
          </Card>
          <Card title="Classify the relation — practice exercise">
            <RelationQuiz />
          </Card>
          <Card title="Try your own">
            <TryYourOwnRelation />
          </Card>
        </>
      )}

      {tab === "wsd" && (
        <Card title="Word Sense Disambiguation (simplified Lesk algorithm)">
          <p className="text-sm text-nexus-muted leading-relaxed">
            Determining which <ConceptTooltip term="semantics">sense</ConceptTooltip> of a word is meant in a specific context — this lab uses a simplified Lesk algorithm.
          </p>
          <ReadInBookLink book="nlp" chapterId="word-sense-disambiguation" />
          <WsdLab />
        </Card>
      )}

      {tab === "wordnet" && (
        <>
          <Card title="WordNet Explorer">
            <p className="text-sm text-nexus-muted leading-relaxed">
              A lexical database that groups words into synonym sets (synsets) linked by semantic relations.
            </p>
            <ReadInBookLink book="nlp" chapterId="word-sense-disambiguation" label="Read WordNet vs. BabelNet in the NLP Book" />
            <WordNetExplorer />
          </Card>
          <Card title="BabelNet">
            <p className="text-sm text-nexus-muted leading-relaxed">
              BabelNet is a multilingual semantic network that merges WordNet
              with other multilingual resources. NeuroNLP Nexus does not have a
              configured BabelNet API key, so no live BabelNet lookups are
              available here — that's stated honestly rather than faked.
            </p>
            <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-3 py-2 text-xs text-nexus-warn">
              BabelNet integration requires API configuration.
            </div>
          </Card>
          <Card title="WordNet vs. BabelNet">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-nexus-muted text-left border-b border-nexus-border">
                    <th className="py-2 pr-4">Feature</th>
                    <th className="py-2 pr-4">WordNet</th>
                    <th className="py-2">BabelNet</th>
                  </tr>
                </thead>
                <tbody className="text-nexus-muted">
                  {[
                    ["Primary focus", "English lexical database", "Multilingual semantic network"],
                    ["Synsets", "Yes", "Yes"],
                    ["Multilingual", "Limited", "Strong"],
                    ["Semantic relations", "Yes", "Yes"],
                    ["NLP usage", "WSD, semantics", "Multilingual semantics"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-nexus-border/50">
                      <td className="py-2 pr-4 text-nexus-text">{row[0]}</td>
                      <td className="py-2 pr-4">{row[1]}</td>
                      <td className="py-2">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "similarity" && (
        <>
          <Card title="Jaccard Similarity">
            <p className="text-sm text-nexus-muted leading-relaxed">
              Intersection ÷ union of two sets — how much they overlap.
            </p>
            <ReadInBookLink book="nlp" chapterId="similarity-and-tfidf" />
            <JaccardCalculator />
          </Card>
          <Card title="Cosine Similarity">
            <p className="text-sm text-nexus-muted leading-relaxed">
              The cosine of the angle between two vectors — how similarly they "point."
            </p>
            <ReadInBookLink book="nlp" chapterId="similarity-and-tfidf" />
            <CosineCalculator />
          </Card>
          <Card title="TF-IDF">
            <p className="text-sm text-nexus-muted leading-relaxed">
              Boosts words frequent in one document but rare across the whole collection.
            </p>
            <ReadInBookLink book="nlp" chapterId="similarity-and-tfidf" label="Read the full TF-IDF derivation in the NLP Book" />
            <TfidfLab />
          </Card>
          <Card title="Semantic similarity vs. relatedness">
            <p className="text-sm text-nexus-muted leading-relaxed">
              <span className="font-medium text-nexus-text">Car — Automobile</span> are
              highly <ConceptTooltip term="similarity" /> (near-synonyms).{" "}
              <span className="font-medium text-nexus-text">Car — Road</span> are{" "}
              <ConceptTooltip term="relatedness" /> without being similar — they're
              connected by association, not by shared meaning. This distinction is a
              frequent viva question.
            </p>
          </Card>
          <Card title="Word embeddings (concept overview)">
            <p className="text-sm text-nexus-muted leading-relaxed mb-2">
              <ConceptTooltip term="embedding" /> represent words as dense
              numeric vectors positioned so that semantically similar words
              sit near each other in that space — e.g. the vector direction
              from "man" to "woman" is conceptually similar to the direction
              from "king" to "queen."
            </p>
            <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-3 py-2 text-xs text-nexus-warn">
              Illustrative concept only — no real embedding model is loaded
              in this lab yet, so no actual vectors are shown or computed.
            </div>
          </Card>
        </>
      )}

      {tab === "knowledge" && (
        <>
          <Card title="Ontology vs. Knowledge Graph">
            <p className="text-sm text-nexus-muted leading-relaxed">
              An <ConceptTooltip term="ontology" /> is the rulebook of categories; a knowledge graph is the actual web of facts built using it.
            </p>
            <ReadInBookLink book="nlp" chapterId="knowledge-graphs" />
          </Card>
          <Card title="Build a knowledge graph">
            <KnowledgeGraphLab />
          </Card>
        </>
      )}
    </div>
  );
}
