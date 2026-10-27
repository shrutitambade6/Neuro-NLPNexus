import { useAuthStore } from "../store/authStore";
import { useBirthdayStore } from "../store/birthdayStore";

// The one centralized read of birthday state every component should use
// (point 26 of the Birthday Experience spec: no page re-implements this
// logic itself). Backed by birthdayStore, which is loaded once per
// session from TopBar.tsx alongside the rest of the per-login bootstrap
// (progress, notifications) and reset on logout the same way those are.
export function useBirthday() {
  const isBirthdayToday = useBirthdayStore((s) => s.isBirthdayToday);
  const relatedBirthdaysToday = useBirthdayStore((s) => s.relatedBirthdaysToday);
  const wishes = useBirthdayStore((s) => s.wishes);
  const loaded = useBirthdayStore((s) => s.loaded);
  const loading = useBirthdayStore((s) => s.loading);
  const greetingDismissed = useBirthdayStore((s) => s.greetingDismissed);
  const bannerDismissed = useBirthdayStore((s) => s.bannerDismissed);
  const celebrating = useBirthdayStore((s) => s.celebrating);
  const celebrate = useBirthdayStore((s) => s.celebrate);
  const closeCelebration = useBirthdayStore((s) => s.closeCelebration);
  const dismissGreeting = useBirthdayStore((s) => s.dismissGreeting);
  const dismissBanner = useBirthdayStore((s) => s.dismissBanner);
  const sendWish = useBirthdayStore((s) => s.sendWish);
  const myBirthday = useBirthdayStore((s) => s.myBirthday);
  const setMyBirthday = useBirthdayStore((s) => s.setMyBirthday);
  const username = useAuthStore((s) => s.user?.username ?? null);

  return {
    isBirthdayToday,
    // The signed-in user's own name, for personalized greeting copy
    // ("🎂 Happy Birthday, Shruti!") — there's no separate "which user is
    // celebrating" concept here, since this hook only ever reflects the
    // CURRENT account's own birthday status (never another user's real
    // date of birth — see services/api.ts's BirthdayMe/BirthdayStatus).
    birthdayUser: isBirthdayToday ? username : null,
    relatedBirthdaysToday,
    wishes,
    loaded,
    loading,
    greetingDismissed,
    bannerDismissed,
    celebrating,
    celebrate,
    closeCelebration,
    dismissGreeting,
    dismissBanner,
    sendWish,
    // Owner-only real birthday/timezone + the setter Settings uses for
    // add/change/remove (point 22). Never populated for anyone else.
    myBirthday,
    setMyBirthday,
  };
}
