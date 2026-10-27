import type { LucideIcon } from "lucide-react";
import { Award, Compass, Cpu, Flame, Footprints, GraduationCap, Star, Target } from "lucide-react";

// Mirrors backend/app/algorithms/badges.py's compute_badges() exactly — the
// same fixed, real set of 8 possible badges both sides know about. The
// backend's /api/progress/my-summary response only ever returns the
// badges a student has ALREADY earned (see MySummary.badges); there is no
// endpoint that lists "every badge that could ever exist," because
// badges.py deliberately isn't a database table (see its own docstring).
// This file is what lets the Progress UI show LOCKED badge slots too
// (spec requirement: unearned badges appear locked with a real, specific
// explanation of how to unlock them) without inventing badges that don't
// exist — every key/label/description below must match badges.py
// character-for-character, so "how to unlock" text is never a guess.
export interface BadgeCatalogEntry {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: "good" | "purple" | "gold" | "data" | "accent" | "coral";
}

export const BADGE_CATALOG: BadgeCatalogEntry[] = [
  {
    key: "first_steps",
    label: "First Steps",
    description: "Completed your first lesson or lab.",
    icon: Footprints,
    accent: "good",
  },
  {
    key: "nlp_explorer",
    label: "NLP Explorer",
    description: "Completed 5 or more NLP lessons/labs.",
    icon: Compass,
    accent: "purple",
  },
  {
    key: "dl_explorer",
    label: "DL Explorer",
    description: "Completed 5 or more Deep Learning lessons/labs.",
    icon: Cpu,
    accent: "gold",
  },
  {
    key: "nlp_complete",
    label: "NLP Graduate",
    description: "Completed every NLP lesson and lab.",
    icon: GraduationCap,
    accent: "purple",
  },
  {
    key: "dl_complete",
    label: "DL Graduate",
    description: "Completed every Deep Learning lesson and lab.",
    icon: Award,
    accent: "gold",
  },
  {
    key: "quiz_taker",
    label: "Quiz Taker",
    description: "Attempted your first quiz.",
    icon: Target,
    accent: "data",
  },
  {
    key: "quiz_ace",
    label: "Quiz Ace",
    description: "Scored a perfect 100% on a quiz.",
    icon: Star,
    accent: "accent",
  },
  {
    key: "dedicated_learner",
    label: "Dedicated Learner",
    description: "Completed 10 or more lessons and labs.",
    icon: Flame,
    accent: "coral",
  },
];
