import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  FileSearch,
  FileText,
  GitBranch,
  Languages,
  Layers,
  MessageSquareText,
  Network,
  Scale,
  ScrollText,
  Search,
  Smile,
  Sparkles,
  SplitSquareHorizontal,
  Tags,
  Type,
} from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = "nlp-learning-hub-explored";

type TopicStatus = "interactive" | "conceptual" | "not-built" | "removed";

interface Topic {
  id: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  status: TopicStatus;
  path?: string;
  note: string;
}

// Every entry below points at something that genuinely exists in this app
// (or honestly says it doesn't) — this hub is an index into the platform's
// real labs, not a second, shallower copy of them. "interactive" means a
// real backend computes a real result if you click through; "conceptual"
// means the idea is explained but nothing in this app computes it yet;
// "not-built"/"removed" are stated plainly rather than silently skipped.
const TOPICS: Topic[] = [
  {
    id: "tokenization",
    title: "Tokenization",
    blurb: "Splitting text into words, punctuation, and sentences.",
    icon: Type,
    status: "interactive",
    path: "/preprocessing",
    note: "Real whitespace / rule-based / regex / sentence tokenizers, side by side.",
  },
  {
    id: "stemming",
    title: "Stemming",
    blurb: "Chopping words down to a rough root form (running → run).",
    icon: ScrollText,
    status: "interactive",
    path: "/preprocessing",
    note: "A real from-scratch Porter (1980) stemmer, cross-verified against a reference implementation.",
  },
  {
    id: "lemmatization",
    title: "Lemmatization",
    blurb: "Reducing a word to its real dictionary form (better → good).",
    icon: ScrollText,
    status: "interactive",
    path: "/preprocessing",
    note: "A rule-based lemmatizer plus a prefix/root/suffix morphology breakdown.",
  },
  {
    id: "pos-tagging",
    title: "POS Tagging",
    blurb: "Labeling every word's grammatical role — noun, verb, adjective...",
    icon: Tags,
    status: "interactive",
    path: "/pos-tagging",
    note: "A real Hidden Markov Model decoded with the real Viterbi algorithm — the flagship lab on this page.",
  },
  {
    id: "parsing",
    title: "Parsing",
    blurb: "Building the grammatical tree structure of a sentence.",
    icon: GitBranch,
    status: "interactive",
    path: "/parsing",
    note: "Real CYK chart parsing over a small CNF grammar, with a step-by-step chart and parse tree.",
  },
  {
    id: "ner",
    title: "Named Entity Recognition",
    blurb: "Finding people, places, organizations, dates, and money in text.",
    icon: Search,
    status: "interactive",
    path: "/applications",
    note: "A real rule-based/gazetteer entity recognizer (see the Real-World NLP page).",
  },
  {
    id: "chunking",
    title: "Chunking",
    blurb: "Grouping words into phrases (noun phrases, verb phrases) without a full parse tree.",
    icon: Layers,
    status: "conceptual",
    path: "/discourse",
    note: "Real NP chunking runs inside the Discourse Lab's pronoun resolution, but there's no standalone chunking lab yet.",
  },
  {
    id: "semantics",
    title: "Semantic Analysis",
    blurb: "Comparing how similar two pieces of text actually mean.",
    icon: Brain,
    status: "interactive",
    path: "/semantics",
    note: "Real Jaccard and cosine similarity, plus WordNet relationship lookups.",
  },
  {
    id: "wsd",
    title: "Word Sense Disambiguation",
    blurb: "Figuring out which meaning of a word ('bank' the river vs. the money) is meant here.",
    icon: SplitSquareHorizontal,
    status: "interactive",
    path: "/semantics",
    note: "A real Lesk-algorithm WSD demo lives inside the Semantic Lab.",
  },
  {
    id: "sentiment",
    title: "Sentiment Analysis",
    blurb: "Is this piece of text positive, negative, or neutral?",
    icon: Smile,
    status: "interactive",
    path: "/applications",
    note: "A real lexicon-based sentiment scorer with negation and intensifier handling.",
  },
  {
    id: "classification",
    title: "Text Classification",
    blurb: "Sorting text into categories — sports, tech, business, and so on.",
    icon: FileSearch,
    status: "interactive",
    path: "/applications",
    note: "A real, small trained Multinomial Naive Bayes classifier.",
  },
  {
    id: "topic-modeling",
    title: "Topic Modeling / LDA",
    blurb: "Automatically discovering the topics hiding inside a set of documents.",
    icon: Layers,
    status: "removed",
    note: "This app had a real, working LDA lab earlier in development. It was deliberately removed during a later redesign to keep the platform focused — not something that was ever fake.",
  },
  {
    id: "translation",
    title: "Machine Translation",
    blurb: "Automatically translating text between languages.",
    icon: Languages,
    status: "interactive",
    path: "/applications",
    note: "Real translation via Google Translate's free public endpoint (needs the server's own internet access).",
  },
  {
    id: "summarization",
    title: "Text Summarization",
    blurb: "Automatically shortening a document to its most important sentences.",
    icon: FileText,
    status: "interactive",
    path: "/applications",
    note: "Real extractive (Luhn-style) summarization — every summary sentence is verbatim from the source.",
  },
  {
    id: "qa",
    title: "Question Answering",
    blurb: "Automatically finding the answer to a question inside a passage.",
    icon: MessageSquareText,
    status: "interactive",
    path: "/applications",
    note: "A real heuristic extractive QA demo, honestly labeled as not a trained QA model.",
  },
  {
    id: "chatbots",
    title: "Chatbots",
    blurb: "A program that holds a conversation about a topic.",
    icon: Bot,
    status: "interactive",
    path: "/applications",
    note: "The real NLP Learning Assistant — a context-aware chatbot over this app's own 56-concept NLP/DL knowledge base.",
  },
  {
    id: "language-models",
    title: "Language Models",
    blurb: "Predicting how likely a sequence of words is.",
    icon: ScrollText,
    status: "interactive",
    path: "/language-modeling",
    note: "Real n-gram counting, smoothed probability, and perplexity, computed step by step.",
  },
  {
    id: "embeddings",
    title: "Word Embeddings",
    blurb: "Representing words as vectors so 'king' and 'queen' end up near each other.",
    icon: Network,
    status: "conceptual",
    path: "/model-comparison",
    note: "No trained embedding model exists in this app yet — see the Model Comparison table's Word2Vec row for how the idea works.",
  },
  {
    id: "transformers",
    title: "Transformers & Attention",
    blurb: "The architecture behind modern language models — 'attending' to relevant context.",
    icon: Sparkles,
    status: "interactive",
    path: "/attention-transformers",
    note: "Real scaled dot-product attention over an editable token sequence (in the Deep Learning section).",
  },
  {
    id: "text-generation",
    title: "Text Generation",
    blurb: "Automatically writing new text — the basis of tools like modern chat assistants.",
    icon: Bot,
    status: "not-built",
    note: "This app doesn't run a generative language model — nothing here would produce a genuine result, so there's no demo to show yet.",
  },
];

const STATUS_LABEL: Record<TopicStatus, string> = {
  interactive: "Real & interactive",
  conceptual: "Conceptual only",
  "not-built": "Not built yet",
  removed: "Removed by design",
};

const STATUS_CLASSES: Record<TopicStatus, string> = {
  interactive: "border-nexus-good/40 bg-nexus-good/10 text-nexus-good",
  conceptual: "border-nexus-warn/40 bg-nexus-warn/10 text-nexus-warn",
  "not-built": "border-nexus-border text-nexus-muted",
  removed: "border-nexus-border text-nexus-muted",
};

function useExploredTopics() {
  const [explored, setExplored] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExplored(new Set(JSON.parse(raw)));
    } catch {
      // localStorage unavailable — progress just won't persist this visit.
    }
  }, []);

  const toggle = (id: string) => {
    setExplored((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore — this tracker is a local convenience, not a source of truth.
      }
      return next;
    });
  };

  return { explored, toggle };
}

function TopicCard({
  topic,
  isExplored,
  onToggle,
  index,
}: {
  topic: Topic;
  isExplored: boolean;
  onToggle: () => void;
  index: number;
}) {
  const Icon = topic.icon;
  const body = (
    <div className="group rounded-2xl border border-nexus-border bg-nexus-surface p-5 flex flex-col gap-3 h-full hover:border-nexus-accentDim hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-nexus-accent/10 p-2">
          <Icon size={18} className="text-nexus-accent" />
        </div>
        <span className={`text-[10px] rounded-full border px-2 py-0.5 ${STATUS_CLASSES[topic.status]}`}>
          {STATUS_LABEL[topic.status]}
        </span>
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-nexus-text">{topic.title}</p>
        <p className="text-xs text-nexus-muted mt-1 leading-relaxed">{topic.blurb}</p>
      </div>
      <p className="text-[11px] text-nexus-faint leading-relaxed">{topic.note}</p>
      {topic.path && (
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-nexus-accent opacity-0 group-hover:opacity-100 transition-opacity">
          {topic.status === "interactive" ? "Open lab" : "Learn more"} <ArrowRight size={12} />
        </span>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        title={isExplored ? "Marked as explored" : "Mark as explored"}
        className="absolute top-3 right-3 z-10 text-nexus-muted hover:text-nexus-good"
      >
        {isExplored ? <CheckCircle2 size={16} className="text-nexus-good" /> : <Circle size={16} />}
      </button>
      {topic.path ? <Link to={topic.path}>{body}</Link> : body}
    </motion.div>
  );
}

export default function NlpLearningHub() {
  const { explored, toggle } = useExploredTopics();
  const interactiveCount = TOPICS.filter((t) => t.status === "interactive").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles size={22} className="text-nexus-gold" />
          NLP Learning Hub
        </h1>
        <p className="text-nexus-muted text-sm mt-1 max-w-3xl">
          A single map of every NLP concept in NeuroNLP Nexus — {interactiveCount} of them are real,
          interactive labs you can run right now; a few are marked honestly as conceptual-only or
          not yet built, rather than dressed up to look finished.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="nlp-learning-hub" label="NLP Learning Hub" />
      <ReadInBookLink book="nlp" chapterId="real-world-nlp" label="Read the full chapter in the NLP Book" />

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {explored.size} / {TOPICS.length} topics marked explored
          </p>
          <p className="text-[11px] text-nexus-muted mt-0.5">
            Tracked in this browser only (click the circle on a card) — not synced to your account.
          </p>
        </div>
        <div className="w-32 h-2 rounded-full bg-nexus-bg overflow-hidden shrink-0">
          <motion.div
            className="h-full bg-nexus-good"
            initial={{ width: 0 }}
            animate={{ width: `${(explored.size / TOPICS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map((topic, i) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            isExplored={explored.has(topic.id)}
            onToggle={() => toggle(topic.id)}
            index={i}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surfaceAlt p-4 flex items-center gap-3">
        <Scale size={18} className="text-nexus-accent shrink-0" />
        <p className="text-xs text-nexus-muted">
          Want the bigger picture instead of one topic at a time? The{" "}
          <Link to="/model-comparison" className="text-nexus-accent hover:underline">Model Comparison</Link> page lines up
          9 approaches (bag-of-words through GPT) side by side, and{" "}
          <Link to="/dl-applications" className="text-nexus-accent hover:underline">Deep Learning Applications</Link> shows
          how the NLP ideas above connect to the Deep Learning labs.
        </p>
      </div>
    </div>
  );
}
