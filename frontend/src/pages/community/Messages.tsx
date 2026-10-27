import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, Check, CheckCheck, Flag, MoreVertical, Search, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import BirthdayChatBanner from "../../components/birthday/BirthdayChatBanner";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { useBirthday } from "../../hooks/useBirthday";
import { formatDateTime } from "../../utils/formatDate";
import { blockUser, fetchBlockedUsers, reportContent, unblockUser } from "../../services/api";
import type { ChatMessage } from "../../services/api";

// Private 1:1 messaging — deliberately separate from the Community
// discussions pages (see backend orm_models.py's module docstring: two
// different privacy models, two different tables). Three-panel layout per
// spec: conversations/search on the left, the thread in the center, the
// other participant's profile + presence on the right.
export default function Messages() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    conversations,
    messagesByConversation,
    activeConversationId,
    typingByConversation,
    searchResults,
    searching,
    loadConversations,
    searchUsers,
    openConversationWithUser,
    selectConversation,
    sendMessage,
    deleteMessage,
    sendTyping,
  } = useChatStore();

  const { relatedBirthdaysToday } = useBirthday();
  const birthdayUserIds = new Set(relatedBirthdaysToday.map((r) => r.user_id));

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchBlockedUsers().then((users) => setBlockedIds(new Set(users.map((u) => u.id))));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) searchUsers(query);
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];
  const activeConvo = conversations.find((c) => c.id === activeConversationId) ?? null;
  const otherIsTyping = activeConversationId ? typingByConversation[activeConversationId] ?? false : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, otherIsTyping]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || !activeConversationId) return;
    sendMessage(activeConversationId, content);
    setDraft("");
    sendTyping(activeConversationId, false);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!activeConversationId) return;
    sendTyping(activeConversationId, value.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(activeConversationId, false), 2000);
  };

  const showListOnMobile = activeConversationId === null;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left panel — conversations + user search */}
      <aside
        className={`${showListOnMobile ? "flex" : "hidden"} md:flex w-full md:w-72 shrink-0 flex-col rounded-2xl border border-nexus-border bg-nexus-surface overflow-hidden`}
      >
        <div className="p-3 border-b border-nexus-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm">Messages</h2>
            <button
              onClick={() => setShowSearch((s) => !s)}
              title="Start a new conversation"
              className="text-nexus-muted hover:text-nexus-accent rounded-lg p-1.5 hover:bg-nexus-surfaceAlt transition-colors"
            >
              <UserPlus size={16} />
            </button>
          </div>
          {showSearch && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-nexus-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or email…"
                className="w-full rounded-lg border border-nexus-border bg-nexus-bg pl-8 pr-2 py-1.5 text-sm outline-none focus:border-nexus-accentDim"
              />
            </div>
          )}
          {showSearch && query.trim() && (
            <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg border border-nexus-border bg-nexus-bg">
              {searching && <p className="px-2 py-1.5 text-xs text-nexus-muted">Searching…</p>}
              {!searching && searchResults.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-nexus-muted">No matching users.</p>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={async () => {
                    await openConversationWithUser(u.id);
                    setShowSearch(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-nexus-surfaceAlt transition-colors"
                >
                  <span className="truncate">{u.username}</span>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${u.is_online ? "bg-nexus-good" : "bg-nexus-border"}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-nexus-muted">
              No conversations yet — search for someone above to start one.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left border-b border-nexus-border/60 transition-colors ${
                c.id === activeConversationId ? "bg-nexus-accent/10" : "hover:bg-nexus-surfaceAlt"
              }`}
            >
              <div className="relative shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-nexus-surfaceAlt border border-nexus-border flex items-center justify-center text-xs font-semibold">
                  {c.other_user.username.slice(0, 1).toUpperCase()}
                </div>
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-nexus-surface ${
                    c.is_online ? "bg-nexus-good" : "bg-nexus-border"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium truncate flex items-center gap-1">
                    {c.other_user.username}
                    {birthdayUserIds.has(c.other_user.id) && <span title="Birthday today">🎂</span>}
                  </p>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 rounded-full bg-nexus-accent text-white text-[10px] px-1.5 py-0.5 min-w-[18px] text-center">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-nexus-muted truncate">{c.last_message_preview ?? "Say hello…"}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Center panel — the thread */}
      <section
        className={`${showListOnMobile ? "hidden" : "flex"} md:flex flex-1 flex-col rounded-2xl border border-nexus-border bg-nexus-surface overflow-hidden`}
      >
        {!activeConvo ? (
          <div className="flex-1 flex items-center justify-center text-sm text-nexus-muted">
            Select a conversation to start messaging.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-nexus-border">
              <button
                onClick={() => useChatStore.setState({ activeConversationId: null })}
                className="md:hidden text-nexus-muted hover:text-nexus-text"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="h-8 w-8 rounded-full bg-nexus-surfaceAlt border border-nexus-border flex items-center justify-center text-xs font-semibold">
                {activeConvo.other_user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1">
                  {activeConvo.other_user.username}
                  {birthdayUserIds.has(activeConvo.other_user.id) && <span title="Birthday today">🎂</span>}
                </p>
                <p className="text-xs text-nexus-muted">
                  {otherIsTyping ? "typing…" : activeConvo.is_online ? "Online now" : "Offline"}
                </p>
              </div>
            </div>

            {/* Birthday Experience milestone, point 11 — renders nothing
                unless activeConvo.other_user actually has a legitimate
                relationship with the signed-in user AND it's genuinely
                their birthday today (both backend-computed; see
                useBirthday().relatedBirthdaysToday). */}
            <BirthdayChatBanner otherUserId={activeConvo.other_user.id} otherUsername={activeConvo.other_user.username} />

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {activeMessages.map((m) => (
                <MessageRow key={m.id} message={m} isMine={m.sender_id === currentUser?.id} onDelete={deleteMessage} />
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-nexus-border flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="rounded-lg bg-nexus-accent p-2 text-white disabled:opacity-40 hover:bg-nexus-accent/90 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </section>

      {/* Right panel — the other participant's profile + presence */}
      {activeConvo && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col rounded-2xl border border-nexus-border bg-nexus-surface p-4 gap-3">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-14 w-14 rounded-full bg-nexus-surfaceAlt border border-nexus-border flex items-center justify-center text-lg font-semibold">
              {activeConvo.other_user.username.slice(0, 1).toUpperCase()}
            </div>
            <p className="font-medium text-sm">{activeConvo.other_user.username}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                activeConvo.is_online
                  ? "text-nexus-good border-nexus-good/30 bg-nexus-good/10"
                  : "text-nexus-muted border-nexus-border"
              }`}
            >
              {activeConvo.is_online ? "Online now" : "Offline"}
            </span>
          </div>
          <div className="text-xs text-nexus-muted space-y-1 pt-2 border-t border-nexus-border">
            <p className="flex items-center gap-1">
              Role:{" "}
              <span className="text-nexus-text inline-flex items-center gap-1">
                {activeConvo.other_user.role === "admin" ? (
                  <>
                    Teacher <ShieldCheck size={12} className="text-nexus-accent" />
                  </>
                ) : (
                  "Student"
                )}
              </span>
            </p>
          </div>
          <div className="pt-2 border-t border-nexus-border">
            <button
              onClick={async () => {
                const id = activeConvo.other_user.id;
                if (blockedIds.has(id)) {
                  await unblockUser(id);
                  setBlockedIds((s) => {
                    const next = new Set(s);
                    next.delete(id);
                    return next;
                  });
                } else {
                  await blockUser(id);
                  setBlockedIds((s) => new Set(s).add(id));
                }
              }}
              className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                blockedIds.has(activeConvo.other_user.id)
                  ? "border-nexus-border text-nexus-muted hover:text-nexus-text"
                  : "border-nexus-bad/30 text-nexus-bad hover:bg-nexus-bad/10"
              }`}
            >
              <Ban size={13} /> {blockedIds.has(activeConvo.other_user.id) ? "Unblock" : "Block this user"}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isMine,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  onDelete: (messageId: number, conversationId: number) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState("");

  const submitReport = async () => {
    if (!reason.trim()) return;
    await reportContent("message", message.id, reason.trim());
    setReported(true);
    setReporting(false);
    setShowMenu(false);
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
      <div className={`relative max-w-[75%] ${isMine ? "order-2" : ""}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            message.deleted
              ? "italic text-nexus-muted bg-nexus-surfaceAlt border border-nexus-border"
              : isMine
              ? "bg-nexus-accent text-white"
              : "bg-nexus-surfaceAlt text-nexus-text border border-nexus-border"
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-nexus-muted ${isMine ? "justify-end" : ""}`}>
          <span>{formatDateTime(message.created_at)}</span>
          {message.edited_at && !message.deleted && <span>· edited</span>}
          {isMine && !message.deleted && (message.read_at ? <CheckCheck size={12} /> : <Check size={12} />)}
          {!isMine && reported && <span>· reported</span>}
        </div>
        {!message.deleted && (
          <button
            onClick={() => setShowMenu((s) => !s)}
            className={`absolute top-1 opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-nexus-text transition-opacity ${
              isMine ? "-left-6" : "-right-6"
            }`}
          >
            <MoreVertical size={14} />
          </button>
        )}
        {showMenu && isMine && !message.deleted && (
          <button
            onClick={() => {
              onDelete(message.id, message.conversation_id);
              setShowMenu(false);
            }}
            className="absolute -left-6 top-6 text-nexus-bad hover:opacity-80"
            title="Delete message"
          >
            <Trash2 size={14} />
          </button>
        )}
        {showMenu && !isMine && !reported && (
          <button
            onClick={() => setReporting((s) => !s)}
            className="absolute -right-6 top-6 text-nexus-muted hover:text-nexus-bad"
            title="Report message"
          >
            <Flag size={14} />
          </button>
        )}
        {reporting && (
          <div className={`mt-1 flex gap-1.5 ${isMine ? "justify-end" : ""}`}>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason…"
              className="w-40 rounded-lg border border-nexus-border bg-nexus-bg px-2 py-1 text-xs outline-none focus:border-nexus-accentDim"
            />
            <button onClick={submitReport} className="text-xs font-medium text-nexus-bad hover:underline">
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
