import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Decoration, EditorView } from "@codemirror/view";

import { useThemeStore } from "../../store/themeStore";

interface Props {
  value: string;
  onChange: (value: string) => void;
  activeLine: number | null;
  errorLine: number | null;
  readOnly?: boolean;
  onLineClick?: (line: number, lineText: string) => void;
}

// A real, editable Python code editor (CodeMirror 6) -- not a static
// code block. Syntax highlighting, line numbers, current-line
// highlighting, and indentation support all come from CodeMirror itself;
// the two custom decorations below (the "execution" line and the "error"
// line) are the only project-specific additions, and both are driven by
// genuine data from a real run (a real traced line number via
// sys._getframe/traceback on the backend), never a scripted position.
function buildLineDecorations(activeLine: number | null, errorLine: number | null) {
  return EditorView.decorations.compute([], (state) => {
    const target = errorLine != null ? { line: errorLine, cls: "cm-nerlab-errorLine" } : activeLine != null ? { line: activeLine, cls: "cm-nerlab-activeLine" } : null;
    if (!target || target.line < 1 || target.line > state.doc.lines) return Decoration.none;
    const lineObj = state.doc.line(target.line);
    return Decoration.set([Decoration.line({ attributes: { class: target.cls } }).range(lineObj.from)]);
  });
}

const execLineTheme = EditorView.theme({
  ".cm-nerlab-activeLine": {
    backgroundColor: "rgb(var(--nexus-accent) / 0.16)",
    borderLeft: "3px solid rgb(var(--nexus-accent) / 0.8)",
  },
  ".cm-nerlab-errorLine": {
    backgroundColor: "rgb(var(--nexus-bad) / 0.14)",
    borderLeft: "3px solid rgb(var(--nexus-bad) / 0.85)",
  },
  "&": {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
});

export default function NerPlaygroundEditor({ value, onChange, activeLine, errorLine, readOnly, onLineClick }: Props) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const onLineClickRef = useRef(onLineClick);
  onLineClickRef.current = onLineClick;

  // Built once -- reads the latest callback via the ref above, so it
  // never needs to be in the extensions dependency array (which would
  // otherwise force a reconfigure on every render).
  const clickHandler = useMemo(
    () =>
      EditorView.domEventHandlers({
        mousedown(event, view) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null || !onLineClickRef.current) return;
          const line = view.state.doc.lineAt(pos);
          onLineClickRef.current(line.number, line.text);
        },
      }),
    []
  );

  // @uiw/react-codemirror reconfigures the editor in place whenever this
  // array's identity changes (see its useCodeMirror hook -- it dispatches
  // StateEffect.reconfigure, never tearing down the document/undo
  // history), so swapping in a fresh decoration extension on every
  // activeLine/errorLine change is cheap and safe.
  const extensions = useMemo(
    () => [python(), execLineTheme, buildLineDecorations(activeLine, errorLine), clickHandler],
    [activeLine, errorLine, clickHandler]
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={resolvedTheme}
      height="320px"
      readOnly={readOnly}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: false,
        autocompletion: false,
        tabSize: 4,
      }}
    />
  );
}
