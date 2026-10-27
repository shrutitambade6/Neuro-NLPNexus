import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Sparkles, X } from "lucide-react";

import { useBirthday } from "../../hooks/useBirthday";
import { formatDateTime } from "../../utils/formatDate";
import type { BirthdayWish } from "../../services/api";
import { BIRTHDAY_PANEL_CLASSES } from "./birthdayTheme";

// Point 13: "Do NOT create an entirely separate messaging system — reuse
// the existing chat/message infrastructure." This panel is purely a
// READ view over wishes the backend already delivered as real chat
// messages (see birthday_service.send_wish / list_wishes_today) — it has
// no compose box of its own; replying for real happens in Messages.tsx,
// which is now the actual conversation those wishes live in.
function BirthdayWishCard({ wish }: { wish: BirthdayWish }) {
  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          {wish.from_username}
          {wish.from_role === "teacher" && <ShieldCheck size={13} className="text-nexus-accent" />}
        </p>
        <span className="text-[11px] text-nexus-muted shrink-0">{formatDateTime(wish.created_at)}</span>
      </div>
      <p className="mt-1 text-sm text-nexus-text">{wish.message}</p>
    </div>
  );
}

export default function BirthdayWishesPanel() {
  const { celebrating, closeCelebration, wishes } = useBirthday();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {celebrating && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-nexus-ink/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.25 }}
          onClick={closeCelebration}
          role="dialog"
          aria-modal="true"
          aria-label="Birthday wishes"
        >
          <motion.div
            className={`relative w-full max-w-md max-h-[80vh] flex flex-col p-5 shadow-2xl ${BIRTHDAY_PANEL_CLASSES}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold flex items-center gap-1.5">
                <Sparkles size={16} className="text-nexus-gold" /> Birthday Wishes
              </h2>
              <button onClick={closeCelebration} className="text-nexus-muted hover:text-nexus-text transition-colors" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {wishes.length === 0 ? (
                <p className="text-sm text-nexus-muted text-center py-8">
                  No wishes yet — friends and teachers who message you today will show up here.
                </p>
              ) : (
                wishes.map((w, i) => <BirthdayWishCard key={`${w.created_at}-${i}`} wish={w} />)
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
