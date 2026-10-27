import { useState } from "react";
import { Cake, Loader2, Send } from "lucide-react";

import { useBirthday } from "../../hooks/useBirthday";
import { BIRTHDAY_PANEL_CLASSES } from "./birthdayTheme";

// Point 12: "if a student's birthday is today... the teacher gets a
// notification... with Send birthday wish." The admin/teacher portal
// (TeacherLayout) has no notification bell or Messages page of its own —
// that's a student-only UI concept in this app today — so rather than
// bolt a second notification surface onto a shell that was deliberately
// kept simpler (see TeacherLayout.tsx's own comment), this card surfaces
// the same backend-computed relatedBirthdaysToday (which already
// includes every admin<->student pairing — see birthday_service.
// _relationships_with_kind) right on the Teacher Dashboard's own
// overview, with a real "Send birthday wish" that delivers through the
// same chat system (POST /api/birthday/wish) as everywhere else. Never
// shows a birth year or full date of birth — only the derived "today."
export default function TeacherBirthdayAlert() {
  const { relatedBirthdaysToday, sendWish } = useBirthday();
  const students = relatedBirthdaysToday.filter((r) => r.relationship === "student");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());

  if (students.length === 0) return null;

  const send = async (userId: number) => {
    setSendingId(userId);
    try {
      await sendWish(userId, "Happy Birthday! 🎉 Wishing you a great day from all of us.");
      setSentIds((s) => new Set(s).add(userId));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className={`p-4 ${BIRTHDAY_PANEL_CLASSES}`}>
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Cake size={15} className="text-nexus-gold" /> Student Birthday{students.length > 1 ? "s" : ""} Today
      </p>
      <div className="mt-2 space-y-1.5">
        {students.map((s) => (
          <div key={s.user_id} className="flex items-center justify-between gap-2 text-sm">
            <span>🎂 {s.username}'s birthday is today.</span>
            {sentIds.has(s.user_id) ? (
              <span className="text-xs text-nexus-good">Sent ✓</span>
            ) : (
              <button
                onClick={() => send(s.user_id)}
                disabled={sendingId === s.user_id}
                className="inline-flex items-center gap-1 text-xs font-medium text-nexus-gold hover:underline disabled:opacity-50"
              >
                {sendingId === s.user_id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send birthday wish
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
