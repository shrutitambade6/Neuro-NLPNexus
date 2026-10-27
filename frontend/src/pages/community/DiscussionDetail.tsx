import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Bookmark, BookmarkCheck, CheckCircle2, Flag, Send, ThumbsUp } from "lucide-react";

import TeacherBadge from "../../components/community/TeacherBadge";
import TopicTag from "../../components/community/TopicTag";
import { useAuthStore } from "../../store/authStore";
import { useCommunityStore } from "../../store/communityStore";
import { moduleRoute } from "../../utils/communityCatalog";
import { formatDateTime } from "../../utils/formatDate";
import { reportContent } from "../../services/api";
import type { DiscussionReply } from "../../services/api";

export default function DiscussionDetail() {
  const { discussionId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { activeDiscussion, loadDiscussion, postReply, accept, toggleSave, toggleHelpful } = useCommunityStore();

  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (discussionId) loadDiscussion(Number(discussionId));
  }, [discussionId, loadDiscussion]);

  if (!activeDiscussion || activeDiscussion.id !== Number(discussionId)) {
    return <p className="text-sm text-nexus-muted text-center py-10">Loading discussion…</p>;
  }

  const d = activeDiscussion;
  const isAuthor = user?.id === d.author.id;
  const route = moduleRoute(d.linked_module_id);

  const participants = Array.from(
    new Map([d.author, ...d.replies.map((r) => r.author)].map((u) => [u.id, u])).values()
  );

  const handleReply = async () => {
    if (!reply.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await postReply(d.id, reply.trim());
      setReply("");
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Couldn't post your reply.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
      <div className="space-y-4 min-w-0">
        <button
          onClick={() => navigate("/community")}
          className="inline-flex items-center gap-1.5 text-sm text-nexus-muted hover:text-nexus-text"
        >
          <ArrowLeft size={14} /> Back to Community
        </button>

        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TopicTag domain={d.domain} topic={d.topic} />
            {d.status === "answered" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-nexus-good">
                <CheckCircle2 size={13} /> Answered
              </span>
            )}
          </div>
          <h1 className="text-xl font-display font-semibold">{d.title}</h1>
          <p className="text-xs text-nexus-muted mt-1">
            Asked by {d.author.username} · {formatDateTime(d.created_at)}
          </p>
          <p className="text-sm mt-3 whitespace-pre-wrap">{d.description}</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-nexus-muted">
            {d.reply_count} {d.reply_count === 1 ? "Reply" : "Replies"}
          </p>
          {d.replies.map((r) => (
            <ReplyCard
              key={r.id}
              reply={r}
              canAccept={isAuthor && !r.is_accepted && !r.deleted && d.status !== "answered"}
              onAccept={() => accept(d.id, r.id)}
              onToggleHelpful={() => toggleHelpful(r.id)}
            />
          ))}
          {d.replies.length === 0 && <p className="text-sm text-nexus-muted">No replies yet — be the first to help.</p>}
        </div>

        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-3 space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Share an explanation or ask a follow-up…"
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim resize-none"
          />
          {error && <p className="text-xs text-nexus-bad">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleReply}
              disabled={posting || !reply.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 transition-colors"
            >
              <Send size={14} /> {posting ? "Posting…" : "Reply"}
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-3">
          <button
            onClick={() => toggleSave(d.id)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-sm hover:border-nexus-accentDim transition-colors"
          >
            {d.is_saved ? <BookmarkCheck size={15} className="text-nexus-accent" /> : <Bookmark size={15} />}
            {d.is_saved ? "Saved" : "Save"}
          </button>

          {route && (
            <Link
              to={route}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-nexus-accent/10 border border-nexus-accentDim/30 text-nexus-accent px-3 py-1.5 text-sm font-medium hover:bg-nexus-accent/20 transition-colors"
            >
              <BookOpen size={15} /> Go to linked lab
            </Link>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-nexus-muted mb-1.5">Participants</p>
            <div className="space-y-1">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-sm">
                  <span className="h-5 w-5 rounded-full bg-nexus-surfaceAlt border border-nexus-border flex items-center justify-center text-[10px] font-semibold">
                    {p.username.slice(0, 1).toUpperCase()}
                  </span>
                  {p.username}
                  {p.role === "admin" && <TeacherBadge />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}


function ReplyCard({
  reply,
  canAccept,
  onAccept,
  onToggleHelpful,
}: {
  reply: DiscussionReply;
  canAccept: boolean;
  onAccept: () => void;
  onToggleHelpful: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);

  const submitReport = async () => {
    if (!reason.trim()) return;
    await reportContent("reply", reply.id, reason.trim());
    setReported(true);
    setReporting(false);
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        reply.is_accepted ? "border-nexus-good/40 bg-nexus-good/5" : "border-nexus-border bg-nexus-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{reply.author.username}</span>
          {reply.author_is_teacher && <TeacherBadge />}
          {reply.is_accepted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-nexus-good">
              <CheckCircle2 size={12} /> Accepted answer
            </span>
          )}
        </div>
        <span className="text-[11px] text-nexus-muted shrink-0">{formatDateTime(reply.created_at)}</span>
      </div>
      <p className={`text-sm whitespace-pre-wrap ${reply.deleted ? "italic text-nexus-muted" : ""}`}>{reply.content}</p>

      <div className="flex items-center gap-3 mt-2.5">
        {!reply.deleted && (
          <button
            onClick={onToggleHelpful}
            className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
              reply.reacted_by_me ? "text-nexus-accent" : "text-nexus-muted hover:text-nexus-text"
            }`}
          >
            <ThumbsUp size={13} /> Helpful{reply.helpful_count > 0 ? ` (${reply.helpful_count})` : ""}
          </button>
        )}
        {canAccept && (
          <button onClick={onAccept} className="text-xs font-medium text-nexus-accent hover:underline">
            Mark as accepted answer
          </button>
        )}
        {!reply.deleted && !reported && (
          <button
            onClick={() => setReporting((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-nexus-muted hover:text-nexus-bad transition-colors"
          >
            <Flag size={12} /> Report
          </button>
        )}
        {reported && <span className="text-xs text-nexus-muted">Reported</span>}
      </div>

      {reporting && (
        <div className="mt-2 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you reporting this?"
            className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-2 py-1 text-xs outline-none focus:border-nexus-accentDim"
          />
          <button onClick={submitReport} className="text-xs font-medium text-nexus-bad hover:underline">
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
