import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeTfidf, type TfidfResponse } from "../services/api";

const DEFAULT_DOCS = ["I love NLP", "I love AI", "NLP is interesting"];

export default function TfidfLab() {
  const [docs, setDocs] = useState(DEFAULT_DOCS);
  const [result, setResult] = useState<TfidfResponse | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDoc = (i: number, value: string) => {
    setDocs((d) => d.map((doc, idx) => (idx === i ? value : doc)));
  };

  const run = async () => {
    const nonEmpty = docs.filter((d) => d.trim());
    if (nonEmpty.length === 0) return;
    setLoading(true);
    setError(null);
    setSelectedTerm(null);
    try {
      setResult(await computeTfidf(nonEmpty));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRow = result?.matrix.find((r) => r.term === selectedTerm);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {docs.map((doc, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-nexus-muted w-14 shrink-0">Doc {i + 1}</span>
            <input
              value={doc}
              onChange={(e) => updateDoc(i, e.target.value)}
              className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            />
          </div>
        ))}
        <button
          onClick={() => setDocs((d) => [...d, ""])}
          className="text-xs text-nexus-accent hover:underline"
        >
          + Add document
        </button>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Calculate TF-IDF
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-nexus-border">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-nexus-border bg-nexus-surfaceAlt">
                  <th className="text-left px-3 py-2">Term</th>
                  {result.documents.map((_, i) => (
                    <th key={i} className="text-right px-3 py-2">Doc {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.matrix.map((row) => (
                  <tr
                    key={row.term}
                    onClick={() => setSelectedTerm(row.term)}
                    className={`border-b border-nexus-border cursor-pointer hover:bg-nexus-surfaceAlt ${
                      selectedTerm === row.term ? "bg-nexus-accent/10" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 text-nexus-data">{row.term}</td>
                    {row.per_doc.map((d) => (
                      <td key={d.doc_index} className="text-right px-3 py-1.5 text-nexus-muted">
                        {d.tfidf.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedRow && (
            <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 text-xs font-mono text-nexus-muted space-y-1">
              <p className="text-nexus-text font-sans font-medium mb-1">"{selectedRow.term}"</p>
              <div>DF (documents containing term) = {selectedRow.df}</div>
              <div>IDF = ln(N / (1+DF)) + 1 = {selectedRow.idf.toFixed(4)}</div>
              {selectedRow.per_doc.map((d) => (
                <div key={d.doc_index}>
                  Doc {d.doc_index + 1}: TF = {d.tf.toFixed(3)} → TF-IDF = {d.tf.toFixed(3)} × {selectedRow.idf.toFixed(3)} = {d.tfidf.toFixed(4)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
