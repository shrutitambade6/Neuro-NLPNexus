import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";

import BirthdayBanner from "../components/birthday/BirthdayBanner";
import DomainChoiceCards from "../components/DomainChoiceCards";
import KnowledgeMap from "../components/KnowledgeMap";
import LabCard from "../components/LabCard";
import StatCard from "../components/StatCard";
import NexiMascot, { type NexiMood } from "../components/nexi/NexiMascot";
import { useAuthStore } from "../store/authStore";
import { useDomainStore } from "../store/domainStore";
import { useProgressStore } from "../store/progressStore";
import { NAV_ITEMS } from "../utils/navigation";

// NEXI's dashboard companion — spec's "if progress is low, don't shame the
// user; point toward the next lesson instead." The NLP branch uses the real
// lesson-completion percentage from /api/progress/my-summary (via
// progressStore); the DL branch (no Deep Learning Challenges feature anymore
// — removed 2026-10-06) falls through to the generic "try the next lab"
// message below, same as a signed-in user with no domain-specific signal.
function ProgressCompanion({
  domain,
  token,
  nlpLessonPct,
  suggestedLabel,
  suggestedPath,
}: {
  domain: "nlp" | "dl";
  token: string | null;
  nlpLessonPct: number | null;
  suggestedLabel: string;
  suggestedPath: string;
}) {
  let mood: NexiMood = "welcome";
  let message = "Ready for one more concept?";
  let cta = { label: `Try ${suggestedLabel}`, path: suggestedPath };

  if (!token) {
    mood = "waving";
    message = `Sign in to start tracking your real ${domain === "nlp" ? "NLP" : "Deep Learning"} progress.`;
    cta = { label: "Sign in", path: "/login" };
  } else if (domain === "nlp") {
    const pct = nlpLessonPct ?? 0;
    if (pct === 0) {
      mood = "challenge";
      message = "Ready to mark your first NLP lesson complete?";
    } else if (pct < 100) {
      mood = "idea";
      message = `You've completed ${pct}% of the real, trackable NLP lessons!`;
    } else {
      mood = "success";
      message = "Every trackable NLP lesson is marked complete!";
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
      <NexiMascot mood={mood} size="lg" />
      <div className="flex-1">
        <p className="text-sm font-medium text-nexus-text">{message}</p>
      </div>
      <Link
        to={cta.path}
        className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors shrink-0 whitespace-nowrap"
      >
        {cta.label} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

const NLP_LAB_DESCRIPTIONS: Record<string, string> = {
  "NLP Learning Hub": "A map of every NLP concept in this app — which are real interactive labs, which are conceptual-only, and which aren't built yet.",
  "Parsing Lab": "Build CYK charts and watch constituency parse trees come together step by step.",
  "POS Tagging Lab": "Watch a real Hidden Markov Model and the Viterbi algorithm tag a sentence, matrix by matrix.",
  "Semantic Lab": "Compare Jaccard and cosine similarity, run WSD, and explore WordNet relations.",
  "Text Processing": "See whitespace, rule-based, regex, and sentence tokenization side by side.",
  "Language Modeling": "Build real n-gram counts, score sentence probability step by step, and calculate perplexity.",
  "Discourse Lab": "Resolve pronouns to their antecedents with real NP chunking and agreement constraints.",
  "NLP Playground": "Chain real preprocessing stages together and see how they change similarity scores.",
};

const DL_LAB_DESCRIPTIONS: Record<string, string> = {
  "DL Foundations": "A single artificial neuron's real arithmetic: forward pass, loss, gradient, and gradient descent.",
  "Module 1 — Foundations": "Your own syllabus, rebuilt: M-P neurons, thresholding logic, the Perceptron and PLA, MLPs, and Sigmoid neurons.",
  "Module 2 — Backpropagation": "Your syllabus's own 5-node backprop worked example and email-classification forward pass, both real calculators.",
  "Module 3 — Autoencoders": "Your syllabus's autoencoder, sparsity, L2, and dropout calculators — including your document's own exam questions.",
  "Neural Networks": "Design a real multi-layer network and watch an animated, genuine forward pass.",
  "CNN Lab": "Real convolution, activation, pooling, and a dense+softmax classification head on an editable grid.",
  "RNN & LSTM Lab": "A real recurrent forward pass, including all four LSTM gates, over an editable sequence.",
  "Attention & Transformers": "Real scaled dot-product attention over an editable token sequence.",
};

export default function Dashboard() {
  const domain = useDomainStore((s) => s.domain);
  const token = useAuthStore((s) => s.token);
  const summary = useProgressStore((s) => s.summary);

  const descriptions = domain === "nlp" ? NLP_LAB_DESCRIPTIONS : DL_LAB_DESCRIPTIONS;
  const labCards = NAV_ITEMS.filter((item) => item.label in descriptions);
  const suggested = labCards[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-nexus-muted text-sm mt-1">
          {domain === "nlp"
            ? "Text Processing, POS Tagging Lab, Parsing Lab, Semantic Lab, Language Modeling, Discourse Lab, and the NLP Playground run against the real backend today. The NLP Learning Hub indexes all of them. Everything else in the drawer is honestly labeled as not built yet."
            : "DL Foundations, Modules 1-3 (rebuilt from your own uploaded course PDFs), Neural Networks, CNN Lab, RNN & LSTM Lab, and Attention & Transformers all run real computations against the real backend."}
        </p>
      </div>

      {/* Sole domain selector inside the Dashboard content area. A second,
          smaller NLP/Deep Learning toggle used to sit directly under the
          heading above (a duplicate of TopBar.tsx's DomainSwitcher, which
          stays as the one global switcher in the top navigation) — removed
          so DomainChoiceCards is unambiguously the one place to choose a
          domain on this page. */}
      <DomainChoiceCards />

      {/* Birthday Experience milestone, point 9 — renders nothing at all
          unless it's genuinely the signed-in student's birthday today
          (backend-computed, see useBirthday()). */}
      <BirthdayBanner />

      {suggested && (
        <ProgressCompanion
          domain={domain}
          token={token}
          nlpLessonPct={summary?.nlp_progress.percentage ?? null}
          suggestedLabel={suggested.label}
          suggestedPath={suggested.path}
        />
      )}

      {/* Redesign Stage 1: the learning canvas (Laboratories) now comes
          right after the companion nudge, so it's the first substantial
          thing a student sees — detailed navigation moved into the drawer
          (see Sidebar.tsx / TopBar's menu button). */}
      <div>
        <h2 className="font-semibold mb-3">Laboratories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {labCards.map((item) => (
            <LabCard
              key={item.path}
              label={item.label}
              path={item.path}
              icon={item.icon}
              ready={item.status === "ready"}
              description={descriptions[item.label]}
            />
          ))}
        </div>
      </div>

      {/* "Remove the Progress button from the UI" pass: a compact progress
          strip (NLP/DL percentages, Completed Tasks, Badges, and a "Full
          progress breakdown" button opening the now-removed ProgressModal)
          used to render here. It's been removed per that request. The real
          NLP/DL progress summary it showed is still available — unchanged,
          same backend data — on the Profile page and the dedicated
          /progress page (reachable from the learning drawer). This block used
          to also show a Deep Learning Challenges stat row (Challenges solved /
          XP earned); that feature was removed 2026-10-06, so only the DL
          concepts count remains here. */}
      {domain === "dl" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="DL concepts" value={8} icon={Layers} hint="Neuron through Transformer — in the DL glossary" />
        </div>
      )}

      {domain === "nlp" && (
        // Redesigned Knowledge Map (interactive roadmap, see
        // components/KnowledgeMap.tsx) now renders its own header — icon,
        // title, subtitle, and the real-progress "Your NLP Journey" status
        // card — so this wrapper no longer duplicates a plain h2 above it.
        // Still the same rounded-surface panel treatment as every other
        // Dashboard section.
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <KnowledgeMap />
        </div>
      )}
    </div>
  );
}
