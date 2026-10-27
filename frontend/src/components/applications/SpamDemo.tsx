import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { checkSpam, type SpamResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, MethodNote, RunButton } from "./AppShared";

const CLASS_COLOR: Record<string, string> = {
  Spam: "text-nexus-bad",
  Suspicious: "text-nexus-warn",
  "Likely legitimate": "text-nexus-good",
};

export default function SpamDemo() {
  const [sender, setSender] = useState("unknown@example.com");
  const [subject, setSubject] = useState("Congratulations! You WON a prize!");
  const [message, setMessage] = useState("Click here now to claim your free cash prize. Act now, limited time offer!");
  const [result, setResult] = useState<SpamResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await checkSpam(subject, message, sender));
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt overflow-hidden">
        <div className="grid grid-cols-[80px_1fr] gap-2 px-3 py-2 border-b border-nexus-border text-xs">
          <span className="text-nexus-muted">FROM:</span>
          <input value={sender} onChange={(e) => setSender(e.target.value)} className="bg-transparent focus:outline-none" />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 px-3 py-2 border-b border-nexus-border text-xs">
          <span className="text-nexus-muted">SUBJECT:</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-transparent focus:outline-none" />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none resize-none"
          placeholder="Message body…"
        />
      </div>
      <RunButton onClick={run} loading={loading} label="Analyze Email" />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className={CLASS_COLOR[result.classification] ?? "text-nexus-muted"} />
            <p className={`text-lg font-semibold ${CLASS_COLOR[result.classification] ?? ""}`}>{result.classification}</p>
            <span className="text-xs text-nexus-muted">(score {result.score})</span>
          </div>
          <div>
            <p className="text-xs text-nexus-muted uppercase tracking-wide mb-1.5">Signals detected</p>
            <ul className="space-y-1">
              {result.signals.map((s, i) => (
                <li key={i} className="text-xs text-nexus-muted flex gap-1.5">
                  <span className="text-nexus-accent">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <MethodNote>{result.method_note}</MethodNote>
        </div>
      )}
    </div>
  );
}
