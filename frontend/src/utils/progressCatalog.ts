// Mirrors backend/app/algorithms/progress_catalog.py exactly — the same
// finite, real checklist both sides use to compute "X / Y lessons"
// percentages. Keep these two lists in sync if a page is added or removed;
// nothing auto-generates one from the other since they live in separate
// apps, but every module_id here is checked server-side (the backend
// rejects a module_id it doesn't recognize), so a typo here fails loudly
// rather than silently inflating a student's progress.
import type { Domain } from "../services/api";

export interface TrackableLesson {
  moduleId: string;
  label: string;
}

export const NLP_TRACKABLE_LESSONS: TrackableLesson[] = [
  { moduleId: "nlp-foundations", label: "NLP Foundations" },
  { moduleId: "nlp-learning-hub", label: "NLP Learning Hub" },
  { moduleId: "preprocessing", label: "Text Processing" },
  { moduleId: "pos-tagging", label: "POS Tagging Lab" },
  { moduleId: "language-modeling", label: "Language Modeling" },
  { moduleId: "parsing", label: "Parsing Lab" },
  { moduleId: "semantics", label: "Semantic Lab" },
  { moduleId: "discourse", label: "Discourse Lab" },
  { moduleId: "nlp-applications", label: "Real-World NLP" },
  { moduleId: "nlp-playground", label: "NLP Playground" },
];

export const DL_TRACKABLE_LESSONS: TrackableLesson[] = [
  { moduleId: "dl-foundations", label: "DL Foundations" },
  { moduleId: "dl-module-1", label: "Module 1 — Foundations" },
  { moduleId: "dl-module-2", label: "Module 2 — Backpropagation" },
  { moduleId: "dl-module-3", label: "Module 3 — Autoencoders" },
  { moduleId: "neural-networks", label: "Neural Networks" },
  { moduleId: "cnn-lab", label: "CNN Lab" },
  { moduleId: "rnn-lstm-lab", label: "RNN & LSTM Lab" },
  { moduleId: "attention-transformers", label: "Attention & Transformers" },
  { moduleId: "dl-applications", label: "Deep Learning Applications" },
];

export const CATALOG_BY_DOMAIN: Record<Domain, TrackableLesson[]> = {
  nlp: NLP_TRACKABLE_LESSONS,
  dl: DL_TRACKABLE_LESSONS,
};
