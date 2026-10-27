import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Lock,
  Sparkles,
} from "lucide-react";

import { useProgressStore } from "../store/progressStore";
import { nexusVar } from "../utils/theme";
import {
  KNOWLEDGE_MAP,
  type KnowledgeMapCategory,
  type KnowledgeMapTopic,
} from "../utils/knowledgeMapCatalog";

// ---------------------------------------------------------------------------
// NLP Knowledge Map — interactive learning roadmap.
//
// Replaces the old plain 4-column branch/leaf picker (which had no routes,
// no progress, nothing clickable beyond a local highlight) with a real
// learning path: category cards -> connected module cards -> navigation
// into the exact existing lab pages, all driven by the real
// /api/progress/my-summary data already powering the Dashboard and every
// <LessonCompleteButton>. See utils/knowledgeMapCatalog.ts for the full
// explanation of why several named topics intentionally share one real
// moduleId (they're different sections of the SAME real lab page) and why
// there is no fabricated per-topic percentage: the backend only tracks
// whole-lesson completion (done / not done), never a partial 0-100 value
// per module, so "in progress" here means "the next real lesson you
// haven't completed yet" (computed from real data) rather than an invented
// number.
// ---------------------------------------------------------------------------

type Accent = "purple" | "accent" | "data" | "gold";

// Literal class strings per accent — Tailwind's JIT content scanner reads
// the source file as TEXT, so these all still get generated even though
// they're picked at runtime from an object rather than written directly in
// JSX (same approach as DomainChoiceCards.tsx, for the same reason: a
// class name built at runtime via string concatenation/replace, e.g.
// `border-nexus-purple`.replace("border-", "bg-"), is invisible to the
// scanner and silently emits no CSS — every variant actually used below
// must appear literally, in full, somewhere in this object).
const ACCENT_STYLES: Record<
  Accent,
  {
    border: string;
    bgSoft: string;
    bgSofter: string;
    solidBg: string;
    text: string;
    ring: string;
    hoverBorder: string;
  }
> = {
  purple: {
    border: "border-nexus-purple",
    bgSoft: "bg-nexus-purple/10",
    bgSofter: "bg-nexus-purple/15",
    solidBg: "bg-nexus-purple",
    text: "text-nexus-purple",
    ring: "focus-visible:ring-nexus-purple",
    hoverBorder: "hover:border-nexus-purple/50",
  },
  accent: {
    border: "border-nexus-accent",
    bgSoft: "bg-nexus-accent/10",
    bgSofter: "bg-nexus-accent/15",
    solidBg: "bg-nexus-accent",
    text: "text-nexus-accent",
    ring: "focus-visible:ring-nexus-accent",
    hoverBorder: "hover:border-nexus-accentDim",
  },
  data: {
    border: "border-nexus-data",
    bgSoft: "bg-nexus-data/10",
    bgSofter: "bg-nexus-data/15",
    solidBg: "bg-nexus-data",
    text: "text-nexus-data",
    ring: "focus-visible:ring-nexus-data",
    hoverBorder: "hover:border-nexus-data/50",
  },
  gold: {
    border: "border-nexus-gold",
    bgSoft: "bg-nexus-gold/10",
    bgSofter: "bg-nexus-gold/15",
    solidBg: "bg-nexus-gold",
    text: "text-nexus-gold",
    ring: "focus-visible:ring-nexus-gold",
    hoverBorder: "hover:border-nexus-gold/50",
  },
};

type TopicStatus = "completed" | "up-next" | "available" | "locked";

interface ComputedTopic extends KnowledgeMapTopic {
  status: TopicStatus;
  lockedReason?: string;
}

interface ComputedCategory extends KnowledgeMapCategory {
  topics: ComputedTopic[];
  lessonsCompleted: number;
  lessonsTotal: number;
}

// The one place that turns real completed-module-ids into the four visual
// states this map shows. Locking only ever applies WITHIN a category,
// between two topics that genuinely are different real lessons — two
// topics sharing one moduleId (e.g. Tokenization/Morphology) are never
// locked relative to each other, because there is only one real "mark
// complete" action covering both of them. "up-next" is the single
// globally-first not-yet-completed, not-locked topic across the whole map
// (category order, then topic order) — the exact same value both the
// highlighted path card AND the motivational side card read, so there's
// only one definition of "what's next" anywhere in this component.
function computeKnowledgeMapState(completedIds: ReadonlySet<string>): {
  categories: ComputedCategory[];
  upNext: ComputedTopic | null;
} {
  const categories: ComputedCategory[] = KNOWLEDGE_MAP.map((category) => {
    let prevModuleId: string | null = null;
    let prevLabel: string | null = null;
    const distinctModuleIds = new Set<string>();

    const topics: ComputedTopic[] = category.topics.map((topic) => {
      distinctModuleIds.add(topic.moduleId);

      const sameLessonAsPrevious = prevModuleId !== null && topic.moduleId === prevModuleId;
      const locked = prevModuleId !== null && !sameLessonAsPrevious && !completedIds.has(prevModuleId);

      let status: TopicStatus;
      let lockedReason: string | undefined;
      if (locked) {
        status = "locked";
        lockedReason = prevLabel ? `Complete ${prevLabel} first` : undefined;
      } else if (completedIds.has(topic.moduleId)) {
        status = "completed";
      } else {
        status = "available"; // the first "available" topic overall gets upgraded to "up-next" below
      }

      prevModuleId = topic.moduleId;
      prevLabel = topic.label;

      return { ...topic, status, lockedReason };
    });

    const completedLessons = [...distinctModuleIds].filter((id) => completedIds.has(id)).length;

    return {
      ...category,
      topics,
      lessonsCompleted: completedLessons,
      lessonsTotal: distinctModuleIds.size,
    };
  });

  const flattened = categories.flatMap((c) => c.topics);
  const upNext = flattened.find((t) => t.status === "available") ?? null;
  if (upNext) {
    // Same object reference as the one sitting inside `categories` above —
    // mutating it here is what makes the path's own card show "Up next"
    // too, from this one computation.
    upNext.status = "up-next";
  }

  return { categories, upNext };
}

function topicHref(topic: KnowledgeMapTopic): { pathname: string; search?: string; hash?: string } {
  return {
    pathname: topic.path,
    search: topic.query ? `?${new URLSearchParams(topic.query).toString()}` : undefined,
    hash: topic.hash ? `#${topic.hash}` : undefined,
  };
}

// ---- Status badge — icon + text always together, never color alone ----
function StatusBadge({ status }: { status: TopicStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-nexus-good">
        <CheckCircle2 size={13} /> Completed
      </span>
    );
  }
  if (status === "up-next") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-nexus-accent">
        <Sparkles size={13} /> Up next
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-nexus-muted">
        <Lock size={12} /> Locked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-nexus-muted">
      <Circle size={12} /> Not started
    </span>
  );
}

// ---- Connector between two module cards — orientation flips at md: ----
function Connector({ accent, lit }: { accent: Accent; lit: boolean }) {
  const reduceMotion = useReducedMotion();
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className="flex md:flex-col items-center justify-center shrink-0 self-stretch md:self-auto py-1 md:py-0 md:px-1"
      aria-hidden="true"
    >
      {/* Mobile: vertical connector */}
      <div className="md:hidden flex flex-col items-center gap-0.5 h-8">
        <motion.div
          initial={reduceMotion ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`w-px flex-1 origin-top ${lit ? styles.solidBg : "bg-nexus-border"}`}
        />
        <ChevronDown size={14} className={lit ? styles.text : "text-nexus-muted"} />
      </div>
      {/* Desktop: horizontal connector */}
      <div className="hidden md:flex items-center gap-0.5 w-10">
        <motion.div
          initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-px flex-1 origin-left ${lit ? styles.solidBg : "bg-nexus-border"}`}
        />
        <ChevronRight size={14} className={lit ? styles.text : "text-nexus-muted"} />
      </div>
    </div>
  );
}

// ---- One module/topic card ----
function TopicCard({ topic, accent, index }: { topic: ComputedTopic; accent: Accent; index: number }) {
  const reduceMotion = useReducedMotion();
  const styles = ACCENT_STYLES[accent];
  const Icon = topic.icon;
  const isLocked = topic.status === "locked";
  const isUpNext = topic.status === "up-next";
  const isCompleted = topic.status === "completed";

  const cardClass = isLocked
    ? "border-nexus-border bg-nexus-surface/60 opacity-70"
    : isUpNext
      ? `${styles.border} ${styles.bgSoft}`
      : isCompleted
        ? "border-nexus-good/40 bg-nexus-good/5"
        : `border-nexus-border bg-nexus-surface ${styles.hoverBorder}`;

  const content = (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduceMotion ? 0 : index * 0.06, ease: "easeOut" }}
      whileHover={isLocked || reduceMotion ? undefined : { y: -4 }}
      style={isUpNext && !reduceMotion ? { boxShadow: `0 0 36px -14px ${nexusVar(accent, 0.55)}` } : undefined}
      className={`group relative w-64 shrink-0 rounded-2xl border p-4 flex flex-col gap-2.5 transition-colors duration-200 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`rounded-lg p-2 ${
            isLocked ? "bg-nexus-surfaceAlt" : isCompleted ? "bg-nexus-good/10" : styles.bgSofter
          }`}
        >
          <Icon
            size={16}
            className={isLocked ? "text-nexus-muted" : isCompleted ? "text-nexus-good" : styles.text}
          />
        </div>
        {!isLocked && (
          <ArrowRight
            size={14}
            className={`mt-1.5 shrink-0 transition-transform ${styles.text} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-focus-visible:opacity-100`}
          />
        )}
      </div>

      <div>
        <p className="font-display text-sm font-semibold text-nexus-text">{topic.label}</p>
        <p className="text-xs text-nexus-muted mt-1 leading-relaxed">{topic.description}</p>
      </div>

      <div className="mt-auto pt-1.5">
        <StatusBadge status={topic.status} />
      </div>

      {isLocked && topic.lockedReason && (
        <p className="text-[11px] text-nexus-muted/80 border-t border-nexus-border pt-2 -mt-0.5">
          {topic.lockedReason}
        </p>
      )}
    </motion.div>
  );

  if (isLocked) {
    // Not a Link/button — nothing to activate. aria-disabled (rather than a
    // custom aria-label) keeps the card's own visible text — label,
    // description, the "Locked" badge, and the "Complete X first" line —
    // exposed to assistive tech exactly as sighted users read it, instead
    // of flattening it into one summary string.
    return <div aria-disabled="true">{content}</div>;
  }

  return (
    <Link
      to={topicHref(topic)}
      aria-label={`${topic.label} — ${isCompleted ? "completed" : isUpNext ? "up next" : "not started yet"}. ${topic.description}`}
      className={`block rounded-2xl outline-none focus-visible:ring-2 ${styles.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg`}
    >
      {content}
    </Link>
  );
}

// ---- The connected learning path for one category ----
function LearningPath({ category }: { category: ComputedCategory }) {
  return (
    <div className="flex flex-col md:flex-row md:items-stretch gap-0 overflow-x-auto pb-2">
      {category.topics.map((topic, i) => (
        <div key={topic.id} className="flex flex-col md:flex-row items-center md:items-stretch">
          {i > 0 && <Connector accent={category.accent} lit={category.topics[i - 1].status === "completed"} />}
          <TopicCard topic={topic} accent={category.accent} index={i} />
        </div>
      ))}
    </div>
  );
}

// ---- Category selector card ----
function CategoryButton({
  category,
  selected,
  onSelect,
}: {
  category: ComputedCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  const styles = ACCENT_STYLES[category.accent];
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={selected ? { boxShadow: `0 0 32px -12px ${nexusVar(category.accent, 0.45)}` } : undefined}
      className={`group relative flex-1 min-w-[11rem] text-left rounded-2xl border p-4 transition-all duration-200 outline-none focus-visible:ring-2 ${styles.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg ${
        selected
          ? `${styles.border} ${styles.bgSoft}`
          : `border-nexus-border bg-nexus-surface ${styles.hoverBorder} hover:-translate-y-0.5`
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2 ${selected ? styles.bgSofter : "bg-nexus-surfaceAlt"}`}>
          <Icon size={20} className={selected ? styles.text : "text-nexus-muted group-hover:text-nexus-text"} />
        </div>
        <ChevronRight
          size={16}
          className={`mt-1 transition-transform ${selected ? `${styles.text} translate-x-0.5` : "text-nexus-muted"}`}
        />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-nexus-text">{category.label}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-nexus-muted">
        <span>{category.topics.length} modules</span>
        <span aria-hidden>·</span>
        <span className={category.lessonsCompleted === category.lessonsTotal ? "text-nexus-good" : undefined}>
          {category.lessonsCompleted}/{category.lessonsTotal} lessons done
        </span>
      </div>
    </button>
  );
}

// ---- Motivational side card — "what's next", always derived from real data ----
function MotivationalCard({ upNext }: { upNext: ComputedTopic | null }) {
  if (!upNext) {
    return (
      <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-nexus-good/30 bg-nexus-good/5 p-4 space-y-2">
        <p className="text-sm font-semibold text-nexus-good flex items-center gap-1.5">
          <CheckCircle2 size={15} /> All caught up!
        </p>
        <p className="text-xs text-nexus-muted leading-relaxed">
          You've completed every trackable NLP lesson in this map. Head to the NLP Playground to keep
          practicing.
        </p>
        <Link
          to="/playground"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nexus-good hover:text-nexus-good/80"
        >
          Open NLP Playground <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
      <p className="text-sm font-semibold text-nexus-text flex items-center gap-1.5">
        <Sparkles size={15} className="text-nexus-accent" /> Keep going!
      </p>
      <p className="text-xs text-nexus-muted leading-relaxed">
        You're making great progress in NLP.
        <br />
        Next up: <span className="text-nexus-text font-medium">{upNext.label}</span>!
      </p>
      <Link
        to={topicHref(upNext)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-nexus-accent hover:text-nexus-data"
      >
        Continue Learning <ArrowRight size={12} />
      </Link>
    </div>
  );
}

// ---- Loading skeleton (summary not fetched yet) ----
function MapSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your NLP progress">
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 min-w-[11rem] h-20 rounded-2xl border border-nexus-border bg-nexus-surfaceAlt/60 animate-pulse"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-64 h-32 rounded-2xl border border-nexus-border bg-nexus-surfaceAlt/60 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeMap() {
  const summary = useProgressStore((s) => s.summary);
  const loading = useProgressStore((s) => s.loading);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(KNOWLEDGE_MAP[0].id);

  const completedIds = useMemo(() => new Set(summary?.completed_module_ids?.nlp ?? []), [summary]);
  const { categories, upNext } = useMemo(() => computeKnowledgeMapState(completedIds), [completedIds]);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0];

  if (loading && !summary) {
    return <MapSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* 1 — header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-nexus-accent/10 p-2.5 shrink-0">
            <Brain size={20} className="text-nexus-accent" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-nexus-text">NLP Knowledge Map</h2>
            <p className="text-xs text-nexus-muted mt-0.5 max-w-md">
              Explore the complete NLP learning path. Click on any topic to dive in and start learning.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt/60 px-4 py-2.5 text-right shrink-0">
          <p className="text-xs font-medium text-nexus-text">Your NLP Journey</p>
          <p className="text-[10px] text-nexus-muted tracking-wide uppercase mt-0.5">Learn • Practice • Master</p>
          {summary && (
            <p className="text-xs font-mono font-semibold text-nexus-accent mt-1">
              {summary.nlp_progress.completed}/{summary.nlp_progress.total} lessons · {summary.nlp_progress.percentage}%
            </p>
          )}
        </div>
      </div>

      {/* 2 — category navigation */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            category={category}
            selected={category.id === selectedCategoryId}
            onSelect={() => setSelectedCategoryId(category.id)}
          />
        ))}
      </div>

      {/* 3/4/5/8 — selected category + connected learning path, with smooth transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-3">
            <h3 className="text-base font-semibold text-nexus-text">{selectedCategory.label}</h3>
            <p className="text-xs text-nexus-muted mt-0.5">{selectedCategory.subtitle}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <LearningPath category={selectedCategory} />
            <MotivationalCard upNext={upNext} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 11 — pro tip ribbon */}
      <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt/50 px-4 py-2.5 flex items-center gap-2 text-xs text-nexus-muted">
        <span aria-hidden>💡</span>
        <span>
          <span className="text-nexus-text font-medium">Pro tip:</span> each module builds on the previous
          one. Complete them in order for the best learning experience!
        </span>
      </div>
    </div>
  );
}
