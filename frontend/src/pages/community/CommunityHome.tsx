import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, Plus, Search } from "lucide-react";

import AskDoubtModal from "../../components/community/AskDoubtModal";
import TopicTag from "../../components/community/TopicTag";
import { useAuthStore } from "../../store/authStore";
import { useCommunityStore } from "../../store/communityStore";
import type { Domain } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

type SectionTab = "recent" | "unanswered" | "mine" | "participated" | "saved";

const SECTION_TABS: { id: SectionTab; label: string }[] = [
  { id: "recent", label: "Recent Discussions" },
  { id: "unanswered", label: "Unanswered Questions" },
  { id: "mine", label: "My Questions" },
  { id: "participated", label: "My Discussions" },
  { id: "saved", label: "Saved Discussions" },
];

// Community landing page: subject-focused, not a generic social feed —
// every discussion is tagged to an NLP/DL topic (see DiscussionCard), and
// the section tabs mirror the spec's own nav wishlist (Ask a Doubt / My
// Questions / My Discussions / Saved Discussions / Recent / Unanswered).
export default function CommunityHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { discussions, loadingDiscussions, topics, loadTopics, loadDiscussions } = useCommunityStore();

  const [domain, setDomain] = useState<Domain | "all">("all");
  const [section, setSection] = useState<SectionTab>("recent");
  const [search, setSearch] = useState("");
  const [showAsk, setShowAsk] = useState(false);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    const filters: Parameters<typeof loadDiscussions>[0] = {};
    if (domain !== "all") filters!.domain = domain;
    if (section === "unanswered") filters!.status = "open";
    if (section === "mine") filters!.mine = true;
    if (section === "participated") filters!.participated = true;
    if (section === "saved") filters!.saved = true;
    loadDiscussions(filters);
  }, [domain, section, loadDiscussions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return discussions;
    return discussions.filter((d) => d.title.toLowerCase().includes(q) || d.topic.toLowerCase().includes(q));
  }, [discussions, search]);

  if (!user) {
    return <p className="text-sm text-nexus-muted">Sign in to join the Community.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="text-center space-y-1 pt-2">
        <h1 className="text-2xl font-display font-semibold">Community</h1>
        <p className="text-sm text-nexus-muted">Learn together. Solve together.</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-3 text-nexus-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search discussions…"
          className="w-full rounded-xl border border-nexus-border bg-nexus-surface pl-9 pr-3 py-2.5 text-sm outline-none focus:border-nexus-accentDim"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["all", "nlp", "dl"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                domain === d
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-accent"
                  : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {d === "all" ? "All" : d === "nlp" ? "NLP" : "Deep Learning"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAsk(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
        >
          <Plus size={15} /> Ask a Doubt
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-nexus-border">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              section === tab.id ? "border-nexus-accent text-nexus-text" : "border-transparent text-nexus-muted hover:text-nexus-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loadingDiscussions && <p className="text-sm text-nexus-muted text-center py-6">Loading…</p>}
        {!loadingDiscussions && visible.length === 0 && (
          <div className="text-center py-10 text-sm text-nexus-muted">
            <MessageSquareText className="mx-auto mb-2 opacity-50" size={28} />
            Nothing here yet — be the first to ask or answer a doubt.
          </div>
        )}
        {visible.map((d) => (
          <button
            key={d.id}
            onClick={() => navigate(`/community/${d.id}`)}
            className="w-full text-left rounded-xl border border-nexus-border bg-nexus-surface p-4 hover:border-nexus-accentDim transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <TopicTag domain={d.domain} topic={d.topic} />
              {d.status === "answered" && (
                <span className="text-[11px] font-medium text-nexus-good">
                  {d.has_teacher_reply ? "Teacher answered ✓" : "Answered ✓"}
                </span>
              )}
            </div>
            <p className="font-medium text-sm">{d.title}</p>
            <p className="text-xs text-nexus-muted mt-1">
              {d.author.username} · {d.reply_count} {d.reply_count === 1 ? "reply" : "replies"} · {formatDateTime(d.updated_at)}
            </p>
          </button>
        ))}
      </div>

      {showAsk && !topics && null}
      {showAsk && (
        <AskDoubtModal
          onClose={() => setShowAsk(false)}
          onCreated={(id) => {
            setShowAsk(false);
            navigate(`/community/${id}`);
          }}
        />
      )}
    </div>
  );
}
