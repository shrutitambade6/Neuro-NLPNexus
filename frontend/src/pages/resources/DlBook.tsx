import { Navigate, useSearchParams } from "react-router-dom";

import InteractiveBook from "../../components/book/InteractiveBook";
import { DL_BOOK } from "../../utils/bookCatalog";

// Thin wrapper (point 24) — see NlpBook.tsx. Same engine, Deep Learning
// configuration, same ?chapter= deep-link contract and the same
// shelf-skip-on-deep-link rule from the motion-first pass (2026-10-06).
// Same 2026-10-07 combined-library redirect too: no ?chapter= now goes
// to /resources/library instead of this book's own standalone shelf --
// see NlpBook.tsx's comment for the full rationale.
export default function DlBook() {
  const [searchParams] = useSearchParams();
  const chapter = searchParams.get("chapter") ?? undefined;

  if (chapter) {
    return (
      <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-2 py-6">
        <InteractiveBook theme={DL_BOOK} initialChapterId={chapter} />
      </div>
    );
  }

  return <Navigate to="/resources/library" replace />;
}
