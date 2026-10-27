import { create } from "zustand";

import {
  fetchBirthdayToday,
  fetchBirthdayWishes,
  fetchMyBirthday,
  sendBirthdayWish,
  updateMyBirthday,
  type BirthdayMe,
  type BirthdayWish,
  type RelatedBirthday,
} from "../services/api";

interface BirthdayState {
  // Backend-computed, never trusted from anywhere else (point 24) — both
  // fields come straight from GET /api/birthday/today on every load().
  isBirthdayToday: boolean;
  relatedBirthdaysToday: RelatedBirthday[];
  wishes: BirthdayWish[];
  // Owner-only — the real birthday/timezone, used by Profile (private
  // display) and Settings (the add/change/remove form). Never another
  // user's; see services/api.ts's BirthdayMe docstring.
  myBirthday: BirthdayMe | null;
  loaded: boolean;
  loading: boolean;

  // The full-screen greeting ("🎂 Happy Birthday, Shruti!") is shown once
  // per browser session, not once per day — dismissing it just closes
  // that overlay; it does NOT turn birthday mode off (point 5: nothing
  // here is a manual on/off toggle, only the real calendar date is).
  greetingDismissed: boolean;
  // The dashboard banner has its own, separate session-dismiss flag (point
  // 9: dismissing the banner must not also dismiss/deactivate the rest of
  // the experience).
  bannerDismissed: boolean;
  // Whether the "celebration panel" (wishes + greeting detail) is open.
  celebrating: boolean;

  load: () => Promise<void>;
  setMyBirthday: (birthday: string | null, timezone?: string | null) => Promise<void>;
  celebrate: () => void;
  closeCelebration: () => void;
  dismissGreeting: () => void;
  dismissBanner: () => void;
  sendWish: (toUserId: number, message: string) => Promise<void>;
  reset: () => void;
}

// Birthday Experience milestone. Deliberately holds NO "isBirthdayToday"
// flag that outlives a page load uncomputed — every load() call re-asks
// the backend, which re-derives it live from the user's own birthday +
// timezone (see birthday_service.is_birthday_today). That's what makes
// the 24-hour window start and end exactly on time with no cron job and
// nothing to "turn off": there's simply nothing stored that could get
// stuck in the "on" state past midnight.
export const useBirthdayStore = create<BirthdayState>()((set) => ({
  isBirthdayToday: false,
  relatedBirthdaysToday: [],
  wishes: [],
  myBirthday: null,
  loaded: false,
  loading: false,
  greetingDismissed: false,
  bannerDismissed: false,
  celebrating: false,

  load: async () => {
    set({ loading: true });
    try {
      const [status, myBirthday] = await Promise.all([fetchBirthdayToday(), fetchMyBirthday()]);
      const wishes = status.is_my_birthday ? await fetchBirthdayWishes() : [];
      set({
        isBirthdayToday: status.is_my_birthday,
        relatedBirthdaysToday: status.related_birthdays_today,
        wishes,
        myBirthday,
        loaded: true,
        loading: false,
      });
    } catch {
      // A failed fetch should never crash the dashboard — it just means
      // the celebration layer stays off this load, same as not having a
      // birthday set at all.
      set({ loading: false, loaded: true });
    }
  },

  setMyBirthday: async (birthday, timezone) => {
    const updated = await updateMyBirthday(birthday, timezone);
    // Point 22: removing the birthday (birthday: null) must immediately
    // stop the celebration feature — updated.is_birthday_today is already
    // false in that response (the backend recomputes it from the now-null
    // birthday), so isBirthdayToday here just follows that honestly.
    set({ myBirthday: updated, isBirthdayToday: updated.is_birthday_today });
  },

  celebrate: () => set({ celebrating: true, greetingDismissed: true }),
  closeCelebration: () => set({ celebrating: false }),
  dismissGreeting: () => set({ greetingDismissed: true }),
  dismissBanner: () => set({ bannerDismissed: true }),

  sendWish: async (toUserId, message) => {
    await sendBirthdayWish(toUserId, message);
    // The wish itself arrives in the recipient's own Birthday Wishes panel
    // (they aren't the one calling this) — nothing to update here for the
    // sender beyond having made the real chat/notification write.
  },

  reset: () => {
    set({
      isBirthdayToday: false,
      relatedBirthdaysToday: [],
      wishes: [],
      myBirthday: null,
      loaded: false,
      loading: false,
      greetingDismissed: false,
      bannerDismissed: false,
      celebrating: false,
    });
  },
}));
