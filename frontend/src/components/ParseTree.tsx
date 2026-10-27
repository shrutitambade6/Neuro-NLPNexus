import { motion } from "framer-motion";

import type { ParseTreeNode } from "../services/api";

function TreeNode({ node }: { node: ParseTreeNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="rounded-lg border border-nexus-accent/50 bg-nexus-accent/10 px-3 py-1.5 text-xs font-mono font-semibold">
        {node.symbol}
      </div>
      {node.word && (
        <div className="mt-1 rounded-md bg-nexus-surfaceAlt px-2 py-1 text-[11px] font-mono text-nexus-data">
          {node.word}
        </div>
      )}
      {node.children.length > 0 && (
        <div className="flex gap-6 mt-3 border-t border-nexus-border pt-3">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function ParseTree({ tree }: { tree: ParseTreeNode }) {
  return (
    <div className="overflow-x-auto py-4">
      <div className="inline-flex justify-center w-full">
        <TreeNode node={tree} />
      </div>
    </div>
  );
}
