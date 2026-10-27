// Purely decorative, non-interactive book spines that give the shelf some
// visual weight around the one real, interactive book (ShelfSpine.tsx).
// Deliberately muted (nexus-surfaceAlt / nexus-border tokens, never a
// domain accent) so they never compete with the real book for attention —
// section 2's "use accents selectively," applied literally.
interface Props {
  height: number;
  width: number;
  tone: "a" | "b" | "c";
}

const TONE_CLASS: Record<Props["tone"], string> = {
  a: "bg-nexus-surfaceAlt",
  b: "bg-nexus-card",
  c: "bg-nexus-surfaceHover",
};

export default function FillerSpine({ height, width, tone }: Props) {
  return (
    <div className="mx-1 flex flex-col items-center self-end" aria-hidden="true">
      <div
        className={`rounded-t-sm border border-nexus-border/70 ${TONE_CLASS[tone]}`}
        style={{
          width,
          height,
          boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), inset -1px 0 6px rgba(0,0,0,0.3)",
        }}
      />
      <div className="mt-1 h-1.5 rounded-full bg-black/40 blur-sm" style={{ width: width * 0.8 }} />
    </div>
  );
}
