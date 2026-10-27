import { useState } from "react";
import { motion } from "framer-motion";

import { RELATION_OPTIONS, RELATION_QUESTIONS } from "../data/relationQuestions";

export default function RelationQuiz() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = RELATION_QUESTIONS.every((q) => answers[q.id]);
  const score = submitted
    ? RELATION_QUESTIONS.filter((q) => answers[q.id] === q.answer).length
    : 0;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-nexus-muted">
        Classify each word pair according to the semantic relationship
        between them (read as "A → B").
      </p>

      <div className="space-y-3">
        {RELATION_QUESTIONS.map((q, i) => {
          const userAnswer = answers[q.id];
          const isCorrect = submitted && userAnswer === q.answer;
          const isWrong = submitted && userAnswer && userAnswer !== q.answer;
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-4 ${
                submitted
                  ? isCorrect
                    ? "border-nexus-good/40 bg-nexus-good/5"
                    : "border-nexus-bad/40 bg-nexus-bad/5"
                  : "border-nexus-border bg-nexus-surface"
              }`}
            >
              <p className="text-xs text-nexus-muted mb-1">Question {i + 1}</p>
              <p className="text-sm font-medium mb-2 font-mono">
                {q.pairA} – {q.pairB}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RELATION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={`text-xs rounded-md border px-2.5 py-1 transition-colors disabled:cursor-default ${
                      userAnswer === opt
                        ? "border-nexus-accent bg-nexus-accent/15 text-nexus-text"
                        : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {isWrong && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-nexus-muted mt-2"
                >
                  Correct answer: <span className="text-nexus-good">{q.answer}</span>. {q.explanation}
                </motion.p>
              )}
              {isCorrect && (
                <p className="text-xs text-nexus-good mt-2">Correct — {q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className="rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Submit
          </button>
        ) : (
          <>
            <div className="text-sm font-medium">
              Score: <span className="text-nexus-good">{score}</span> / {RELATION_QUESTIONS.length}{" "}
              <span className="text-nexus-muted">
                ({Math.round((score / RELATION_QUESTIONS.length) * 100)}% accuracy)
              </span>
            </div>
            <button
              onClick={reset}
              className="rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted hover:text-nexus-text"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
