import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const COMMON_ERRORS: { title: string; detail: string }[] = [
  {
    title: "SyntaxError",
    detail: "Your code isn't valid Python -- often a missing colon, an unmatched bracket, or bad indentation. The editor highlights the exact line.",
  },
  {
    title: "ImportError",
    detail: 'Only a small set of modules can be imported here: re, json, collections, math, string, itertools, statistics. Anything else (os, sys, requests, ...) is blocked on purpose -- see "Execution & security" below.',
  },
  {
    title: "NameError",
    detail: 'A variable or function isn\'t defined. You always have `text` (the input string) and `nlp()` (the real NER call) available -- everything else you have to define yourself.',
  },
  {
    title: "AttributeError on an entity",
    detail: "An entity object only has .text, .label_, .start_char, and .end_char -- the same small surface spaCy's own Span exposes for this use case.",
  },
  {
    title: "Timed out",
    detail: "Your code ran for more than 8 seconds -- almost always an infinite loop (check a `while` condition that never becomes false).",
  },
  {
    title: "Memory limit hit",
    detail: "Your code allocated more than 256MB -- usually an unbounded list/string built inside a loop.",
  },
];

export default function NerPlaygroundHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs text-nexus-muted hover:text-nexus-text transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <HelpCircle size={13} /> Common errors &amp; what they mean
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-nexus-border pt-3">
          {COMMON_ERRORS.map((e) => (
            <div key={e.title} className="text-xs">
              <p className="font-semibold text-nexus-text">{e.title}</p>
              <p className="text-nexus-muted mt-0.5">{e.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
