import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import { recordQuizResult, type Domain } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useProgressStore } from "../../store/progressStore";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// A self-contained MCQ quiz component shared by the Module 1/2/3 DL
// curriculum pages. Every question here is written from the uploaded
// syllabus PDFs' own content (see each page's questions array) — this
// component itself holds no subject-matter content, only the interaction.
//
// `domain`/`quizId` are optional so this stays a drop-in component even
// on a page that hasn't been wired into progress tracking: when provided,
// finishing every question fires exactly one real POST to
// /api/progress/quiz-result (signed-in students only) — never a fabricated
// score, since it's computed from the same `answers` state rendered below.
export default function ModuleQuiz({
  questions,
  domain,
  quizId,
}: {
  questions: QuizQuestion[];
  domain?: Domain;
  quizId?: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const token = useAuthStore((s) => s.token);
  const refreshProgress = useProgressStore((s) => s.refresh);
  const recordedRef = useRef(false);

  const score = Object.entries(answers).filter(([qIdx, aIdx]) => questions[Number(qIdx)].correctIndex === aIdx).length;
  const allAnswered = Object.keys(answers).length === questions.length && questions.length > 0;

  useEffect(() => {
    if (!allAnswered || recordedRef.current || !domain || !quizId || !token) return;
    recordedRef.current = true;
    recordQuizResult(domain, quizId, questions.length, score)
      .then(() => refreshProgress())
      .catch(() => {
        recordedRef.current = false; // allow a retry if the backend was briefly unreachable
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered]);

  return (
    <div className="space-y-4">
      {Object.keys(answers).length > 0 && (
        <p className="text-sm text-nexus-muted">
          Score: <span className="font-mono text-nexus-text font-semibold">{score}</span> / {Object.keys(answers).length} answered
          {allAnswered && domain && quizId && !token && (
            <span className="ml-2 text-nexus-warn">(sign in to save this result)</span>
          )}
        </p>
      )}
      {questions.map((q, qIdx) => {
        const picked = answers[qIdx];
        const answered = picked !== undefined;
        return (
          <div key={qIdx} className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2.5">
            <p className="text-sm font-medium">{qIdx + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oIdx) => {
                const isCorrect = oIdx === q.correctIndex;
                const isPicked = oIdx === picked;
                let cls = "border-nexus-border text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/50";
                if (answered && isCorrect) cls = "border-nexus-good bg-nexus-good/10 text-nexus-good";
                else if (answered && isPicked && !isCorrect) cls = "border-nexus-bad bg-nexus-bad/10 text-nexus-bad";
                return (
                  <button
                    key={oIdx}
                    disabled={answered}
                    onClick={() => setAnswers((a) => ({ ...a, [qIdx]: oIdx }))}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${cls}`}
                  >
                    <span>{opt}</span>
                    {answered && isCorrect && <Check size={14} />}
                    {answered && isPicked && !isCorrect && <X size={14} />}
                  </button>
                );
              })}
            </div>
            {answered && <p className="text-xs text-nexus-muted pt-1 border-t border-nexus-border/60">{q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
