import { create } from "zustand";

import {
  type CommunityTopicsResponse,
  type DiscussionDetail,
  type DiscussionFilters,
  type DiscussionSummary,
  type NotificationItem,
  acceptDiscussionReply,
  createDiscussion,
  createDiscussionReply,
  fetchCommunityTopics,
  fetchDiscussion,
  fetchDiscussions,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  toggleHelpfulReaction,
  toggleSavedDiscussion,
} from "../services/api";
import { chatSocket, type SocketEvent } from "../services/chatSocket";

interface CommunityState {
  topics: CommunityTopicsResponse | null;
  discussions: DiscussionSummary[];
  loadingDiscussions: boolean;
  activeDiscussion: DiscussionDetail | null;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  socketWired: boolean;

  wireSocket: () => void;
  loadTopics: () => Promise<void>;
  loadDiscussions: (filters?: DiscussionFilters) => Promise<void>;
  loadDiscussion: (id: number) => Promise<void>;
  postDiscussion: (payload: {
    title: string;
    description: string;
    domain: "nlp" | "dl";
    topic: string;
    linked_module_id?: string | null;
  }) => Promise<DiscussionDetail>;
  postReply: (discussionId: number, content: string) => Promise<void>;
  accept: (discussionId: number, replyId: number) => Promise<void>;
  toggleSave: (discussionId: number) => Promise<void>;
  toggleHelpful: (replyId: number) => Promise<void>;
  loadNotifications: () => Promise<void>;
  markNotifRead: (id: number) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  // Clears every per-user field (discussions/activeDiscussion/notifications/
  // unreadNotificationCount) and detaches the socket listener wireSocket()
  // attached, so a logout (or a token that expired and got silently signed
  // out) can never leave one student's notifications/discussion state
  // visible to whoever is signed in next in the same browser tab. `topics`
  // is deliberately left alone — it's a shared, non-user-specific catalog,
  // not something that needs to be re-fetched per account.
  reset: () => void;
}

let communitySocketUnsubscribe: (() => void) | null = null;

// Subject-focused discussions/doubt-solving — deliberately separate from
// chatStore (see orm_models.py's module docstring for why private chat
// and public discussions are two different systems, not one). Every
// discussion/reply/notification here comes straight from
// app/api/community.py; nothing is invented client-side.
export const useCommunityStore = create<CommunityState>()((set, get) => ({
  topics: null,
  discussions: [],
  loadingDiscussions: false,
  activeDiscussion: null,
  notifications: [],
  unreadNotificationCount: 0,
  socketWired: false,

  wireSocket: () => {
    if (get().socketWired) return;
    communitySocketUnsubscribe = chatSocket.on((event: SocketEvent) => {
      if (event.type === "discussion.reply") {
        const active = get().activeDiscussion;
        if (active && active.id === event.discussion_id) {
          const reply = event.reply as unknown as DiscussionDetail["replies"][number];
          set({
            activeDiscussion: {
              ...active,
              reply_count: active.reply_count + 1,
              has_teacher_reply: active.has_teacher_reply || reply.author_is_teacher,
              replies: [...active.replies, reply],
            },
          });
        }
        set((s) => ({ unreadNotificationCount: s.unreadNotificationCount + 1 }));
      } else if (event.type === "discussion.accepted") {
        const active = get().activeDiscussion;
        const discussion = event.discussion as unknown as DiscussionDetail;
        if (active && active.id === discussion.id) {
          set({ activeDiscussion: discussion });
        }
        set((s) => ({ unreadNotificationCount: s.unreadNotificationCount + 1 }));
      }
    });
    set({ socketWired: true });
  },

  loadTopics: async () => {
    if (get().topics) return;
    const topics = await fetchCommunityTopics();
    set({ topics });
  },

  loadDiscussions: async (filters = {}) => {
    set({ loadingDiscussions: true });
    try {
      const discussions = await fetchDiscussions(filters);
      set({ discussions, loadingDiscussions: false });
    } catch {
      set({ loadingDiscussions: false });
    }
  },

  loadDiscussion: async (id) => {
    const detail = await fetchDiscussion(id);
    set({ activeDiscussion: detail });
  },

  postDiscussion: async (payload) => {
    const detail = await createDiscussion(payload);
    set((s) => ({ discussions: [detail, ...s.discussions] }));
    return detail;
  },

  postReply: async (discussionId, content) => {
    const reply = await createDiscussionReply(discussionId, content);
    const active = get().activeDiscussion;
    if (active && active.id === discussionId) {
      set({
        activeDiscussion: {
          ...active,
          reply_count: active.reply_count + 1,
          has_teacher_reply: active.has_teacher_reply || reply.author_is_teacher,
          replies: [...active.replies, reply],
        },
      });
    }
  },

  accept: async (discussionId, replyId) => {
    const detail = await acceptDiscussionReply(discussionId, replyId);
    set({ activeDiscussion: detail });
    set((s) => ({ discussions: s.discussions.map((d) => (d.id === discussionId ? detail : d)) }));
  },

  toggleSave: async (discussionId) => {
    const saved = await toggleSavedDiscussion(discussionId);
    set((s) => ({
      discussions: s.discussions.map((d) => (d.id === discussionId ? { ...d, is_saved: saved } : d)),
      activeDiscussion:
        s.activeDiscussion && s.activeDiscussion.id === discussionId
          ? { ...s.activeDiscussion, is_saved: saved }
          : s.activeDiscussion,
    }));
  },

  toggleHelpful: async (replyId) => {
    const { reacted, helpful_count } = await toggleHelpfulReaction(replyId);
    set((s) => {
      if (!s.activeDiscussion) return {};
      return {
        activeDiscussion: {
          ...s.activeDiscussion,
          replies: s.activeDiscussion.replies.map((r) =>
            r.id === replyId ? { ...r, reacted_by_me: reacted, helpful_count } : r
          ),
        },
      };
    });
  },

  loadNotifications: async () => {
    const res = await fetchNotifications();
    set({ notifications: res.notifications, unreadNotificationCount: res.unread_count });
  },

  markNotifRead: async (id) => {
    await markNotificationRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadNotificationCount: Math.max(0, s.unreadNotificationCount - 1),
    }));
  },

  markAllNotifsRead: async () => {
    await markAllNotificationsRead();
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, is_read: true })), unreadNotificationCount: 0 }));
  },

  reset: () => {
    communitySocketUnsubscribe?.();
    communitySocketUnsubscribe = null;
    set({
      discussions: [],
      loadingDiscussions: false,
      activeDiscussion: null,
      notifications: [],
      unreadNotificationCount: 0,
      socketWired: false,
    });
  },
}));
