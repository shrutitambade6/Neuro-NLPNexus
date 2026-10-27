import { create } from "zustand";

import {
  type ChatMessage,
  type ConversationSummary,
  type UserSearchResult,
  deleteChatMessage,
  editChatMessage,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  searchChatUsers,
  sendChatMessage,
  startConversation,
} from "../services/api";
import { chatSocket, type SocketEvent } from "../services/chatSocket";

interface ChatState {
  connected: boolean;
  conversations: ConversationSummary[];
  messagesByConversation: Record<number, ChatMessage[]>;
  activeConversationId: number | null;
  typingByConversation: Record<number, boolean>;
  searchResults: UserSearchResult[];
  searching: boolean;
  loadingMessages: boolean;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  loadConversations: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  openConversationWithUser: (otherUserId: number) => Promise<number>;
  selectConversation: (conversationId: number) => Promise<void>;
  sendMessage: (conversationId: number, content: string) => Promise<void>;
  editMessage: (messageId: number, conversationId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number, conversationId: number) => Promise<void>;
  sendTyping: (conversationId: number, isTyping: boolean) => void;
  totalUnread: () => number;
}

let socketUnsubscribe: (() => void) | null = null;

function upsertMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === message.id);
  if (idx === -1) return [...list, message];
  const copy = [...list];
  copy[idx] = message;
  return copy;
}

// Private 1:1 chat state. Every conversation/message here is real data
// from the backend (app/api/chat.py) — this store never invents a
// message. The WebSocket listener (wired once in connectSocket) is what
// makes "receive messages in real time" real: a message sent from this
// tab is appended from the REST response immediately, and a message sent
// FROM the other participant arrives here only via the live push, never
// polled.
export const useChatStore = create<ChatState>()((set, get) => ({
  connected: false,
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  typingByConversation: {},
  searchResults: [],
  searching: false,
  loadingMessages: false,

  connectSocket: (token) => {
    if (get().connected) return;
    chatSocket.connect(token);
    socketUnsubscribe = chatSocket.on((event: SocketEvent) => {
      if (event.type === "chat.message") {
        const message = event.message as unknown as ChatMessage;
        set((s) => ({
          messagesByConversation: {
            ...s.messagesByConversation,
            [event.conversation_id]: upsertMessage(s.messagesByConversation[event.conversation_id] ?? [], message),
          },
        }));
        // Refresh the conversation list so ordering/unread counts/preview
        // stay correct even for a conversation that isn't open right now.
        get().loadConversations();
      } else if (event.type === "chat.read_receipt") {
        set((s) => ({
          messagesByConversation: {
            ...s.messagesByConversation,
            [event.conversation_id]: (s.messagesByConversation[event.conversation_id] ?? []).map((m) => ({
              ...m,
              read_at: m.read_at ?? new Date().toISOString(),
            })),
          },
        }));
      } else if (event.type === "chat.typing") {
        set((s) => ({
          typingByConversation: { ...s.typingByConversation, [event.conversation_id]: event.is_typing },
        }));
        if (event.is_typing) {
          setTimeout(() => {
            set((s) => ({ typingByConversation: { ...s.typingByConversation, [event.conversation_id]: false } }));
          }, 4000);
        }
      }
    });
    set({ connected: true });
  },

  disconnectSocket: () => {
    socketUnsubscribe?.();
    socketUnsubscribe = null;
    chatSocket.disconnect();
    set({ connected: false, conversations: [], messagesByConversation: {}, activeConversationId: null });
  },

  loadConversations: async () => {
    const conversations = await fetchConversations();
    set({ conversations });
  },

  searchUsers: async (query) => {
    set({ searching: true });
    try {
      const results = await searchChatUsers(query);
      set({ searchResults: results, searching: false });
    } catch {
      set({ searching: false });
    }
  },

  openConversationWithUser: async (otherUserId) => {
    const res = await startConversation(otherUserId);
    set((s) => ({
      activeConversationId: res.conversation_id,
      messagesByConversation: { ...s.messagesByConversation, [res.conversation_id]: res.messages },
    }));
    await get().loadConversations();
    return res.conversation_id;
  },

  selectConversation: async (conversationId) => {
    set({ activeConversationId: conversationId, loadingMessages: true });
    try {
      const res = await fetchMessages(conversationId);
      set((s) => ({
        messagesByConversation: { ...s.messagesByConversation, [conversationId]: res.messages },
        loadingMessages: false,
      }));
      await markConversationRead(conversationId);
      await get().loadConversations();
    } catch {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (conversationId, content) => {
    const message = await sendChatMessage(conversationId, content);
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: upsertMessage(s.messagesByConversation[conversationId] ?? [], message),
      },
    }));
    get().loadConversations();
  },

  editMessage: async (messageId, conversationId, content) => {
    const message = await editChatMessage(messageId, content);
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: upsertMessage(s.messagesByConversation[conversationId] ?? [], message),
      },
    }));
  },

  deleteMessage: async (messageId, conversationId) => {
    const message = await deleteChatMessage(messageId);
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: upsertMessage(s.messagesByConversation[conversationId] ?? [], message),
      },
    }));
  },

  sendTyping: (conversationId, isTyping) => chatSocket.sendTyping(conversationId, isTyping),

  totalUnread: () => get().conversations.reduce((sum, c) => sum + c.unread_count, 0),
}));
