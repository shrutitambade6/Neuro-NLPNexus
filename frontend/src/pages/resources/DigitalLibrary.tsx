import CombinedBookshelf from "../../components/library/CombinedBookshelf";

// The one "Digital Library" sidebar entry (user request, 2026-10-07,
// replacing the previous separate "NLP Digital Book" / "Deep Learning
// Digital Book" entries). Thin wrapper, same convention as the old
// NlpBook.tsx/DlBook.tsx pages -- all the real behavior lives in
// CombinedBookshelf.
//
// Deliberately has no ?chapter= handling of its own: a "Read this
// concept" deep link elsewhere in the app still points at
// /resources/nlp-book?chapter=... or /resources/dl-book?chapter=...
// (unchanged), which still renders <InteractiveBook> directly, skipping
// any shelf. This page is reached only by arriving here directly -- the
// sidebar entry, or someone typing the URL -- so it always shows the
// shelf.
export default function DigitalLibrary() {
  return <CombinedBookshelf />;
}
