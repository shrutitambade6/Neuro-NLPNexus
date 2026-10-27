import { ArrowLeft, IdCard, Loader2, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AccountActionsPanel from "../../components/superadmin/AccountActionsPanel";
import StatusBadge from "../../components/superadmin/StatusBadge";
import { fetchSuperAdminTeacherDetail, type SuperAdminTeacherSummary } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

export default function TeacherDetail() {
  const { teacherId } = useParams();
  const id = Number(teacherId);
  const [teacher, setTeacher] = useState<SuperAdminTeacherSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSuperAdminTeacherDetail(id)
      .then(setTeacher)
      .catch(() => setError("Couldn't load this teacher — they may no longer exist, or this account lacks access."));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!teacher) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/super-admin/teachers" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100">
        <ArrowLeft size={13} /> All teachers
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-semibold text-lg text-slate-100 flex items-center gap-2">
              {teacher.username}
              {teacher.is_online && (
                <span className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-normal">
                  <Wifi size={11} /> online
                </span>
              )}
            </h1>
            {/* Username/Password Authentication milestone (2026-10-07) --
                most accounts now have no email on file; show full name
                instead when there's one, and skip the line otherwise
                rather than render an icon next to nothing. */}
            {teacher.full_name && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <IdCard size={11} /> {teacher.full_name}
              </p>
            )}
          </div>
          <StatusBadge status={teacher.account_status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <p className="text-slate-500">Assigned domain</p>
            <p className="text-slate-200 capitalize">{teacher.assigned_domain ?? "Both"}</p>
          </div>
          <div>
            <p className="text-slate-500">Email verified</p>
            <p className="text-slate-200">{teacher.is_verified ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-slate-500">Registered</p>
            <p className="text-slate-200">{formatDateTime(teacher.created_at)}</p>
          </div>
          <div>
            <p className="text-slate-500">Last login</p>
            <p className="text-slate-200">{formatDateTime(teacher.last_login)}</p>
          </div>
        </div>
      </div>

      <AccountActionsPanel userId={teacher.id} currentStatus={teacher.account_status} onChanged={load} />
    </div>
  );
}
