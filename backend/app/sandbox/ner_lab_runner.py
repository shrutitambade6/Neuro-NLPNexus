"""
NER Lab Playground — the actual sandboxed process that runs a student's
Python code. This file is invoked as a SEPARATE OS PROCESS (never inline
`exec()`/`eval()` inside the FastAPI server itself — see
app/services/ner_playground_service.py, which spawns it with
`subprocess.Popen([sys.executable, "-I", THIS_FILE], ...)`), with its
environment and working directory deliberately locked down by the caller
before this file ever runs a single line of student code.

Protocol: reads ONE JSON object from stdin --
    {"code": "<student's python>", "text": "<input sentence>", "engine": "rule_based"|"spacy"}
and writes ONE JSON object to stdout, on the LAST line, after any output
the student's own `print()` calls would otherwise have produced (those are
captured into an in-memory buffer and reported as a field, never written to
this process's real stdout -- so the parent never has to disentangle "the
runner's own output" from "the student's output").

What this file does NOT do, on purpose: it does not implement a fully
general Python sandbox. Builtins are reduced to a safe allow-list and
`import` is restricted to a small stdlib allow-list (re, json, collections,
math, string, itertools, statistics) -- this blocks the straightforward
paths to the filesystem, network, subprocess, and environment (no `open`,
no `os`, no `sys` module exposed to student code, no `subprocess`, no
`socket`). It does NOT attempt to block every dynamic-introspection escape
Python's object model allows (e.g. reaching a banned class via
`().__class__.__bases__` style gadget chains) -- doing that properly needs
an AST-rewriting sandbox (e.g. the RestrictedPython library), which this
project does not have installed. The real security boundary here is
PROCESS isolation, applied by the caller: a fresh OS process per run, a
throwaway temp working directory, a stripped environment with no secrets,
a wall-clock timeout, and a soft memory ceiling (see
ner_playground_service.py). That combination is appropriate for this
app's actual scale -- its own authenticated users on a local/dev
deployment -- not a claim of hardened, multi-tenant-internet-grade
isolation. See claude/ner-lab-code-playground.md for the full write-up.
"""
import builtins
import io
import json
import pathlib
import sys
import time
import traceback

# This process is launched with `-I` (isolated mode) by the parent
# (ner_playground_service.py), which deliberately makes Python IGNORE the
# PYTHONPATH environment variable -- that is the whole point of isolated
# mode, and the parent relies on it to keep the sandboxed process from
# inheriting anything from the real server's environment. So rather than
# depend on PYTHONPATH, this file finds the backend's own root directory
# from its OWN file path (app/sandbox/ner_lab_runner.py -> backend/) and
# puts it on sys.path itself, before importing anything project-specific.
_BACKEND_DIR = pathlib.Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Importing the project's REAL NER engine -- this is OUR trusted bootstrap
# code running before any student code executes, not something the
# student's restricted `exec()` call below could do itself (its
# `__import__` is overridden further down to block exactly this import
# path for student code, even though it's on sys.path for US).
from app.algorithms.ner import extract_entities
from app.algorithms.ner_spacy import SpacyUnavailableError, extract_entities_spacy, is_available as spacy_is_available

MAX_STDOUT_CHARS = 20_000
MAX_EVENTS = 500
USER_CODE_FILENAME = "<ner_lab>"

sys.setrecursionlimit(200)  # fail fast and cleanly on runaway recursion


class _Ent:
    """A tiny stand-in for a spaCy `Span` -- just enough surface
    (`.text`, `.label_`, `.start_char`, `.end_char`) for starter code
    written in spaCy's own idiom (`for ent in doc.ents: print(ent.text,
    ent.label_)`) to work unmodified, whichever real engine is selected."""

    def __init__(self, text: str, label: str, start: int, end: int):
        self.text = text
        self.label_ = label
        self.start_char = start
        self.end_char = end

    def __repr__(self) -> str:
        return f"Ent({self.text!r}, {self.label_!r})"


class _Doc:
    """Stand-in for a spaCy `Doc` -- `.text` and `.ents` only."""

    def __init__(self, text: str, ents: list):
        self.text = text
        self.ents = ents


def _run(payload: dict) -> dict:
    code = payload["code"]
    input_text = payload["text"]
    engine = payload.get("engine", "rule_based")

    stdout_buf = io.StringIO()
    events: list[dict] = [{"kind": "started", "line": None, "detail": None}]
    last_doc: dict = {}

    def _record_event(kind: str, line, detail):
        if len(events) < MAX_EVENTS:
            events.append({"kind": kind, "line": line, "detail": detail})

    def nlp(text_arg):
        """The one function injected into the student's namespace that
        touches real NLP inference. Every call is a REAL call into this
        project's own app/algorithms/ner.py (rule_based) or ner_spacy.py
        (spacy) -- never a canned/fabricated result -- and is recorded as
        a real execution event at the real calling line number."""
        caller_line = sys._getframe(1).f_lineno
        _record_event("nlp_called", caller_line, f"engine={engine}")
        t0 = time.monotonic()
        if engine == "spacy":
            if not spacy_is_available():
                raise SpacyUnavailableError(
                    "The spaCy engine isn't available on this server (model not installed)."
                )
            result = extract_entities_spacy(text_arg)
        else:
            result = extract_entities(text_arg)
        elapsed_ms = (time.monotonic() - t0) * 1000
        ents = [_Ent(e["text"], e["label"], e["start"], e["end"]) for e in result["entities"]]
        doc = _Doc(text_arg, ents)
        last_doc["doc"] = doc
        _record_event("nlp_result", caller_line, f"{len(ents)} entit{'y' if len(ents) == 1 else 'ies'} in {elapsed_ms:.0f}ms")
        return doc

    def tracked_print(*args, sep=" ", end="\n", **_ignored_kwargs):
        # file=/flush= are intentionally ignored -- every print the
        # student writes goes to the shared captured buffer, there is no
        # other "real" stdout to redirect to from inside the sandbox.
        line_text = sep.join(str(a) for a in args)
        stdout_buf.write(line_text + end)
        caller_line = sys._getframe(1).f_lineno
        _record_event("print", caller_line, line_text[:500])

    allowed_imports = {"re", "json", "collections", "math", "string", "itertools", "statistics"}

    def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name.split(".")[0] not in allowed_imports:
            raise ImportError(
                f"'{name}' isn't one of the modules available in the NER Lab playground "
                f"({', '.join(sorted(allowed_imports))})."
            )
        return builtins.__import__(name, globals, locals, fromlist, level)

    safe_builtin_names = (
        "abs", "all", "any", "bool", "dict", "divmod", "enumerate", "filter", "float",
        "frozenset", "int", "isinstance", "issubclass", "len", "list", "map", "max", "min",
        "pow", "range", "repr", "reversed", "round", "set", "slice", "sorted", "str", "sum",
        "tuple", "zip", "Exception", "ValueError", "TypeError", "KeyError", "IndexError",
        "StopIteration", "AttributeError", "ZeroDivisionError", "RuntimeError", "ArithmeticError",
        "True", "False", "None",
    )
    safe_builtins = {n: getattr(builtins, n) for n in safe_builtin_names if hasattr(builtins, n)}
    safe_builtins["__import__"] = restricted_import
    safe_builtins["print"] = tracked_print

    exec_globals = {"__builtins__": safe_builtins, "nlp": nlp, "text": input_text}

    status = "ok"
    error = None
    try:
        compiled = compile(code, USER_CODE_FILENAME, "exec")
        exec(compiled, exec_globals)
        _record_event("completed", None, None)
    except SyntaxError as e:
        status = "error"
        error = {"type": "SyntaxError", "message": str(e), "line": e.lineno}
        _record_event("error", e.lineno, str(e))
    except Exception as e:  # noqa: BLE001 -- deliberately broad: this is the sandbox boundary
        status = "error"
        line_no = None
        for frame_summary in traceback.extract_tb(e.__traceback__):
            if frame_summary.filename == USER_CODE_FILENAME:
                line_no = frame_summary.lineno  # last match = deepest frame in the student's own code
        error = {"type": type(e).__name__, "message": str(e), "line": line_no}
        _record_event("error", line_no, str(e))

    stdout_val = stdout_buf.getvalue()
    truncated = len(stdout_val) > MAX_STDOUT_CHARS
    if truncated:
        stdout_val = stdout_val[:MAX_STDOUT_CHARS] + "\n...[output truncated]"

    entities = []
    doc = last_doc.get("doc")
    if doc is not None:
        entities = [
            {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
            for ent in doc.ents
        ]

    return {
        "status": status,
        "stdout": stdout_val,
        "stdout_truncated": truncated,
        "entities": entities,
        "events": events,
        "error": error,
        "engine": engine,
    }


def main() -> None:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        result = _run(payload)
    except Exception as e:  # the runner's OWN bootstrap failed -- not the student's code
        result = {
            "status": "error",
            "stdout": "",
            "stdout_truncated": False,
            "entities": [],
            "events": [],
            "error": {"type": "RunnerError", "message": f"{type(e).__name__}: {e}", "line": None},
            "engine": None,
        }
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
