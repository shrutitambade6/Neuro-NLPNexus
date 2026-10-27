import { useEffect, useState } from "react";

import { checkHealth } from "../services/api";
import { useApiDiagnosticsStore } from "../store/apiDiagnosticsStore";
import { useApiStatusStore } from "../store/apiStatusStore";

/**
 * Dev-only API diagnostics panel.
 *
 * Added while debugging a real "Couldn't reach the backend" report on Sign
 * Up — the point of this panel is to make it immediately visible WHICH leg
 * of the chain is failing (frontend -> backend, vs backend -> database),
 * instead of every failure collapsing into one generic red banner. It
 * mirrors exactly what the frontend's own axios interceptors + the
 * backend's own /api/health endpoint already know; it adds no new network
 * calls beyond a periodic health poll (shared with TopBar's existing
 * indicator — this does not duplicate that poll's cadence, it just also
 * reads the DB field TopBar doesn't show).
 *
 * Gated by TWO things, both required: `import.meta.env.DEV` (never ships
 * in a production build) AND the explicit opt-in flag
 * `VITE_SHOW_API_DIAGNOSTICS` (see .env.example — default/unset is
 * treated as off). A dev build with no .env override stays silent; a
 * developer who wants the panel back sets
 * VITE_SHOW_API_DIAGNOSTICS=true in their own .env and restarts the dev
 * server. This keeps internal request paths/backend host/DB status off a
 * normal student's screen even if someone runs a dev build without
 * knowing this panel exists.
 */
export default function ApiDiagnosticsPanel() {
  const backendUp = useApiStatusStore((s) => s.backendUp);
  const entries = useApiDiagnosticsStore((s) => s.entries);
  const databaseStatus = useApiDiagnosticsStore((s) => s.databaseStatus);
  const setDatabaseStatus = useApiDiagnosticsStore((s) => s.setDatabaseStatus);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      checkHealth()
        .then((data) => {
          if (!cancelled) setDatabaseStatus(data.database);
        })
        .catch(() => {
          if (!cancelled) setDatabaseStatus("unreachable");
        });
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!import.meta.env.DEV || import.meta.env.VITE_SHOW_API_DIAGNOSTICS !== "true") return null;

  const apiLabel = `${window.location.origin}/api  →  http://localhost:8000`;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 w-80 rounded-lg border border-nexus-border bg-nexus-surface/95 shadow-lg backdrop-blur text-xs font-mono text-nexus-text"
      style={{ maxHeight: collapsed ? "auto" : "60vh" }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-1.5 border-b border-nexus-border text-nexus-muted hover:text-nexus-text"
      >
        <span>🔧 API Diagnostics (dev only)</span>
        <span>{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && (
        <div className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(60vh - 2rem)" }}>
          <div>
            API: <span className="text-nexus-muted">{apiLabel}</span>
          </div>
          <div>
            Status:{" "}
            {backendUp === null && <span className="text-nexus-muted">Checking…</span>}
            {backendUp === true && <span className="text-nexus-good">Connected</span>}
            {backendUp === false && <span className="text-nexus-bad">Offline</span>}
          </div>
          <div>
            Database:{" "}
            {databaseStatus === "connected" ? (
              <span className="text-nexus-good">Connected</span>
            ) : databaseStatus === "unknown" ? (
              <span className="text-nexus-muted">Unknown</span>
            ) : (
              <span className="text-nexus-bad">{databaseStatus}</span>
            )}
          </div>
          <div className="pt-1 border-t border-nexus-border mt-1">
            {entries.length === 0 && (
              <div className="text-nexus-muted">No requests yet.</div>
            )}
            {entries.map((e) => (
              <div key={e.id} className={e.ok ? "text-nexus-text" : "text-nexus-bad"}>
                {e.method} {e.path}
                <br />
                {e.ok ? `Response: ${e.status}` : `Error: ${e.status}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
