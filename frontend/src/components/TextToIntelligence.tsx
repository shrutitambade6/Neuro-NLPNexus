import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";

import { tokenize } from "../services/api";
import { useThemeColors, withAlpha } from "../hooks/useThemeColors";
import { useDomainStore } from "../store/domainStore";
import NexiMascot, { type NexiMood } from "./nexi/NexiMascot";
import SuccessBurst from "./nexi/SuccessBurst";

interface Stage {
  id: string;
  label: string;
  ready: boolean;
  phase?: number;
  description: string;
}

// The NLP side: Text and Tokens are the only stages this widget actually
// computes (a real call to the tokenizer). Features/Semantics/Intent/Insight
// stay honestly locked — see the note under the tokenizer result below.
const NLP_STAGES: Stage[] = [
  { id: "text", label: "Text", ready: true, description: "Raw language input." },
  { id: "tokens", label: "Tokens", ready: true, description: "Text divided into smaller units." },
  { id: "features", label: "Features", ready: false, phase: 3, description: "Useful patterns extracted from text." },
  { id: "semantics", label: "Semantics", ready: false, phase: 6, description: "Understanding the meaning of language." },
  { id: "intent", label: "Intent", ready: false, phase: 9, description: "Identifying what the user wants." },
  { id: "insight", label: "Insight", ready: false, phase: 9, description: "Useful information generated from the analysis." },
];

// The Deep Learning side: this widget has no endpoint that runs arbitrary
// free text through a real embedding -> network -> prediction pass, so
// every stage here stays honestly marked "not ready" — it's a conceptual
// map of the DL pipeline, the same way Features/Semantics/Intent/Insight
// above are conceptual until their own phase lands. The REAL versions of
// these steps already exist and compute genuine results — just in their own
// labs (DL Foundations, Neural Network Playground), linked below.
const DL_STAGES: Stage[] = [
  { id: "input", label: "Input", ready: false, description: "The raw numbers a network receives." },
  { id: "embedding", label: "Embedding", ready: false, description: "Turns input into dense numeric vectors." },
  { id: "neural-net", label: "Neural Network", ready: false, description: "Layers of weighted connections transform it." },
  { id: "activation", label: "Activation", ready: false, description: "A non-linear function shapes each neuron's output." },
  { id: "prediction", label: "Prediction", ready: false, description: "The network's final output for this input." },
];

export default function TextToIntelligence() {
  // Framer Motion tweens these colors on every activeStage change, so it
  // needs real resolved literals (not CSS var() strings, which it can't
  // interpolate) — useThemeColors re-reads them whenever the theme flips.
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const domain = useDomainStore((s) => s.domain);
  const stages = domain === "nlp" ? NLP_STAGES : DL_STAGES;

  const [text, setText] = useState("I love learning Natural Language Processing.");
  const [activeStage, setActiveStage] = useState(0);
  const [tokens, setTokens] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // NEXI's mood follows the real pipeline lifecycle (spec's "look at the
  // text → inspect it → think → show result") rather than a separate fake
  // timeline — it just narrates the same `loading`/`activeStage`/`error`
  // states the widget already tracked before NEXI existed.
  const [mood, setMood] = useState<NexiMood>("welcome");
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

  // Idle demonstration: while nothing has been analyzed yet, a small dot
  // periodically travels from Text to Tokens — the only two stages that are
  // actually real — so the pipeline reads as "alive" without pretending any
  // of the locked stages compute something they don't. Off entirely under
  // reduced motion, and off once a real result is showing or DL mode (which
  // has no "idle real path" to demonstrate).
  const [idlePulse, setIdlePulse] = useState(0);
  useEffect(() => {
    if (reduceMotion || domain !== "nlp" || loading || tokens) return;
    const id = setInterval(() => setIdlePulse((n) => n + 1), 4200);
    return () => clearInterval(id);
  }, [reduceMotion, domain, loading, tokens]);

  const runPipeline = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setActiveStage(0);
    setMood("searching"); // 👀 looking at / inspecting the text
    try {
      await new Promise((r) => setTimeout(r, 250));
      setActiveStage(1);
      setMood("thinking"); // 🧠 thinking, while the real tokenize() call is in flight
      const data = await tokenize(text);
      setTokens(data.tokens.rule_based);
      setActiveStage(2);
      setMood("success"); // ✨ real result is in
      setCelebrate(true);
      celebrateTimer.current = setTimeout(() => {
        setCelebrate(false);
        setMood("welcome");
      }, 1500);
    } catch {
      setError("Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
      setActiveStage(0);
      setMood("mistake");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={domain}
          initial={reduceMotion ? false : { opacity: 0, x: domain === "nlp" ? -14 : 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: domain === "nlp" ? 14 : -14 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          {domain === "nlp" ? (
            <div className="flex items-center gap-3">
              <NexiMascot mood={mood} size="sm" className="shrink-0 hidden sm:inline-block" />
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-lg bg-nexus-surface border border-nexus-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                placeholder="Enter a sentence to analyze…"
              />
              <button
                onClick={runPipeline}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-nexus-accent to-nexus-data px-6 py-3 text-sm font-semibold text-nexus-onGradient hover:opacity-90 hover:shadow-glow disabled:opacity-50 whitespace-nowrap transition-shadow"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Analyzing…
                  </>
                ) : (
                  "Analyze language"
                )}
              </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-nexus-yellow/30 bg-nexus-yellow/5 px-4 py-3">
              <p className="text-xs text-nexus-muted">
                This is a conceptual map of the Deep Learning pipeline — the real, computed version of
                every stage below already exists, just in its own lab rather than run on arbitrary text here.
              </p>
              <Link
                to="/neural-networks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-nexus-yellow hover:text-nexus-gold whitespace-nowrap shrink-0"
              >
                Try it for real <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {error && <p className="text-sm text-nexus-bad">{error}</p>}

          <div className="flex flex-wrap items-stretch gap-2">
            {stages.map((stage, i) => {
              const isActive = domain === "nlp" && i <= activeStage && stage.ready;
              const isExpanded = expanded === stage.id;
              return (
                <div key={stage.id} className="flex items-center gap-2">
                  <div className="relative group">
                    <motion.button
                      type="button"
                      onClick={() => setExpanded((cur) => (cur === stage.id ? null : stage.id))}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      animate={{
                        borderColor: isActive ? colors.accent : isExpanded ? colors.accentDim : colors.border,
                        backgroundColor: isActive ? withAlpha(colors.accent, 0.12) : withAlpha(colors.surfaceAlt, 0.6),
                      }}
                      className="relative rounded-xl border px-4 py-3 min-w-[110px] text-center transition-shadow hover:shadow-md"
                    >
                      {!stage.ready && (
                        <Lock size={11} className="absolute top-2 right-2 text-nexus-muted" />
                      )}
                      <p className="text-xs font-medium">{stage.label}</p>
                      {!stage.ready && stage.phase && (
                        <p className="text-[10px] text-nexus-muted mt-0.5">Phase {stage.phase}</p>
                      )}
                    </motion.button>

                    {/* Hover tooltip — describes the stage regardless of
                        whether it's real yet, same wording used in the
                        click-to-expand panel below. */}
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-40 rounded-lg border border-nexus-border bg-nexus-surface px-2.5 py-2 text-[11px] text-nexus-muted opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 z-20"
                    >
                      {stage.description}
                    </span>
                  </div>

                  {i < stages.length - 1 && (
                    <span className="relative text-nexus-muted">
                      →
                      {!reduceMotion && domain === "nlp" && i === 0 && (
                        <motion.span
                          key={idlePulse}
                          initial={{ opacity: 0, left: "0%" }}
                          animate={{ opacity: [0, 1, 1, 0], left: "100%" }}
                          transition={{ duration: 1.1, ease: "easeInOut" }}
                          className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-nexus-data shadow-[0_0_6px_rgb(var(--nexus-data)/0.8)]"
                        />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Click-to-expand detail panel — real content for Tokens once a
              result exists, the same honest description everywhere else. */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                key={`expand-${expanded}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 text-sm">
                  <p className="font-display font-semibold text-nexus-text mb-1">
                    {stages.find((s) => s.id === expanded)?.label}
                  </p>
                  <p className="text-nexus-muted text-xs mb-2">
                    {stages.find((s) => s.id === expanded)?.description}
                  </p>
                  {expanded === "tokens" && tokens ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tokens.map((t, i) => (
                        <span
                          key={`${t}-${i}`}
                          className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    !stages.find((s) => s.id === expanded)?.ready && (
                      <p className="text-[11px] text-nexus-muted italic">
                        Not computed here yet — this is a conceptual preview of the stage, not a real result.
                      </p>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SuccessBurst active={celebrate} message="Real result in!" />

          {tokens && activeStage >= 2 && domain === "nlp" && (
            <motion.div
              key="tokens-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-4"
            >
              <p className="text-xs text-nexus-muted mb-2 flex items-center gap-1.5">
                <Check size={13} className="text-nexus-good shrink-0" />
                Real tokenizer output (rule-based) — this is the only stage actually computed right now.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tokens.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
