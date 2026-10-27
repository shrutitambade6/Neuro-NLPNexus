import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  FileSearch,
  FileText,
  Globe,
  Languages,
  Mail,
  MessageCircle,
  MessagesSquare,
  Mic,
  Newspaper,
  Search,
  Smile,
  Tag,
  X,
} from "lucide-react";

import ClassificationDemo from "../components/applications/ClassificationDemo";
import DocumentAnalysisDemo from "../components/applications/DocumentAnalysisDemo";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import NerDemo from "../components/applications/NerDemo";
import NlpLearningAssistant from "../components/applications/NlpLearningAssistant";
import QaDemo from "../components/applications/QaDemo";
import SearchDemo from "../components/applications/SearchDemo";
import SentimentDemo from "../components/applications/SentimentDemo";
import SocialMediaDemo from "../components/applications/SocialMediaDemo";
import SpamDemo from "../components/applications/SpamDemo";
import SummarizationDemo from "../components/applications/SummarizationDemo";
import TranslationDemo from "../components/applications/TranslationDemo";
import { ConceptChips } from "../components/applications/AppShared";

interface AppDef {
  id: string;
  icon: LucideIcon;
  name: string;
  blurb: string;
  usedIn: string;
  concepts: string[];
  Demo: React.ComponentType | null;
  /** Contextual starter question seeded into the NLP Learning Assistant when
   * the student clicks "Ask NLP Assistant" on this card, per the spec's
   * learn -> ask -> understand loop connecting applications to the tutor. */
  assistantPrompt: string;
}

const APPS: AppDef[] = [
  {
    id: "sentiment",
    icon: Smile,
    name: "Sentiment Analysis",
    blurb: "Understand whether text expresses positive, negative, or neutral sentiment.",
    usedIn: "Product reviews · Social media · Customer feedback",
    concepts: ["Tokenization", "Text pipelines"],
    Demo: SentimentDemo,
    assistantPrompt: "Explain how sentiment analysis is used in product reviews.",
  },
  {
    id: "summarization",
    icon: FileText,
    name: "Text Summarization",
    blurb: "Condense a long document down to its most important sentences.",
    usedIn: "News · Research papers · Meeting notes",
    concepts: ["Tokenization", "TF-IDF"],
    Demo: SummarizationDemo,
    assistantPrompt: "Why do we use text summarization?",
  },
  {
    id: "translation",
    icon: Languages,
    name: "Machine Translation",
    blurb: "Translate text between languages using a real translation service.",
    usedIn: "Cross-language communication · Localization",
    concepts: ["Tokenization"],
    Demo: TranslationDemo,
    assistantPrompt: "How does machine translation work?",
  },
  {
    id: "ir",
    icon: Search,
    name: "Information Retrieval",
    blurb: "Rank documents by relevance to a search query.",
    usedIn: "Search engines · Document lookup",
    concepts: ["TF-IDF", "Cosine similarity"],
    Demo: SearchDemo,
    assistantPrompt: "How does information retrieval rank search results?",
  },
  {
    id: "qa",
    icon: FileSearch,
    name: "Question Answering",
    blurb: "Extract a direct answer to a question from a passage of text.",
    usedIn: "Search snippets · Help-desk assistants",
    concepts: ["Tokenization", "Discourse"],
    Demo: QaDemo,
    assistantPrompt: "How does question answering find an answer in a passage?",
  },
  {
    id: "ner",
    icon: Tag,
    name: "Named Entity Recognition",
    blurb: "Find and label people, places, organizations, dates, and money in text.",
    usedIn: "Document tagging · News analysis · Resume parsing",
    concepts: ["Tokenization"],
    Demo: NerDemo,
    assistantPrompt: "Give me an example of named entity recognition.",
  },
  {
    id: "classification",
    icon: Newspaper,
    name: "Text Classification",
    blurb: "Sort text into categories using a trained probabilistic classifier.",
    usedIn: "News categorization · Content routing",
    concepts: ["Tokenization", "TF-IDF"],
    Demo: ClassificationDemo,
    assistantPrompt: "How does text classification decide the category?",
  },
  {
    id: "spam",
    icon: Mail,
    name: "Spam Detection",
    blurb: "Flag suspicious emails using a checklist of real heuristic signals.",
    usedIn: "Email inboxes · Message filtering",
    concepts: ["Tokenization"],
    Demo: SpamDemo,
    assistantPrompt: "What signals does spam detection look for?",
  },
  {
    id: "chatbot",
    icon: Bot,
    name: "NLP Learning Assistant",
    blurb: "A context-aware NLP tutor — detects what you're asking (definition, example, code, numerical, viva, challenge) and answers accordingly.",
    usedIn: "Studying · Homework help · Exam/viva prep",
    concepts: ["Tokenization"],
    Demo: NlpLearningAssistant,
    assistantPrompt: "What can you help me with?",
  },
  {
    id: "document",
    icon: MessagesSquare,
    name: "Document Analysis",
    blurb: "Extract keywords, entities, sentiment, and a summary from one document at once.",
    usedIn: "Reports · Contracts · Long emails",
    concepts: ["Tokenization", "TF-IDF", "Discourse"],
    Demo: DocumentAnalysisDemo,
    assistantPrompt: "What NLP techniques does document analysis combine?",
  },
  {
    id: "social",
    icon: MessageCircle,
    name: "Social Media Analysis",
    blurb: "Apply sentiment and entity analysis to short, informal social posts.",
    usedIn: "Brand monitoring · Public sentiment tracking",
    concepts: ["Tokenization"],
    Demo: SocialMediaDemo,
    assistantPrompt: "Why can't sentiment analysis reliably detect sarcasm?",
  },
  {
    id: "speech",
    icon: Mic,
    name: "Speech & Language Systems",
    blurb: "How speech recognition and text-to-speech fit around the same NLP pipeline.",
    usedIn: "Voice assistants · Dictation · Accessibility tools",
    concepts: ["N-grams", "Perplexity"],
    Demo: null,
    assistantPrompt: "How does perplexity help a speech recognition system?",
  },
];

function AppCard({
  app,
  expanded,
  onToggle,
  onAskAssistant,
  assistantSeed,
}: {
  app: AppDef;
  expanded: boolean;
  onToggle: () => void;
  onAskAssistant: (app: AppDef) => void;
  assistantSeed: { message: string; key: number } | null;
}) {
  const Icon = app.icon;
  const isAssistantCard = app.id === "chatbot";
  return (
    <div
      className={`rounded-2xl border bg-nexus-surface p-5 flex flex-col gap-3 transition-all duration-200 ${
        expanded ? "border-nexus-accent md:col-span-2 lg:col-span-3" : "border-nexus-border hover:border-nexus-accentDim hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-nexus-accent/10 p-2">
          <Icon size={18} className="text-nexus-accent" />
        </div>
        {expanded && (
          <button onClick={onToggle} className="text-nexus-muted hover:text-nexus-text">
            <X size={16} />
          </button>
        )}
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-nexus-text">{app.name}</p>
        <p className="text-xs text-nexus-muted mt-1 leading-relaxed">{app.blurb}</p>
      </div>
      <div>
        <p className="text-[10px] text-nexus-muted uppercase tracking-wide">Used in</p>
        <p className="text-xs text-nexus-muted">{app.usedIn}</p>
      </div>
      <ConceptChips concepts={app.concepts} />

      {expanded && isAssistantCard && (
        <div className="pt-3 mt-1 border-t border-nexus-border">
          <NlpLearningAssistant seedMessage={assistantSeed?.message} seedKey={assistantSeed?.key} />
        </div>
      )}
      {expanded && !isAssistantCard && app.Demo && (
        <div className="pt-3 mt-1 border-t border-nexus-border">
          <app.Demo />
        </div>
      )}
      {expanded && !isAssistantCard && !app.Demo && (
        <div className="pt-3 mt-1 border-t border-nexus-border text-sm text-nexus-muted leading-relaxed space-y-2">
          <p>
            A real speech pipeline chains three separate systems: automatic speech recognition (audio → text),
            the same kind of NLP techniques taught in this lab (on that transcribed text), and text-to-speech
            (text → audio) for a spoken response.
          </p>
          <p>
            This is a conceptual overview, not a live demo — real speech recognition needs an audio model this
            project doesn't include, so rather than fake a transcription, this card explains the pipeline honestly
            instead. The middle step (understanding the transcribed text) is exactly what the Language Modeling
            lab's n-gram probability and perplexity calculations are used for in real speech systems, to judge
            which candidate transcription is more likely to be real language.
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center gap-3">
        {!expanded && (
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs font-medium text-nexus-accent hover:text-nexus-data"
          >
            {app.Demo ? "Try it →" : "Learn more →"}
          </button>
        )}
        {!isAssistantCard && (
          <button
            onClick={() => onAskAssistant(app)}
            className="inline-flex items-center gap-1 text-xs font-medium text-nexus-muted hover:text-nexus-yellow"
          >
            <Bot size={13} /> Ask NLP Assistant
          </button>
        )}
      </div>
    </div>
  );
}

const PIPELINE_STAGES = ["RAW TEXT", "UNDERSTAND", "ANALYZE", "TRANSFORM", "RESPOND"];
const ROADMAP = [
  { label: "Text Processing", path: "/preprocessing" },
  { label: "Language Modeling", path: "/language-modeling" },
  { label: "Parsing", path: "/parsing" },
  { label: "Semantics", path: "/semantics" },
  { label: "Discourse", path: "/discourse" },
  { label: "Applications", path: "/applications" },
];

export default function RealWorldNlp() {
  // Deep-link support for the redesigned Knowledge Map
  // (components/KnowledgeMap.tsx): its Translation / Summarization /
  // Sentiment / Question Answering module cards link here as
  // /applications?app=translation (etc.), so that card is already
  // expanded instead of landing on a fully collapsed list. A plain visit
  // to /applications (no query string, or an id that doesn't match any
  // real APPS entry) behaves exactly as before — fully collapsed.
  const [searchParams] = useSearchParams();
  const requestedApp = searchParams.get("app");
  const initialExpandedId = APPS.some((app) => app.id === requestedApp) ? requestedApp : null;
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
  const [assistantSeed, setAssistantSeed] = useState<{ message: string; key: number } | null>(null);

  const askAssistantAbout = (app: AppDef) => {
    setExpandedId("chatbot");
    setAssistantSeed({ message: app.assistantPrompt, key: Date.now() });
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-surface px-3 py-1 text-xs text-nexus-muted">
          <Globe size={12} className="text-nexus-accent" /> Real-World NLP
        </div>
        <h1 className="text-3xl font-display font-semibold">NLP in the Real World</h1>
        <p className="text-nexus-muted text-sm">
          See how the concepts you learn in the labs become real applications.
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <LessonCompleteButton domain="nlp" moduleId="nlp-applications" label="Real-World NLP" />
        <ReadInBookLink book="nlp" chapterId="real-world-nlp" label="Read the full chapter in the NLP Book" />
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center gap-2">
            <span className="rounded-full border border-nexus-border bg-nexus-surface px-3 py-1.5 text-xs font-medium text-nexus-text">
              {stage}
            </span>
            {i < PIPELINE_STAGES.length - 1 && <span className="text-nexus-accent">→</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPS.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            expanded={expandedId === app.id}
            onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
            onAskAssistant={askAssistantAbout}
            assistantSeed={app.id === "chatbot" ? assistantSeed : null}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <p className="text-sm font-semibold mb-1">From Text to Intelligence</p>
        <p className="text-xs text-nexus-muted mb-4">
          Every application above is built from these stages — click any of them to go learn it in its lab.
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {ROADMAP.map((node, i) => (
            <div key={node.path} className="flex items-center gap-2">
              <a
                href={node.path}
                className="rounded-full border border-nexus-border bg-nexus-surfaceAlt px-3 py-1.5 text-xs text-nexus-text hover:border-nexus-accent hover:text-nexus-accent transition-colors"
              >
                {node.label}
              </a>
              {i < ROADMAP.length - 1 && <span className="text-nexus-muted">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
