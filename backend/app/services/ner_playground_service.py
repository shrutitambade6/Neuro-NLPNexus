"""
Orchestrates one NER Lab Code Playground run: spawns
app/sandbox/ner_lab_runner.py as a SEPARATE OS PROCESS and locks it down
BEFORE it ever sees a line of student code -- never `exec()`/`eval()`
inline inside this (the FastAPI server's own) process. See
app/sandbox/ner_lab_runner.py's module docstring for what the sandboxed
process itself does and does not protect against; this file is the other
half of that security story -- everything enforced from OUTSIDE the
sandboxed process:

  * a fresh OS process per run (never a shared/persistent interpreter
    reused across different users' code)
  * a throwaway temp directory as its cwd, deleted right after
  * an environment with every credential-shaped variable stripped out
    (see _SENSITIVE_ENV_FRAGMENTS) -- the sandboxed process cannot read
    this app's JWT secret, database URL, or SMTP credentials even if it
    somehow got arbitrary code execution past app/sandbox's own
    restrictions
  * a hard wall-clock timeout (subprocess killed and reported as
    "timeout", not left running)
  * a soft, psutil-based memory ceiling, polled on a background thread
    (soft because Windows has no POSIX rlimit equivalent this project can
    rely on without new native dependencies -- see the module docstring
    in ner_lab_runner.py for the full honesty note on what this
    architecture does and doesn't guarantee)
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from app.schemas.ner_playground import (
    NerPlaygroundRunRequest,
    NerPlaygroundRunResponse,
    PlaygroundEntityOut,
    PlaygroundErrorOut,
    PlaygroundEventOut,
)

RUNNER_PATH = Path(__file__).resolve().parents[1] / "sandbox" / "ner_lab_runner.py"
EXECUTION_TIMEOUT_SECONDS = 8.0
MEMORY_LIMIT_BYTES = 256 * 1024 * 1024  # 256MB soft ceiling -- generous for spaCy's small model + a short script
MEMORY_POLL_INTERVAL_SECONDS = 0.05

# Matched case-insensitively against every environment variable name this
# server process has. This project's own backend/.env.example names the
# exact categories that must never cross into the sandbox: DATABASE_URL,
# JWT_SECRET, SMTP_USERNAME/SMTP_PASSWORD -- plus generic catch-alls
# (TOKEN, API_KEY, PRIVATE) in case a future .env adds something similarly
# sensitive under a name this list hasn't seen yet.
_SENSITIVE_ENV_FRAGMENTS = ("SECRET", "PASSWORD", "JWT", "SMTP", "DATABASE_URL", "TOKEN", "API_KEY", "PRIVATE")


def _sandboxed_env() -> dict[str, str]:
    return {
        key: value
        for key, value in os.environ.items()
        if not any(fragment in key.upper() for fragment in _SENSITIVE_ENV_FRAGMENTS)
    }


def _kill(proc: "subprocess.Popen[str]") -> None:
    try:
        proc.kill()
    except OSError:
        pass  # already exited -- nothing to do


def _error_response(error_type: str, message: str, started_at: float, engine: str) -> NerPlaygroundRunResponse:
    return NerPlaygroundRunResponse(
        status="error",
        stdout="",
        entities=[],
        events=[],
        error=PlaygroundErrorOut(type=error_type, message=message, line=None),
        elapsed_ms=int((time.monotonic() - started_at) * 1000),
        engine=engine,
    )


def run_playground(payload: NerPlaygroundRunRequest) -> NerPlaygroundRunResponse:
    started_at = time.monotonic()
    stdin_payload = json.dumps({"code": payload.code, "text": payload.text, "engine": payload.engine})

    with tempfile.TemporaryDirectory(prefix="ner_lab_") as tmp_cwd:
        try:
            proc = subprocess.Popen(
                [sys.executable, "-I", str(RUNNER_PATH)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=tmp_cwd,
                env=_sandboxed_env(),
            )
        except OSError as e:
            return _error_response("launch_failed", f"Couldn't start the sandbox process: {e}", started_at, payload.engine)

        memory_exceeded = {"flag": False}

        def _watch_memory() -> None:
            try:
                import psutil

                ps_proc = psutil.Process(proc.pid)
            except Exception:
                return  # psutil unavailable or process already gone -- the wall-clock timeout below still applies
            while proc.poll() is None:
                try:
                    rss = ps_proc.memory_info().rss
                except Exception:
                    return
                if rss > MEMORY_LIMIT_BYTES:
                    memory_exceeded["flag"] = True
                    _kill(proc)
                    return
                time.sleep(MEMORY_POLL_INTERVAL_SECONDS)

        watcher = threading.Thread(target=_watch_memory, daemon=True)
        watcher.start()

        try:
            stdout, _stderr = proc.communicate(input=stdin_payload, timeout=EXECUTION_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            _kill(proc)
            proc.communicate()  # reap the process so it doesn't linger as a zombie
            return NerPlaygroundRunResponse(
                status="timeout",
                stdout="",
                entities=[],
                events=[],
                error=PlaygroundErrorOut(
                    type="TimeoutError",
                    message=f"Execution took longer than {EXECUTION_TIMEOUT_SECONDS:.0f} seconds and was stopped.",
                    line=None,
                ),
                elapsed_ms=int((time.monotonic() - started_at) * 1000),
                engine=payload.engine,
            )

        watcher.join(timeout=1.0)

        if memory_exceeded["flag"]:
            return NerPlaygroundRunResponse(
                status="memory_exceeded",
                stdout="",
                entities=[],
                events=[],
                error=PlaygroundErrorOut(
                    type="MemoryError",
                    message=f"Execution used more than {MEMORY_LIMIT_BYTES // (1024 * 1024)}MB and was stopped.",
                    line=None,
                ),
                elapsed_ms=int((time.monotonic() - started_at) * 1000),
                engine=payload.engine,
            )

        result = None
        stripped = stdout.strip()
        if stripped:
            try:
                result = json.loads(stripped.splitlines()[-1])
            except (json.JSONDecodeError, IndexError):
                result = None

        if result is None:
            # The runner exited without producing its own JSON result (a
            # bug in the runner itself, or it was killed mid-write). Never
            # forward raw stderr/tracebacks from OUR process to the client.
            return _error_response(
                "internal_error",
                "The sandbox didn't return a result. Try again, or simplify the code.",
                started_at,
                payload.engine,
            )

        return NerPlaygroundRunResponse(
            status=result.get("status", "error"),
            stdout=result.get("stdout", ""),
            stdout_truncated=result.get("stdout_truncated", False),
            entities=[PlaygroundEntityOut(**e) for e in result.get("entities", [])],
            events=[PlaygroundEventOut(**ev) for ev in result.get("events", [])],
            error=PlaygroundErrorOut(**result["error"]) if result.get("error") else None,
            elapsed_ms=int((time.monotonic() - started_at) * 1000),
            engine=payload.engine,
        )
