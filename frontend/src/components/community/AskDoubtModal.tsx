import { useMemo, useState } from "react";
import { X } from "lucide-react";

import type { Domain } from "../../services/api";
import { useCommunityStore } from "../../store/communityStore";

export default function AskDoubtModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const topics = useCommunityStore((s) => s.topics);
  const postDiscussion = useCommunityStore((s) => s.postDiscussion);

  const [domain, setDomain] = useState<Domain>("nlp");
  const [topic, setTopic] = useState("");
  const [linkedModuleId, setLinkedModuleId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topicOptions = useMemo(() => (domain === "nlp" ? topics?.nlp ?? [] : topics?.dl ?? []), [domain, topics]);
  const selectedTopicDefault = topicOptions.find((t) => t.name === topic)?.default_module_id ?? null;

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !topic) {
      setError("Please fill in a title, description, and topic.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await postDiscussion({
        title: title.trim(),
        description: description.trim(),
        domain,
        topic,
        linked_module_id: linkedModuleId || null,
      });
      onCreated(created.id);
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Couldn't post your doubt — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-nexus-border">
          <h2 className="font-display font-semibold">Ask a Doubt</h2>
          <button onClick={onClose} className="text-nexus-muted hover:text-nexus-text">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            {(["nlp", "dl"] as Domain[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDomain(d);
                  setTopic("");
                  setLinkedModuleId("");
                }}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  domain === d
                    ? "border-nexus-accent bg-nexus-accent/10 text-nexus-accent"
                    : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                }`}
              >
                {d === "nlp" ? "NLP" : "Deep Learning"}
              </button>
            ))}
          </div>

          <select
            value={topic}
            onChange={(e) => {
              const name = e.target.value;
              setTopic(name);
              setLinkedModuleId(topicOptions.find((t) => t.name === name)?.default_module_id ?? "");
            }}
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim"
          >
            <option value="">Select a topic…</option>
            {topicOptions.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          {topic && (
            <label className="flex items-center gap-2 text-xs text-nexus-muted">
              <input
                type="checkbox"
                checked={!!linkedModuleId}
                onChange={(e) => setLinkedModuleId(e.target.checked ? selectedTopicDefault ?? "" : "")}
                disabled={!selectedTopicDefault}
              />
              Link this doubt to its lab{selectedTopicDefault ? "" : " (no matching lab for this topic)"}
            </label>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={'e.g. "I don\'t understand how this CYK table is constructed"'}
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe what you're stuck on…"
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim resize-none"
          />

          {error && <p className="text-xs text-nexus-bad">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-nexus-accent py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Posting…" : "Post Doubt"}
          </button>
        </div>
      </div>
    </div>
  );
}
