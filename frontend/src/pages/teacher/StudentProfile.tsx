import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle2, Circle, Clock, IdCard, Loader2, User } from "lucide-react";

import StatCard from "../../components/StatCard";
import { fetchAdminStudentDetail, type ProgressEntry, type StudentDetailResponse } from "../../services/api";
import { CATALOG_BY_DOMAIN } from "../../utils/progressCatalog";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import { nexusVar } from "../../utils/theme";

type LessonState = "completed" | "in_progress" | "not_started";

function lessonState(entries: ProgressEntry[], moduleId: string): { state: LessonState; entry?: ProgressEntry } {
  const matches = entries.filter((e) => e.module_id === moduleId);
  const completed = matches.find((e) => e.status === "completed");
  if (completed) return { state: "completed", entry: completed };
  const inProgress = matches.find((e) => e.status === "in_progress");
  if (inProgress) return { state: "in_progress", entry: inProgress };
  return { state: "not_started" };
}

function ModuleChecklist({ entries, domain, colorToken }: { entries: ProgressEntry[]; domain: "nlp" | "dl"; colorToken: "purple" | "gold" }) {
  const lessons = CATALOG_BY_DOMAIN[domain];
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: nexusVar(colorToken, 0.3), background: nexusVar(colorToken, 0.05) }}>
      <p className="text-xs font-medium mb-2" style={{ color: nexusVar(colorToken) }}>
        {domain.toUpperCase()} — module by module
      </p>
      <ul className="space-y-1.5">
        {lessons.map((lesson) => {
          const { state, entry } = lessonState(entries, lesson.moduleId);
          return (
            <li key={lesson.moduleId} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-nexus-text">
                {state === "completed" && <CheckCircle2 size={13} className="text-nexus-good shrink-0" />}
                {state === "in_progress" && <Clock size={13} className="text-nexus-warn shrink-0" />}
                {state === "not_started" && <Circle size={13} className="text-nexus-muted/40 shrink-0" />}
                {lesson.label}
              </span>
              <span className="text-nexus-muted shrink-0">
                {state === "completed" ? formatDate(entry?.completed_at) : state === "in_progress" ? "In progress" : "Not started"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function StudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const [detail, setDetail] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setLoading(true);
    fetchAdminStudentDetail(Number(studentId))
      .then((d) => active && setDetail(d))
      .catch(() => active && setError("Couldn't load this student — they may not exist, or the backend is unreachable."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Loading student profile…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error ?? "Student not found."}
      </div>
    );
  }

  const { student } = detail;
  // Chronological timeline, oldest first — the backend returns
  // activity_history newest-first (for the preview use elsewhere), so this
  // page reverses it to read top-to-bottom as a story of what happened.
  const timeline = [...detail.activity_history].reverse();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-xs text-nexus-muted hover:text-nexus-text">
        <ArrowLeft size={13} /> Back to All Students
      </Link>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-nexus-accent/15 p-3 shrink-0">
            <User size={22} className="text-nexus-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold">{student.username}</h1>
            {/* Username/Password Authentication milestone (2026-10-07) --
                most students now have no email on file; show full name
                instead when there's one. */}
            {student.full_name && (
              <div className="flex items-center gap-1.5 text-sm text-nexus-muted mt-0.5">
                <IdCard size={13} /> {student.full_name}
              </div>
            )}
            <p className="text-[11px] text-nexus-muted/80 mt-1.5">
              Joined {formatDate(student.created_at)} · Last active {formatDate(student.last_activity_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="NLP progress" value={`${student.nlp_progress.percentage}%`} icon={CheckCircle2} hint={`${student.nlp_progress.completed}/${student.nlp_progress.total} lessons`} />
        <StatCard label="DL progress" value={`${student.dl_progress.percentage}%`} icon={CheckCircle2} hint={`${student.dl_progress.completed}/${student.dl_progress.total} lessons`} />
        <StatCard label="Quiz average" value={student.average_quiz_score != null ? `${student.average_quiz_score}%` : "—"} icon={Award} hint={`${student.quiz_attempts} attempt${student.quiz_attempts === 1 ? "" : "s"}`} />
        <StatCard label="Badges earned" value={student.badges_earned} icon={Award} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ModuleChecklist entries={detail.nlp_entries} domain="nlp" colorToken="purple" />
        <ModuleChecklist entries={detail.dl_entries} domain="dl" colorToken="gold" />
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <p className="text-xs font-medium text-nexus-muted mb-2">Quiz results ({detail.quiz_results.length})</p>
        {detail.quiz_results.length === 0 ? (
          <p className="text-xs text-nexus-muted">No quiz attempts yet.</p>
        ) : (
          <div className="space-y-1">
            {detail.quiz_results.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-xs text-nexus-muted border-b border-nexus-border/50 py-1 last:border-0">
                <span>
                  {q.quiz_id} <span className="opacity-60">({q.domain.toUpperCase()})</span>
                </span>
                <span className="font-mono text-nexus-text">{q.score}% ({q.correct_answers}/{q.total_questions}) · {formatDate(q.attempted_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <p className="text-xs font-medium text-nexus-muted mb-2">Badges ({detail.badges.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {detail.badges.map((b) => (
            <span key={b.key} title={b.description} className="inline-flex items-center gap-1 rounded-full border border-nexus-good/40 bg-nexus-good/10 px-2 py-0.5 text-[11px] text-nexus-good">
              <Award size={11} /> {b.label}
            </span>
          ))}
          {detail.badges.length === 0 && <p className="text-xs text-nexus-muted">No badges earned yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <p className="text-xs font-medium text-nexus-muted mb-3">Activity timeline</p>
        {timeline.length === 0 ? (
          <p className="text-xs text-nexus-muted">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-nexus-border ml-1.5 space-y-3">
            {timeline.map((a, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-nexus-accent" />
                <p className="text-xs text-nexus-text">{a.detail ?? a.activity_type}</p>
                <p className="text-[11px] text-nexus-muted font-mono">{formatDateTime(a.timestamp)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
