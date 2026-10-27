import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchActivationCurve, fetchActivationPoint, type CurveActivation } from "../../services/api";
import { nexusVar } from "../../utils/theme";

const ACTIVATIONS: { id: CurveActivation; label: string }[] = [
  { id: "sigmoid", label: "Sigmoid" },
  { id: "tanh", label: "Tanh" },
  { id: "relu", label: "ReLU" },
  { id: "leaky_relu", label: "Leaky ReLU" },
];

const Z_MIN = -10;
const Z_MAX = 10;

// The curve is fetched once per activation choice — it's the function's
// whole shape and doesn't depend on the slider. The marked point (and its
// real derivative, i.e. the curve's slope right there) is re-fetched as
// the student drags the slider, lightly debounced so dragging doesn't
// spam the backend with a request per pixel.
export default function ActivationVisualizer() {
  const [activation, setActivation] = useState<CurveActivation>("sigmoid");
  const [z, setZ] = useState(0);
  const [curve, setCurve] = useState<{ z: number; y: number }[]>([]);
  const [point, setPoint] = useState<{ y: number; derivative: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActivationCurve(activation, Z_MIN, Z_MAX, 200)
      .then((res) => {
        if (!cancelled) setCurve(res.points);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the backend.");
      });
    return () => {
      cancelled = true;
    };
  }, [activation]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchActivationPoint(activation, z)
        .then((res) => {
          if (!cancelled) setPoint({ y: res.y, derivative: res.derivative });
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't reach the backend.");
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activation, z]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ACTIVATIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => setActivation(a.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              activation === a.id
                ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                : "border-nexus-border text-nexus-muted hover:text-nexus-text"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} />
              <XAxis dataKey="z" type="number" domain={[Z_MIN, Z_MAX]} tick={{ fontSize: 11, fill: nexusVar("muted") }} />
              <YAxis tick={{ fontSize: 11, fill: nexusVar("muted") }} />
              <Tooltip
                contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
                labelStyle={{ color: nexusVar("muted") }}
                formatter={(value: number) => value.toFixed(4)}
                labelFormatter={(z: number) => `z = ${z.toFixed(2)}`}
              />
              <Line type="monotone" dataKey="y" stroke={nexusVar("accent")} strokeWidth={2} dot={false} isAnimationActive={false} />
              {point && <ReferenceDot x={z} y={point.y} r={5} fill={nexusVar("yellow")} stroke="none" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-nexus-muted">Adjustable input z</label>
          <span className="text-xs font-mono text-nexus-data">{z.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={Z_MIN}
          max={Z_MAX}
          step={0.05}
          value={z}
          onChange={(e) => setZ(Number(e.target.value))}
          className="w-full accent-nexus-accent"
        />
      </div>

      {point && (
        <div className="flex flex-wrap gap-4 text-sm rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-3">
          <div>
            <span className="text-nexus-muted">{activation}({z.toFixed(2)}) = </span>
            <span className="font-mono text-nexus-good font-semibold">{point.y.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-nexus-muted">slope at this point (derivative) = </span>
            <span className="font-mono text-nexus-data">{point.derivative.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
