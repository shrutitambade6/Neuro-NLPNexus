from app.algorithms.spam_detection import analyze_email


def test_obvious_spam_flagged():
    r = analyze_email(
        subject="CONGRATULATIONS! YOU WON!!!",
        message="Click here now to claim your free cash prize, act now, limited time offer!!!",
        sender="unknown@example.com",
    )
    assert r["classification"] == "Spam"
    assert r["score"] >= 6
    assert len(r["signals"]) > 0


def test_legitimate_email_not_flagged():
    r = analyze_email(
        subject="Meeting notes from today",
        message="Hi, attaching the notes from our meeting this afternoon. Let me know if you have questions.",
        sender="colleague@company.com",
    )
    assert r["classification"] == "Likely legitimate"


def test_signals_name_the_specific_rule():
    r = analyze_email(subject="URGENT: verify your account", message="Please confirm your password immediately.", sender="")
    assert any("Urgency" in s or "request" in s.lower() for s in r["signals"])


def test_no_signals_message_when_clean():
    r = analyze_email(subject="Lunch?", message="Want to grab lunch tomorrow?", sender="friend@example.com")
    assert "No suspicious signals" in r["signals"][0]
