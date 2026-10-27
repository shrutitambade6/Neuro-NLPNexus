import { ArrowLeft, IdCard, Loader2, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AccountActionsPanel from "../../components/superadmin/AccountActionsPanel";
import StatusBadge from "../../components/superadmin/StatusBadge";
import { fetchSuperAdminStudentDetail, type SuperAdminStudentDetail } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

export default function StudentDetail() {
  const { studentId } = useParams();
  const id = Number(studentId);
  const [student, setStudent] = useState<SuperAdminStudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSuperAdminStudentDetail(id)
      .then(setStudent)
      .catch(() => setError("Couldn't load this student — they may no longer exist, or this account lacks access."));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!student) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/super-admin/students" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100">
        <ArrowLeft size={13} /> All students
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-semibold text-lg text-slate-100 flex items-center gap-2">
              {student.username}
              {student.is_online && (
                <span className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-normal">
                  <Wifi size={11} /> online
                </span>
              )}
            </h1>
            {/* Username/Password Authentication milestone (2026-10-07) --
                most accounts now have no email on file; show full name
                instead when there's one, and skip the line otherwise
                rather than render an icon next to nothing. */}
            {student.full_name && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <IdCard size={11} /> {student.full_name}
              </p>
            )}
          </div>
          <StatusBadge status={student.account_status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <p className="text-slate-500">Registered</p>
            <p className="text-slate-200">{formatDateTime(student.created_at)}</p>
          </div>
          <div>
            <p className="text-slate-500">Last login</p>
            <p className="text-slate-200">{formatDateTime(student.last_login)}</p>
          </div>
          <div>
            <p className="text-slate-500">Email verified</p>
            <p className="text-slate-200">{student.is_verified ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Learning progress</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500">NLP progress</p>
            <p className="text-slate-100 text-lg font-display">{student.nlp_progress_pct}%</p>
          </div>
          <div>
            <p className="text-slate-500">DL progress</p>
            <p className="text-slate-100 text-lg font-display">{student.dl_progress_pct}%</p>
          </div>
          <div>
            <p className="text-slate-500">Completed labs</p>
            <p className="text-slate-100 text-lg font-display">{student.completed_labs_count}</p>
          </div>
          <div>
            <p className="text-slate-500">Quiz attempts</p>
            <p className="text-slate-100 text-lg font-display">{student.quiz_attempts_count}</p>
          </div>
        </div>
      </div>

      <AccountActionsPanel userId={student.id} currentStatus={student.account_status} onChanged={load} />
    </div>
  );
}
