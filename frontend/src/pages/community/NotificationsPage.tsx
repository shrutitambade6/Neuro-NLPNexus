import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Cake, CheckCircle2, Gift, MessageCircle, Reply, ShieldCheck } from "lucide-react";

import { useChatStore } from "../../store/chatStore";
import { useCommunityStore } from "../../store/communityStore";
import { formatDateTime } from "../../utils/formatDate";
import type { NotificationItem } from "../../services/api";

const TYPE_ICON: Record<NotificationItem["notif_type"], typeof MessageCircle> = {
  message: MessageCircle,
  reply: Reply,
  mention: AtSign,
  accepted_answer: CheckCircle2,
  teacher_response: ShieldCheck,
  // Birthday Experience milestone — same Notification table/list, two
  // more notif_type values (see backend orm_models.py's docstring).
  birthday: Cake,
  birthday_wish: Gift,
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadNotificationCount, loadNotifications, markNotifRead, markAllNotifsRead } =
    useCommunityStore();
  const openConversationWithUser = useChatStore((s) => s.openConversationWithUser);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleClick = async (n: NotificationItem) => {
    if (!n.is_read) await markNotifRead(n.id);
    if (n.reference_type === "discussion") {
      navigate(`/community/${n.reference_id}`);
    } else if (n.reference_type === "user") {
      // Birthday Experience milestone — "It's so-and-so's birthday"
      // notifications point at a user (reference_id), not a conversation,
      // so clicking one opens (or reuses) a real conversation with them —
      // the natural next step being to actually send a wish.
      await openConversationWithUser(n.reference_id);
      navigate("/messages");
    } else {
      navigate("/messages");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold">Notifications</h1>
        {unreadNotificationCount > 0 && (
          <button onClick={() => markAllNotifsRead()} className="text-sm text-nexus-accent hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {notifications.length === 0 && (
          <p className="text-sm text-nexus-muted text-center py-10">You're all caught up.</p>
        )}
        {notifications.map((n) => {
          const Icon = TYPE_ICON[n.notif_type];
          return (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                n.is_read ? "border-nexus-border bg-nexus-surface" : "border-nexus-accentDim/40 bg-nexus-accent/5"
              }`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${n.is_read ? "text-nexus-muted" : "text-nexus-accent"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{n.content}</p>
                <p className="text-[11px] text-nexus-muted mt-0.5">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-nexus-accent shrink-0 mt-1.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
