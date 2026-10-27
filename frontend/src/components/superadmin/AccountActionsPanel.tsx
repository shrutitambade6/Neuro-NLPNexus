import { KeyRound, PlayCircle, ShieldOff, UserX } from "lucide-react";
import { useState } from "react";

import {
  triggerSuperAdminPasswordReset,
  updateSuperAdminAccountStatus,
} from "../../services/api";
import ConfirmModal from "./ConfirmModal";

type Status = "active" | "suspended" | "deactivated";

const STATUS_ACTIONS: Record<Status, { label: string; icon: typeof ShieldOff; tone: "default" | "danger" }> = {
  active: { label: "Restore to Active", icon: PlayCircle, tone: "default" },
  suspended: { label: "Suspend", icon: ShieldOff, tone: "danger" },
  deactivated: { label: "Deactivate", icon: UserX, tone: "danger" },
};

// Shared by the Student and Teacher detail pages — the account-status
// transitions and password-reset trigger are identical business logic
// either way (both go through the same /superadmin/users/{id}/* endpoints
// and the same _assert_manageable_target guard server-side), so this is
// the one place that logic lives on the frontend too, even though the two
// pages around it stay separate per the spec.
export default function AccountActionsPanel({
  userId,
  currentStatus,
  onChanged,
}: {
  userId: number;
  currentStatus: Status;
  onChanged: () => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Username/Password Authentication milestone (2026-10-07) -- for an
  // account with no email on file, the backend can't send a reset link,
  // so it generates a one-time temporary password instead and returns it
  // directly in the response (see SuperAdminPasswordResetResult). This is
  // the only place in the whole app a plaintext password is ever shown --
  // it exists for exactly this moment, to be read once and handed to the
  // account holder out of band, then it's gone (nothing persists it).
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const otherStatuses = (["active", "suspended", "deactivated"] as Status[]).filter((s) => s !== currentStatus);

  const handleStatusConfirm = async (reason?: string) => {
    if (!pendingStatus || !reason) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await updateSuperAdminAccountStatus(userId, pendingStatus, reason);
      setMessage(res.message);
      onChanged();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(detail ?? "That action failed.");
    } finally {
      setBusy(false);
      setPendingStatus(null);
    }
  };

  const handleResetConfirm = async () => {
    setBusy(true);
    setErrorMsg(null);
    setTemporaryPassword(null);
    try {
      const res = await triggerSuperAdminPasswordReset(userId);
      if (res.email_status === "no_email" && res.temporary_password) {
        // Username/Password Authentication milestone -- this account has
        // no email, so the backend already generated a new temporary
        // password and revoked its sessions; there's no link to send.
        setMessage("A new temporary password was generated. Share it with the account holder directly — it won't be shown again.");
        setTemporaryPassword(res.temporary_password);
      } else if (res.email_status === "sent") {
        setMessage("A password-reset email was sent to this account's own address.");
      } else {
        setMessage(`Reset requested (email delivery not configured in this environment: ${res.message})`);
      }
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(detail ?? "That action failed.");
    } finally {
      setBusy(false);
      setPendingReset(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Account actions</h2>
      <p className="text-[11px] text-slate-500">
        Every action here is written to the immutable Audit Log with your identity, the action,
        and the affected account.
      </p>

      {message && <p className="text-xs text-emerald-400">{message}</p>}
      {temporaryPassword && (
        <p className="text-xs font-mono rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-indigo-300 select-all">
          {temporaryPassword}
        </p>
      )}
      {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}

      <div className="flex flex-wrap gap-2">
        {otherStatuses.map((status) => {
          const cfg = STATUS_ACTIONS[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              onClick={() => setPendingStatus(status)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                cfg.tone === "danger"
                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <Icon size={13} />
              {cfg.label}
            </button>
          );
        })}
        <button
          onClick={() => setPendingReset(true)}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 text-xs transition-colors"
        >
          <KeyRound size={13} />
          Reset password
        </button>
      </div>

      {pendingStatus && (
        <ConfirmModal
          title={`${STATUS_ACTIONS[pendingStatus].label}?`}
          description="This takes effect immediately, including revoking any session already signed in, if you're suspending or deactivating."
          confirmLabel={STATUS_ACTIONS[pendingStatus].label}
          tone={STATUS_ACTIONS[pendingStatus].tone}
          requireReason
          busy={busy}
          onConfirm={handleStatusConfirm}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      {pendingReset && (
        <ConfirmModal
          title="Reset this account's password?"
          description="If this account has an email on file, this emails a reset link to that address — the same self-service flow the user would trigger themselves. If it doesn't (true for most accounts now that sign-up no longer collects email), a new temporary password is generated instead and shown to you once, to hand to the account holder directly."
          confirmLabel="Reset password"
          busy={busy}
          onConfirm={handleResetConfirm}
          onCancel={() => setPendingReset(false)}
        />
      )}
    </div>
  );
}
