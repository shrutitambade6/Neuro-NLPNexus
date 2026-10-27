import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  book: "nlp" | "dl";
  chapterId: string;
  label?: string;
}

// The subtle "📖 Read this concept" / "Read in NLP Book" / "Read in DL
// Book" deep-link button (spec point 8): every lab page that keeps an
// interactive tool and trims its theory block (point 6/20) gets one of
// these next to the tool, linking straight to the exact chapter it moved
// to — never the book's title page. One small reusable component instead
// of hand-styling this link on every page it appears on.
export default function ReadInBookLink({ book, chapterId, label }: Props) {
  const bookPath = book === "nlp" ? "/resources/nlp-book" : "/resources/dl-book";
  const bookName = book === "nlp" ? "NLP Book" : "DL Book";
  return (
    <Link
      to={`${bookPath}?chapter=${chapterId}`}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-nexus-accent hover:underline"
    >
      <BookOpen size={13} />
      {label ?? `Read in ${bookName}`}
    </Link>
  );
}
