import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, Copy, Eraser, Play, RefreshCw, RotateCcw, Shield, Square, Tag } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { runNerPlayground, type NerEngine, type NerPlaygroundRunResponse } from "../services/api";
import Reveal from "../components/Reveal";
import NerPlaygroundEditor from "../components/nerlab/NerPlaygroundEditor";
import NerPlaygroundOutputPanel, { type OutputTab } from "../components/nerlab/NerPlaygroundOutputPanel";
import NerPlaygroundHelp from "../components/nerlab/NerPlaygroundHelp";
import EntityHighlightedText from "../components/nerlab/EntityHighlightedText";
import { describeLine } from "../components/nerlab/codeLineInfo";
import { DEFAULT_EXPERIMENT, PLAYGROUND_EXPERIMENTS } from "../components/nerlab/nerPlaygroundExperiments";

const MAX_CODE_CHARS = 8_000;
const MAX_TEXT_CHARS = 2_000;
const REPLAY_STEP_MS = 180;

const ENGINES: { id: NerEngine; label: string }[] = [
  { id: "rule_based", label: "Rule-based (default)" },
  { id: "spacy", label: "spaCy (pretrained model)" },
];


// "Inside the NER Lab" -- a real, interactive coding environment: write
// Python, run it against the project's own NER engine in an isolated
// sandboxed process, and see the actual output change as the code
// changes. Replaces the earlier video-showcase version of this page
// (the video/4-stage-pipeline components still exist on disk but are no
// longer referenced here, per the explicit "this is NOT a video
// showcase" instruction this feature was built against).
export default function NerLab() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [code, setCode] = useState(DEFAULT_EXPERIMENT.code);
  const [inputText, setInputText] = useState(DEFAULT_EXPERIMENT.text);
  const [experimentId, setExperimentId] = useState(DEFAULT_EXPERIMENT.id);
  const [engine, setEngine] = useState<NerEngine>("rule_based");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<NerPlaygroundRunResponse | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [visibleEventCount, setVisibleEventCount] = useState(0);
  const [activeTab, setActiveTab] = useState<OutputTab>("console");
  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number | null>(null);
  const [lineInfo, setLineInfo] = useState<{ line: number; description: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const visibleEvents = useMemo(() => result?.events.slice(0, visibleEventCount) ?? [], [result, visibleEventCount]);
  const lastVisibleEvent = visibleEvents[visibleEvents.length - 1] ?? null;
  const activeLine = lastVisibleEvent && lastVisibleEvent.kind !== "error" ? lastVisibleEvent.line : null;
  const errorLine = lastVisibleEvent && lastVisibleEvent.kind === "error" ? lastVisibleEvent.line : null;

  const startReplay = (events: NerPlaygroundRunResponse["events"], instant: boolean) => {
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    if (instant || events.length <= 1) {
      setVisibleEventCount(events.length);
      return;
    }
    let i = 1;
    setVisibleEventCount(1);
    replayTimerRef.current = setInterval(() => {
      i += 1;
      setVisibleEventCount(i);
      if (i >= events.length && replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    }, REPLAY_STEP_MS);
  };

  const handleRun = async () => {
    if (running) return;
    setValidationError(null);
    if (!code.trim()) {
      setValidationError("Write some code before running.");
      return;
    }
    if (!inputText.trim()) {
      setValidationError("Enter some input text before running.");
      return;
    }
    if (code.length > MAX_CODE_CHARS) {
      setValidationError(`Code must be ${MAX_CODE_CHARS.toLocaleString()} characters or fewer.`);
      return;
    }
    if (inputText.length > MAX_TEXT_CHARS) {
      setValidationError(`Input text must be ${MAX_TEXT_CHARS.toLocaleString()} characters or fewer.`);
      return;
    }

    setTransportError(null);
    setResult(null);
    setSelectedEntityIndex(null);
    setLineInfo(null);
    setVisibleEventCount(0);
    setActiveTab("console");
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await runNerPlayground(code, inputText, engine, controller.signal);
      setResult(res);
      startReplay(res.events, Boolean(reduceMotion));
    } catch (err) {
      if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === "ERR_CANCELED")) {
        // User pressed Stop -- not a real error, nothing to show.
      } else if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
        setTransportError(err.response.data.detail);
      } else {
        setTransportError("Couldn't reach the backend. Is it running?");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleReplay = () => {
    if (!result) return;
    startReplay(result.events, false);
  };

  const handleResetStarter = () => {
    const exp = PLAYGROUND_EXPERIMENTS.find((e) => e.id === experimentId) ?? DEFAULT_EXPERIMENT;
    setCode(exp.code);
    setInputText(exp.text);
    handleClearOutput();
  };

  const handleClearOutput = () => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setResult(null);
    setTransportError(null);
    setValidationError(null);
    setVisibleEventCount(0);
    setSelectedEntityIndex(null);
    setLineInfo(null);
  };

  const loadExperiment = (id: string) => {
    const exp = PLAYGROUND_EXPERIMENTS.find((e) => e.id === id);
    if (!exp) return;
    setExperimentId(exp.id);
    setCode(exp.code);
    setInputText(exp.text);
    handleClearOutput();
  };

  const handleLineClick = (line: number, text: string) => {
    setLineInfo({ line, description: describeLine(text) });
  };

  const copyCode = () => navigator.clipboard?.writeText(code).catch(() => {});
  const copyResults = () => {
    if (!result) return;
    navigator.clipboard
      ?.writeText(JSON.stringify({ engine: result.engine, elapsed_ms: result.elapsed_ms, entities: result.entities, stdout: result.stdout }, null, 2))
      .catch(() => {});
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-surface px-3 py-1 text-xs text-nexus-muted">
            <Tag size={12} className="text-nexus-accent" /> NER Code Playground
          </div>
          <h1 className="text-3xl font-display font-semibold">Inside the NER Lab</h1>
          <p className="text-nexus-text text-sm sm:text-base font-medium">
            Write the code. Run the model. See every result come to life.
          </p>
          <p className="text-nexus-muted text-sm max-w-xl">
            Experiment with Named Entity Recognition by editing Python code and observing how your text is
            transformed into structured entity predictions — real execution, against this project's own NER engine,
            every time you press Run.
          </p>
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-2">
        {PLAYGROUND_EXPERIMENTS.map((exp) => (
          <button
            key={exp.id}
            onClick={() => loadExperiment(exp.id)}
            title={exp.description}
            className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
              experimentId === exp.id
                ? "bg-nexus-accent/20 border-nexus-accent/50 text-nexus-accent font-medium"
                : "bg-nexus-surface border-nexus-border text-nexus-muted hover:border-nexus-accent/30"
            }`}
          >
            {exp.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel A: Code Editor */}
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-3 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-nexus-text">Code Editor</p>
            <div className="flex gap-1">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEngine(e.id)}
                  className={`text-[10px] rounded px-2 py-1 border transition-colors ${
                    engine === e.id
                      ? "bg-nexus-accent/20 border-nexus-accent/50 text-nexus-accent"
                      : "bg-nexus-bg border-nexus-border text-nexus-muted hover:border-nexus-accent/30"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <NerPlaygroundEditor
            value={code}
            onChange={setCode}
            activeLine={activeLine}
            errorLine={errorLine}
            readOnly={running}
            onLineClick={handleLineClick}
          />

          {lineInfo && (
            <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2 text-[11px] text-nexus-muted">
              <span className="font-semibold text-nexus-text">Line {lineInfo.line}:</span> {lineInfo.description}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!running ? (
              <button
                onClick={handleRun}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-xs font-semibold text-white hover:bg-nexus-accent/90 transition-colors"
              >
                <Play size={13} /> Run Code
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-bad px-4 py-2 text-xs font-semibold text-white hover:bg-nexus-bad/90 transition-colors"
              >
                <Square size={13} /> Stop
              </button>
            )}
            <button
              onClick={handleResetStarter}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-accent/30 hover:text-nexus-text transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={handleClearOutput}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-bad/40 hover:text-nexus-bad transition-colors"
            >
              <Eraser size={12} /> Clear Output
            </button>
            {result && !running && (
              <button
                onClick={handleReplay}
                className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-accent/30 hover:text-nexus-text transition-colors"
              >
                <RefreshCw size={12} /> Replay
              </button>
            )}
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-accent/30 hover:text-nexus-text transition-colors ml-auto"
            >
              <Copy size={12} /> Copy code
            </button>
          </div>

          {validationError && <p className="text-xs text-nexus-bad">{validationError}</p>}
          {transportError && <p className="text-xs text-nexus-bad">{transportError}</p>}

          <p className="text-[10px] text-nexus-muted/80 inline-flex items-start gap-1.5">
            <Shield size={11} className="shrink-0 mt-0.5" />
            Your code runs in an isolated, locked-down process on the server — no filesystem, no network, no access
            to this site's data or other users' code.
          </p>
        </div>

        {/* Panel B: Live Text and Entity Mapping */}
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-3 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-nexus-text">Live Text &amp; Entity Mapping</p>
            {result && (
              <button
                onClick={copyResults}
                className="inline-flex items-center gap-1 text-[10px] text-nexus-muted hover:text-nexus-accent"
              >
                <Copy size={10} /> Copy results
              </button>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            maxLength={MAX_TEXT_CHARS}
            placeholder="Enter a sentence or paragraph with names, places, dates…"
            className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
          <p className="text-[10px] text-nexus-muted text-right">
            {inputText.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()}
          </p>
          <div className="flex-1">
            {result ? (
              <EntityHighlightedText
                text={inputText}
                entities={result.entities}
                selectedIndex={selectedEntityIndex}
                onSelect={setSelectedEntityIndex}
                compact
              />
            ) : (
              <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-3 text-xs text-nexus-muted italic">
                Run your code to see entities highlighted in this text.
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Execution Output */}
        <NerPlaygroundOutputPanel
          result={result}
          running={running}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          visibleEventCount={visibleEventCount}
          inputText={inputText}
          selectedEntityIndex={selectedEntityIndex}
          onSelectEntity={setSelectedEntityIndex}
        />
      </div>

      <NerPlaygroundHelp />

      <p className="text-xs text-nexus-muted text-center">
        Prefer a simpler, no-code demo?{" "}
        <button onClick={() => navigate("/applications?app=ner")} className="text-nexus-accent hover:underline inline-flex items-center gap-1">
          Try the NER tool <ArrowRight size={11} />
        </button>
      </p>
    </div>
  );
}
