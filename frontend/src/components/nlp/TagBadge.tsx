import { motion } from "framer-motion";

import { FAMILY_CLASSES, familyOf } from "../../utils/posTags";

interface TagBadgeProps {
  tag: string;
  size?: "sm" | "md";
  animateIn?: boolean;
  delay?: number;
}

// A small colored pill showing a POS tag's exact text plus its family
// color as a secondary cue (never color alone — see posTags.ts). Reused
// for the tokens row, the final tagged sentence, and matrix row labels.
export default function TagBadge({ tag, size = "md", animateIn = false, delay = 0 }: TagBadgeProps) {
  const classes = FAMILY_CLASSES[familyOf(tag)];
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <motion.span
      initial={animateIn ? { opacity: 0, scale: 0.6, y: -6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay, type: "spring", stiffness: 300, damping: 20 }}
      className={`inline-flex items-center rounded-full border font-mono font-medium ${sizeClasses} ${classes.bgSoft} ${classes.border} ${classes.text}`}
    >
      {tag}
    </motion.span>
  );
}
