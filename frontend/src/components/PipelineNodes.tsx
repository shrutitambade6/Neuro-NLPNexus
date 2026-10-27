import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface PipelineStage {
  label: string;
  path: string;
  ready: boolean;
  phase: number;
}

const STAGES: PipelineStage[] = [
  { label: "Tokenizer", path: "/preprocessing", ready: true, phase: 1 },
  { label: "Morphology", path: "/preprocessing", ready: false, phase: 3 },
  { label: "Syntax", path: "/parsing", ready: false, phase: 5 },
  { label: "Semantics", path: "/semantics", ready: false, phase: 6 },
  { label: "Discourse", path: "/discourse", ready: false, phase: 7 },
  { label: "Application", path: "/applications", ready: false, phase: 9 },
];

export default function PipelineNodes() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt px-4 py-3 text-xs font-medium text-nexus-muted">
        Raw text
      </div>
      <span className="text-nexus-muted">→</span>
      {STAGES.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-2">
          <motion.button
            onClick={() => navigate(stage.path)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-xl border border-nexus-border bg-nexus-surface px-4 py-3 text-xs font-medium hover:border-nexus-accent transition-colors"
          >
            {!stage.ready && <Lock size={10} className="absolute top-1.5 right-1.5 text-nexus-muted" />}
            {stage.label}
          </motion.button>
          {i < STAGES.length - 1 && <span className="text-nexus-muted">→</span>}
        </div>
      ))}
    </div>
  );
}
