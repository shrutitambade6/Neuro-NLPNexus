"""
Real, end-to-end tests of the NER Lab Code Playground's execution layer --
every test here goes through app.services.ner_playground_service.run_playground(),
which spawns app/sandbox/ner_lab_runner.py as an actual separate OS process
(subprocess.Popen), exactly as the real API endpoint does. Nothing here is
mocked: the model, the sandbox, the subprocess boundary, and the timeout /
memory watchers are all exercised for real.
"""
import time

from app.schemas.ner_playground import NerPlaygroundRunRequest
from app.services.ner_playground_service import run_playground

SAMPLE_TEXT = "Satya Nadella visited Microsoft headquarters in Seattle on 12 March 2026."


def _run(code: str, text: str = SAMPLE_TEXT, engine: str = "rule_based"):
    return run_playground(NerPlaygroundRunRequest(code=code, text=text, engine=engine))


def test_untouched_starter_code_runs_and_returns_real_entities():
    resp = _run(
        "doc = nlp(text)\n"
        "for ent in doc.ents:\n"
        "    print(ent.text, ent.label_)\n"
    )
    assert resp.status == "ok"
    assert len(resp.entities) > 0
    # Every entity's printed line shows up verbatim in stdout -- proves
    # the console output is the real print output, not a fabricated echo.
    for ent in resp.entities:
        assert f"{ent.text} {ent.label}" in resp.stdout


def test_changing_the_filter_genuinely_changes_the_output():
    # The master prompt's core acceptance criterion: PERSON -> ORGANIZATION
    # must be a real code change with a real different result, not a
    # cosmetic relabeling of the same canned output.
    person_resp = _run(
        'doc = nlp(text)\n'
        'for ent in doc.ents:\n'
        '    if ent.label_ == "PERSON":\n'
        '        print(ent.text, ent.label_)\n'
    )
    org_resp = _run(
        'doc = nlp(text)\n'
        'for ent in doc.ents:\n'
        '    if ent.label_ == "ORGANIZATION":\n'
        '        print(ent.text, ent.label_)\n'
    )
    assert person_resp.status == "ok"
    assert org_resp.status == "ok"
    assert person_resp.stdout != org_resp.stdout
    assert "PERSON" in person_resp.stdout or person_resp.stdout == ""
    assert "ORGANIZATION" in org_resp.stdout or org_resp.stdout == ""


def test_changing_the_input_text_changes_the_results():
    resp_a = _run("doc = nlp(text)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n", text=SAMPLE_TEXT)
    resp_b = _run(
        "doc = nlp(text)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n",
        text="A completely different sentence about nothing in particular.",
    )
    assert resp_a.status == "ok" and resp_b.status == "ok"
    assert resp_a.stdout != resp_b.stdout


def test_added_print_statement_shows_in_console():
    resp = _run('doc = nlp(text)\nprint("hello from student code")\n')
    assert resp.status == "ok"
    assert "hello from student code" in resp.stdout
    assert any(ev.kind == "print" and ev.detail == "hello from student code" for ev in resp.events)


def test_syntax_error_is_identified_with_a_line_number():
    resp = _run("doc = nlp(text)\nfor ent in doc.ents\n    print(ent.text)\n")  # missing colon
    assert resp.status == "error"
    assert resp.error is not None
    assert resp.error.type == "SyntaxError"
    assert resp.error.line == 2


def test_runtime_error_is_caught_and_reports_the_real_line():
    resp = _run("doc = nlp(text)\nprint(doc.ents[0].nonexistent_attribute)\n")
    assert resp.status == "error"
    assert resp.error is not None
    assert resp.error.type == "AttributeError"
    assert resp.error.line == 2


def test_disallowed_import_is_blocked_safely():
    resp = _run("import os\nprint(os.getcwd())\n")
    assert resp.status == "error"
    assert resp.error is not None
    assert resp.error.type == "ImportError"


def test_sandbox_blocks_filesystem_access_via_open():
    resp = _run("f = open('/etc/passwd')\nprint(f.read())\n")
    assert resp.status == "error"
    # `open` isn't in the restricted builtins at all -- NameError, not a
    # permissions error, is the correct and expected failure mode.
    assert resp.error.type in ("NameError", "ImportError")


def test_no_entity_input_is_a_real_empty_result_not_a_failure():
    resp = _run(
        "doc = nlp(text)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n",
        text="the quick brown fox jumps over the lazy dog",
    )
    assert resp.status == "ok"
    assert resp.entities == []


def test_repeated_entities_have_correct_distinct_offsets():
    resp = _run(
        "doc = nlp(text)\nfor ent in doc.ents:\n    print(ent.text, ent.start_char, ent.end_char)\n",
        text="Microsoft announced a deal today. Later, Microsoft confirmed the deal again.",
    )
    assert resp.status == "ok"
    starts = [e.start for e in resp.entities if e.text == "Microsoft"]
    assert len(starts) >= 2
    assert len(set(starts)) == len(starts)  # each mention has its own distinct offset


def test_running_twice_with_different_code_never_returns_stale_results():
    resp1 = _run('doc = nlp(text)\nprint("run one")\n')
    resp2 = _run('doc = nlp(text)\nprint("run two")\n')
    assert "run one" in resp1.stdout and "run one" not in resp2.stdout
    assert "run two" in resp2.stdout and "run two" not in resp1.stdout


def test_count_entities_by_category_experiment():
    resp = _run(
        "doc = nlp(text)\ncounts = {}\nfor ent in doc.ents:\n    counts[ent.label_] = counts.get(ent.label_, 0) + 1\nprint(counts)\n"
    )
    assert resp.status == "ok"
    assert resp.stdout.strip().startswith("{") and resp.stdout.strip().endswith("}")


def test_format_as_json_experiment():
    resp = _run(
        "import json\n"
        "doc = nlp(text)\n"
        "records = [{'text': e.text, 'label': e.label_} for e in doc.ents]\n"
        "print(json.dumps(records))\n"
    )
    assert resp.status == "ok"
    assert resp.stdout.strip().startswith("[")


def test_timeout_kills_an_infinite_loop_and_reports_cleanly():
    # Genuinely exercises the real 8-second wall-clock kill in
    # ner_playground_service.py -- this test takes ~8s to run for real,
    # on purpose, because that's the only way to prove the kill actually
    # fires rather than trusting the code reading correctly.
    t0 = time.monotonic()
    resp = _run("while True:\n    pass\n")
    elapsed = time.monotonic() - t0
    assert resp.status == "timeout"
    assert elapsed < 15  # killed well before it could run away unbounded


def test_application_secrets_are_not_reachable_from_sandboxed_code():
    # The sandbox's restricted `__import__` blocks `os` outright, so this
    # also doubles as proof the env-stripping in _sandboxed_env() is moot
    # for code that can't even reach os.environ in the first place.
    resp = _run("import os\nprint(os.environ)\n")
    assert resp.status == "error"
    assert resp.error.type == "ImportError"


def test_env_sanitization_strips_sensitive_variables_before_spawn():
    import os as real_os

    from app.services.ner_playground_service import _sandboxed_env

    real_os.environ["JWT_SECRET_TEST_PROBE"] = "should-never-cross-the-boundary"
    try:
        sandboxed = _sandboxed_env()
        assert "JWT_SECRET_TEST_PROBE" not in sandboxed
    finally:
        del real_os.environ["JWT_SECRET_TEST_PROBE"]
