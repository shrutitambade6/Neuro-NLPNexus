import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";

import { useBirthday } from "../../hooks/useBirthday";
import { BIRTHDAY_BADGE_CLASSES } from "./birthdayTheme";

const QUICK_WISHES = [
  "Happy Birthday! 🎉",
  "Happy Birthday! Hope you have an amazing day!",
  "Happy Birthday! Keep learning and growing 🚀",
];

// Point 11: shown at the top of a chat thread when the OTHER participant
// has a legitimate relationship with the signed-in user (an existing
// conversation always counts — see birthday_service._relationships_with_
// kind) and it's their birthday today. Quick suggestions and the custom
// box both send through sendBirthdayWish, which is a REAL chat message
// under the hood (backend birthday_service.send_wish uses
// chat_service.send_message) — it will show up in the thread via the
// same WebSocket push every other chat message uses, not as a separate
// kind of bubble.
export default function BirthdayChatBanner({ otherUserId, otherUsername }: { otherUserId: number; otherUsername: string }) {
  const { relatedBirthdaysToday, sendWish } = useBirthday();
  const [dismissed, setDismissed] = useState(false);
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);

  const isTheirBirthday = relatedBirthdaysToday.some((r) => r.user_id === otherUserId);
  if (!isTheirBirthday || dismissed) return null;

  const send = async (message: string) => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await sendWish(otherUserId, message.trim());
      setSentOnce(true);
      setCustom("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-nexus-gold/30 bg-nexus-gold/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium flex items-center gap-1.5">
          🎂 It's {otherUsername}'s birthday today!
        </p>
        <button onClick={() => setDismissed(true)} className="text-nexus-muted hover:text-nexus-text transition-colors shrink-0" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>

      {sentOnce ? (
        <p className="mt-1.5 text-xs text-nexus-good">Your birthday wish was sent 🎉</p>
      ) : (
        <>
          <p className="text-xs text-nexus-muted mt-0.5 mb-2">Send them a quick wish?</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_WISHES.map((text) => (
              <button
                key={text}
                onClick={() => send(text)}
                disabled={sending}
                className={`${BIRTHDAY_BADGE_CLASSES} border-nexus-border bg-nexus-surface text-nexus-text hover:border-nexus-gold/40 disabled:opacity-50`}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(custom)}
              placeholder="Or write your own…"
              maxLength={300}
              className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1.5 text-xs outline-none focus:border-nexus-accentDim"
            />
            <button
              onClick={() => send(custom)}
              disabled={!custom.trim() || sending}
              className="rounded-lg bg-nexus-gold/80 p-1.5 text-white disabled:opacity-40 hover:bg-nexus-gold transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
