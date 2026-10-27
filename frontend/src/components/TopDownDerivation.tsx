import { motion } from "framer-motion";

import type { DerivationStepOut } from "../services/api";

interface Props {
  startSymbol: string;
  steps: DerivationStepOut[];
  revealedSteps: number; // how many of `steps` have been applied so far
}

// Replays the real derivation steps the backend returned (see
// app.algorithms.top_down_parse) to reconstruct the actual sentential form
// at any point — "S", then "NP VP", then "Det N VP", etc. — rather than
// animating a scripted example. Each step names which symbol it expands and
// the exact rule used (e.g. "NP -> Det N"), so the leftmost matching symbol
// in the current form is the one that step actually rewrote.
function sententialFormAfter(startSymbol: string, steps: DerivationStepOut[], count: number): string[] {
  let form = [startSymbol];
  for (let i = 0; i < count && i < steps.length; i++) {
    const step = steps[i];
    const idx = form.indexOf(step.symbol);
    if (idx === -1) continue; // shouldn't happen for a well-formed step list
    const [, rhs] = step.rule.split(" -> ");
    const replacement = rhs.startsWith("'") ? [rhs.slice(1, -1)] : rhs.split(" ");
    form = [...form.slice(0, idx), ...replacement, ...form.slice(idx + 1)];
  }
  return form;
}

export default function TopDownDerivation({ startSymbol, steps, revealedSteps }: Props) {
  const form = sententialFormAfter(startSymbol, steps, revealedSteps);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-nexus-muted mb-1.5">Current sentential form</p>
        <motion.div
          key={form.join(" ")}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-1.5 rounded-lg border border-nexus-purple/40 bg-nexus-purple/10 px-3 py-2 font-mono text-sm"
        >
          {form.map((sym, i) => (
            <span key={i} className="text-nexus-text">
              {sym}
            </span>
          ))}
        </motion.div>
      </div>

      <div>
        <p className="text-[11px] text-nexus-muted mb-1.5">Derivation steps (root → leaves)</p>
        <ol className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {steps.slice(0, revealedSteps).map((step) => (
            <motion.li
              key={step.step}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs font-mono text-nexus-muted rounded-md bg-nexus-surfaceAlt px-2 py-1"
            >
              <span className="text-nexus-purple shrink-0">#{step.step}</span>
              <span className="text-nexus-text">{step.rule}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
