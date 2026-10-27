import { useState } from "react";
import { Search, Trash2, X } from "lucide-react";

interface Triple {
  id: string;
  subject: string;
  relation: string;
  object: string;
}

const SEED: Triple[] = [
  { id: "t1", subject: "Riya", relation: "studies", object: "NLP" },
  { id: "t2", subject: "NLP", relation: "branch of", object: "AI" },
  { id: "t3", subject: "AI", relation: "field of", object: "Computer Science" },
];

export default function KnowledgeGraphLab() {
  const [triples, setTriples] = useState<Triple[]>(SEED);
  const [subject, setSubject] = useState("");
  const [relation, setRelation] = useState("");
  const [object, setObject] = useState("");
  const [search, setSearch] = useState("");

  const addFact = () => {
    if (!subject.trim() || !relation.trim() || !object.trim()) return;
    setTriples((prev) => [...prev, { id: `t${Date.now()}`, subject, relation, object }]);
    setSubject("");
    setRelation("");
    setObject("");
  };

  const removeFact = (id: string) => setTriples((prev) => prev.filter((t) => t.id !== id));

  const nodes = Array.from(new Set(triples.flatMap((t) => [t.subject, t.object])));
  const matchesSearch = (node: string) => !search.trim() || node.toLowerCase().includes(search.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <p className="text-xs text-nexus-muted">
        This graph lives only in your current browser session — it isn't
        saved to the database yet (that's planned for when authentication
        and persistence ship), so refreshing the page resets it to the seed facts.
      </p>

      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g. Riya)"
            className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm"
          />
          <input
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            placeholder="Relation (e.g. studies)"
            className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm"
          />
          <input
            value={object}
            onChange={(e) => setObject(e.target.value)}
            placeholder="Object (e.g. NLP)"
            className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={addFact}
          className="rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90"
        >
          Add fact
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Search size={14} className="text-nexus-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a node to highlight…"
          className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
        {triples.length === 0 && <p className="text-sm text-nexus-muted">No facts yet — add one above.</p>}
        {triples.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-mono ${
              matchesSearch(t.subject) || matchesSearch(t.object) ? "bg-nexus-data/10" : "bg-nexus-bg"
            }`}
          >
            <span>
              <span className="text-nexus-text">{t.subject}</span>{" "}
              <span className="text-nexus-accent">→ {t.relation} →</span>{" "}
              <span className="text-nexus-text">{t.object}</span>
            </span>
            <button onClick={() => removeFact(t.id)} className="text-nexus-muted hover:text-nexus-bad">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {nodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nodes.map((n) => (
            <span
              key={n}
              className={`rounded-full px-3 py-1 text-xs border ${
                matchesSearch(n)
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                  : "border-nexus-border text-nexus-muted"
              }`}
            >
              {n}
            </span>
          ))}
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-nexus-muted flex items-center gap-1">
              <X size={12} /> clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
