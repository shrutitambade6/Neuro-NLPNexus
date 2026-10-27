// A small, honest heuristic for "what does this line do" -- used when the
// user clicks a line in the code editor. This is pattern-matching on the
// line's own text, not a real tracing/AST analysis, and it only ever
// describes genuinely identifiable NER-lab constructs (the nlp() call,
// the entity loop, a print, a filter, a dict-count, an import, a
// variable assignment). Anything else gets an honest, generic fallback
// rather than a made-up explanation.
export function describeLine(lineText: string): string {
  const t = lineText.trim();
  if (!t) return "Empty line.";
  if (t.startsWith("#")) return "A comment -- ignored when the code runs.";
  if (/\bnlp\s*\(/.test(t)) {
    return "Model inference call -- runs the real NER engine against `text` and returns a doc with `.ents`.";
  }
  if (/^for\s+\w+\s+in\s+doc\.ents\s*:/.test(t)) {
    return "Entity iteration -- loops over every entity the model actually detected, one at a time.";
  }
  if (/^(import|from)\s/.test(t)) {
    return "An import -- only a small allow-listed set of modules (re, json, collections, math, string, itertools, statistics) can be imported inside the sandbox.";
  }
  if (/^print\s*\(/.test(t)) {
    return "Console output -- whatever this prints appears in the Console tab, exactly as printed.";
  }
  if (/^if\b/.test(t)) {
    return "A condition -- controls whether the code inside it runs, e.g. filtering entities by category.";
  }
  if (/\.get\(/.test(t) && /=/.test(t)) {
    return "A running count -- a common pattern for tallying occurrences into a dictionary.";
  }
  if (/^\w+\s*=\s*\{\s*\}$/.test(t) || /^\w+\s*=\s*\[\s*\]$/.test(t)) {
    return "Initializes an empty collection to fill in during the loop below.";
  }
  if (/^\w+\.append\(/.test(t)) {
    return "Adds one item to a list -- commonly used to build up a list of entity records.";
  }
  if (/json\.dumps/.test(t)) {
    return "Serializes a Python value into a JSON string.";
  }
  if (/^\w+\s*=/.test(t)) {
    return "A variable assignment.";
  }
  return "A Python statement.";
}
