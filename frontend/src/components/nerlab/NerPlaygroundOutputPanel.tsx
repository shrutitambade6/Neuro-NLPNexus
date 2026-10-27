import { Fragment } from "react";
import { AlertTriangle, Clock, Copy, Terminal } from "lucide-react";

import type { NerPlaygroundRunResponse } from "../../services/api";
import { entityColor } from "../applications/nerColors";
import EntityHighlightedText from "./EntityHighlightedText";

export type OutputTab = "console" | "entities" | "highlighted" | "json";

interface Props {
  result: NerPlaygroundRunResponse | null;
  running: boolean;
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
  visibleEventCount: number;
  inputText: string;
  selectedEntityIndex: number | null;
  onSelectEntity: (i: number) => void;
}

const TABS: { id: OutputTab; label: string }[] = [
  { id: "console", label: "Console" },
  { id: "entities", label: "Entities" },
  { id: "highlighted", label: "Highlighted Text" },
  { id: "json", label: "JSON Output" },
];

function StatusBadge({ result, running }: { result: NerPlaygroundRunResponse | null; running: boolean }) {
  if (running) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] rounded-full px-2 py-0.5 border border-nexus-accent/40 bg-nexus-accent/10 text-nexus-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-nexus-accent animate-pulse" /> Running
      </span>
    );
  }
  if (!result) {
    return (
      <span className="text-[11px] rounded-full px-2 py-0.5 border border-nexus-border text-nexus-muted">Idle</span>
    );
  }
  const map: Record<string, string> = {
    ok: "border-nexus-good/40 bg-nexus-good/10 text-nexus-good",
    error: "border-nexus-bad/40 bg-nexus-bad/10 text-nexus-bad",
    timeout: "border-nexus-warn/40 bg-nexus-warn/10 text-nexus-warn",
    memory_exceeded: "border-nexus-warn/40 bg-nexus-warn/10 text-nexus-warn",
  };
  const text: Record<string, string> = {
    ok: "Completed",
    error: "Error",
    timeout: "Timed out",
    memory_exceeded: "Memory limit hit",
  };
  return (
    <span className={`text-[11px] rounded-full px-2 py-0.5 border ${map[result.status]}`}>{text[result.status]}</span>
  );
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function NerPlaygroundOutputPanel({
  result,
  running,
  activeTab,
  onTabChange,
  visibleEventCount,
  inputText,
  selectedEntityIndex,
  onSelectEntity,
}: Props) {
  const events = result?.events.slice(0, visibleEventCount) ?? [];

  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface flex flex-col h-full min-h-[320px]">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 flex-wrap">
        <div className="flex gap-1 rounded-lg border border-nexus-border p-0.5 text-xs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`rounded px-2 py-1 transition-colors whitespace-nowrap ${
                activeTab === t.id ? "bg-nexus-accent/20 text-nexus-accent" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {result && typeof result.elapsed_ms === "number" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-nexus-muted">
              <Clock size={10} /> {result.elapsed_ms}ms
            </span>
          )}
          <StatusBadge result={result} running={running} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "console" && (
          <ConsoleTab result={result} running={running} events={events} />
        )}
        {activeTab === "entities" && (
          <EntitiesTab result={result} selectedEntityIndex={selectedEntityIndex} onSelectEntity={onSelectEntity} />
        )}
        {activeTab === "highlighted" && (
          <HighlightedTab result={result} inputText={inputText} selectedEntityIndex={selectedEntityIndex} onSelectEntity={onSelectEntity} />
        )}
        {activeTab === "json" && (
          <JsonTab result={result} selectedEntityIndex={selectedEntityIndex} onSelectEntity={onSelectEntity} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-xs text-nexus-muted italic p-2">{label}</p>;
}

function ConsoleTab({
  result,
  running,
  events,
}: {
  result: NerPlaygroundRunResponse | null;
  running: boolean;
  events: NerPlaygroundRunResponse["events"];
}) {
  if (running && !result) return <EmptyState label="Running your code…" />;
  if (!result) return <EmptyState label="Press Run to see console output here." />;

  const EVENT_ICON: Record<string, string> = {
    started: "▸",
    nlp_called: "⚙",
    nlp_result: "✓",
    print: "›",
    completed: "●",
    error: "✗",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-nexus-muted uppercase tracking-wider flex items-center gap-1.5">
          <Terminal size={11} /> Real execution events -- stage-level, not line-by-line tracing
        </p>
        {result.stdout && (
          <button
            onClick={() => copy(result.stdout)}
            className="inline-flex items-center gap-1 text-[10px] text-nexus-muted hover:text-nexus-accent"
          >
            <Copy size={10} /> Copy output
          </button>
        )}
      </div>
      <div className="rounded-lg bg-nexus-bg border border-nexus-border p-3 font-mono text-xs space-y-1 max-h-72 overflow-auto">
        {events.length === 0 ? (
          <span className="text-nexus-muted italic">No events yet.</span>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${
                ev.kind === "error" ? "text-nexus-bad" : ev.kind === "print" ? "text-nexus-text" : "text-nexus-muted"
              }`}
            >
              <span className="shrink-0 w-4 text-center">{EVENT_ICON[ev.kind] ?? "•"}</span>
              <span className="flex-1 whitespace-pre-wrap break-words">
                {ev.kind === "print" ? (
                  ev.detail
                ) : (
                  <Fragment>
                    <span className="opacity-70">{ev.kind}</span>
                    {ev.detail ? <span> — {ev.detail}</span> : null}
                    {ev.line != null ? <span className="opacity-50"> (line {ev.line})</span> : null}
                  </Fragment>
                )}
              </span>
            </div>
          ))
        )}
      </div>
      {result.status === "error" && result.error && (
        <div className="rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">{result.error.type}</span>: {result.error.message}
            {result.error.line != null ? ` (line ${result.error.line})` : ""}
          </span>
        </div>
      )}
      {result.status === "timeout" && (
        <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-3 py-2 text-xs text-nexus-warn">
          Execution took too long and was stopped. Check for an infinite loop.
        </div>
      )}
      {result.status === "memory_exceeded" && (
        <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-3 py-2 text-xs text-nexus-warn">
          Execution used too much memory and was stopped.
        </div>
      )}
      {result.stdout_truncated && (
        <p className="text-[10px] text-nexus-muted italic">Output was truncated at 20,000 characters.</p>
      )}
    </div>
  );
}

function EntitiesTab({
  result,
  selectedEntityIndex,
  onSelectEntity,
}: {
  result: NerPlaygroundRunResponse | null;
  selectedEntityIndex: number | null;
  onSelectEntity: (i: number) => void;
}) {
  if (!result) return <EmptyState label="Press Run to see detected entities here." />;
  if (result.status !== "ok" && result.entities.length === 0) {
    return <EmptyState label="No entities to show -- the run didn't complete successfully." />;
  }
  if (result.entities.length === 0) {
    return <EmptyState label="The model found no entities in this text -- that's a real result, not a failed request." />;
  }
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-nexus-muted mb-1">
        What the model detected on this run (independent of any filtering your own code applied -- see Console for
        exactly what your code printed).
      </p>
      {result.entities.map((e, i) => (
        <button
          key={i}
          onClick={() => onSelectEntity(i)}
          className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
            selectedEntityIndex === i ? "border-nexus-accent bg-nexus-accent/10" : "border-nexus-border hover:border-nexus-accent/30"
          }`}
        >
          <span className="font-medium text-nexus-text">{e.text}</span>
          <span className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-2 py-0.5 border text-[10px] ${entityColor(e.label)}`}>{e.label}</span>
            <span className="text-nexus-muted">{e.start}–{e.end}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function HighlightedTab({
  result,
  inputText,
  selectedEntityIndex,
  onSelectEntity,
}: {
  result: NerPlaygroundRunResponse | null;
  inputText: string;
  selectedEntityIndex: number | null;
  onSelectEntity: (i: number) => void;
}) {
  if (!result) return <EmptyState label="Press Run to see your text with entities highlighted." />;
  return (
    <EntityHighlightedText
      text={inputText}
      entities={result.entities}
      selectedIndex={selectedEntityIndex}
      onSelect={onSelectEntity}
    />
  );
}

function JsonTab({
  result,
  selectedEntityIndex,
  onSelectEntity,
}: {
  result: NerPlaygroundRunResponse | null;
  selectedEntityIndex: number | null;
  onSelectEntity: (i: number) => void;
}) {
  if (!result) return <EmptyState label="Press Run to see structured JSON output here." />;
  const blob = { engine: result.engine, elapsed_ms: result.elapsed_ms, entities: result.entities };
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={() => copy(JSON.stringify(blob, null, 2))}
          className="inline-flex items-center gap-1 text-[10px] text-nexus-muted hover:text-nexus-accent"
        >
          <Copy size={10} /> Copy JSON
        </button>
      </div>
      <pre className="rounded-lg bg-nexus-bg border border-nexus-border p-3 font-mono text-[11px] overflow-auto">
        {"{\n"}
        {"  "}"engine": "{blob.engine}",{"\n"}
        {"  "}"elapsed_ms": {blob.elapsed_ms},{"\n"}
        {"  "}"entities": [{"\n"}
        {blob.entities.map((e, i) => (
          <button
            key={i}
            onClick={() => onSelectEntity(i)}
            className={`block w-full text-left rounded px-1 -mx-1 ${
              selectedEntityIndex === i ? "bg-nexus-accent/15 ring-1 ring-nexus-accent/50" : "hover:bg-nexus-surfaceAlt"
            }`}
          >
            {"    {"} "text": {JSON.stringify(e.text)}, "label": {JSON.stringify(e.label)}, "start": {e.start}, "end": {e.end} {"}"}
            {i < blob.entities.length - 1 ? "," : ""}
          </button>
        ))}
        {"  ]\n"}
        {"}"}
      </pre>
      {blob.entities.length === 0 && <p className="text-[10px] text-nexus-muted italic">entities: [] -- no entities detected.</p>}
    </div>
  );
}
