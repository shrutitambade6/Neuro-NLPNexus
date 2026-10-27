import { Navigate, useSearchParams } from "react-router-dom";

import InteractiveBook from "../../components/book/InteractiveBook";
import { NLP_BOOK } from "../../utils/bookCatalog";

// Thin wrapper (point 24): all of this page's behavior lives in the
// reusable <InteractiveBook /> engine — this file only supplies the NLP
// configuration. Minimal surrounding UI on purpose (point 22): the book
// itself is the hero, not another dashboard panel.
//
// ?chapter=<id> is the "Read this concept" deep-link contract (point 8):
// a lab page links to /resources/nlp-book?chapter=pos-tagging and the
// book opens straight to that exact chapter, never a random page. A deep
// link like that skips the shelf entirely (motion-first pass, 2026-10-06)
// — a student following "Read this concept" wants the exact page, not a
// library browsing ceremony first. This contract is completely
// unaffected by the combined-library change below.
//
// Arriving here directly with no ?chapter= (the old sidebar-driven
// path) used to render this book's own single-book shelf. User
// request, 2026-10-07: replace the two separate per-book shelves with
// one combined shelf holding both books -- so that no-chapter case now
// redirects to /resources/library (components/library/CombinedBookshelf)
// instead. This route itself is kept (not removed) purely so the
// ?chapter= deep links above keep working unchanged.
export default function NlpBook() {
  const [searchParams] = useSearchParams();
  const chapter = searchParams.get("chapter") ?? undefined;

  if (chapter) {
    return (
      <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-2 py-6">
        <InteractiveBook theme={NLP_BOOK} initialChapterId={chapter} />
      </div>
    );
  }

  return <Navigate to="/resources/library" replace />;
}
