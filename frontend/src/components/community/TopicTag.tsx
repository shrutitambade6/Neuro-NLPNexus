import type { Domain } from "../../services/api";
import { DOMAIN_ACCENT } from "../../utils/communityCatalog";

export default function TopicTag({ domain, topic }: { domain: Domain; topic: string }) {
  const accent = DOMAIN_ACCENT[domain];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${accent.text} ${accent.bg} ${accent.border}`}>
      {topic}
    </span>
  );
}
