import { AlertTriangle } from "lucide-react";
import { useState } from "react";

// Shared confirmation dialog for every destructive/sensitive Super Admin
// action (suspend, deactivate, restore, reset password, resolve a report
// with a suspension attached). Requires a short written reason for
// account-status changes — the spec asks for "confirmation dialogs for
// destructive actions", and update_account_status already requires a
// `reason` server-side (see backend/app/schemas/superadmin.py
// UpdateAccountStatusRequest), so this is also where that reason gets
// typed, not an afterthought bolted on separately.
interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  requireReason?: boolean;
  busy?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel,
  tone = "default",
  requireReason = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState("");
  const canConfirm = !requireReason || reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className={`mt-0.5 shrink-0 ${tone === "danger" ? "text-rose-400" : "text-amber-400"}`}
          />
          <div>
            <h2 className="font-semibold text-sm text-slate-100">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>
        </div>

        {requireReason && (
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Reason (recorded in the Audit Log)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
              placeholder="e.g. Repeated spam reports confirmed against this account."
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
            disabled={busy || !canConfirm}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              tone === "danger"
                ? "bg-rose-500/90 hover:bg-rose-500 text-white"
                : "bg-indigo-500/90 hover:bg-indigo-500 text-white"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
