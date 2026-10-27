import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { fetchSupportedLanguages, translateText, type TranslateResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";

export default function TranslationDemo() {
  const [languages, setLanguages] = useState<Record<string, string>>({});
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("hi");
  const [text, setText] = useState("How are you today?");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupportedLanguages()
      .then(setLanguages)
      .catch(() => setLanguages({ en: "English", hi: "Hindi", mr: "Marathi", fr: "French", es: "Spanish", de: "German" }));
  }, []);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await translateText(text, source, target));
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const langOptions = Object.entries(languages);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="text-xs text-nexus-muted block mb-1">From</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm"
          >
            {langOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <ArrowRight size={14} className="text-nexus-muted mt-4" />
        <div>
          <label className="text-xs text-nexus-muted block mb-1">To</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm"
          >
            {langOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Enter text…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <RunButton onClick={run} loading={loading} label="Translate" disabled={source === target} />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-2">
          <div>
            <p className="text-xs text-nexus-muted">{result.source_lang_name}</p>
            <p className="text-sm">{result.original_text}</p>
          </div>
          <div className="h-px bg-nexus-border" />
          <div>
            <p className="text-xs text-nexus-muted">{result.target_lang_name}</p>
            <p className="text-sm font-medium">{result.translated_text}</p>
          </div>
          <p className="text-[11px] text-nexus-muted/80 italic pt-1">Via {result.service}.</p>
        </div>
      )}
    </div>
  );
}
