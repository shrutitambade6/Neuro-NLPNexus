"""
Spam/suspicious-email detection via heuristic signal detection — explicitly
NOT a trained model. Every signal below is a real, checkable pattern in the
text (a word list, a regex, a ratio threshold); the "signals detected" list
returned to the user names exactly which rules fired, so nothing here is an
invented explanation.
"""
import re

URGENCY_WORDS = {
    "urgent", "immediately", "act now", "limited time", "hurry", "expires",
    "final notice", "last chance", "deadline", "asap",
}
PROMO_WORDS = {
    "free", "winner", "won", "congratulations", "prize", "cash", "bonus",
    "discount", "deal", "offer", "guarantee", "guaranteed", "risk-free",
    "click here", "click below", "subscribe now", "buy now", "no cost",
}
REQUEST_WORDS = {
    "verify your account", "confirm your", "update your payment",
    "suspended", "unusual activity", "click the link", "password", "ssn",
    "social security", "bank account", "wire transfer", "gift card",
}


def _ratio_upper(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    upper = [c for c in letters if c.isupper()]
    return len(upper) / len(letters)


def analyze_email(subject: str, message: str, sender: str = "") -> dict:
    full_text = f"{subject} {message}".lower()
    signals: list[str] = []
    score = 0

    matched_urgency = [w for w in URGENCY_WORDS if w in full_text]
    if matched_urgency:
        signals.append(f"Urgency language: {', '.join(sorted(matched_urgency))}")
        score += 2 * len(matched_urgency)

    matched_promo = [w for w in PROMO_WORDS if w in full_text]
    if matched_promo:
        signals.append(f"Promotional/prize language: {', '.join(sorted(matched_promo))}")
        score += 2 * len(matched_promo)

    matched_request = [w for w in REQUEST_WORDS if w in full_text]
    if matched_request:
        signals.append(f"Unusual request for credentials/payment info: {', '.join(sorted(matched_request))}")
        score += 3 * len(matched_request)

    n_exclaim = full_text.count("!")
    if n_exclaim >= 2:
        signals.append(f"Excessive punctuation ({n_exclaim} exclamation marks)")
        score += min(n_exclaim, 5)

    upper_ratio = _ratio_upper(subject)
    if upper_ratio > 0.5 and len(subject) > 5:
        signals.append(f"Subject line is mostly uppercase ({round(upper_ratio * 100)}%)")
        score += 2

    urls = re.findall(r"https?://\S+|www\.\S+", message)
    if urls:
        signals.append(f"Contains {len(urls)} link(s): {', '.join(urls[:3])}")
        score += 1 * len(urls)

    if sender and re.match(r"^[^@]+@(?!gmail\.com|outlook\.com|yahoo\.com|.*\.edu)[^@]+$", sender):
        # Not itself suspicious (most real senders aren't gmail/edu), only
        # noted as a minor signal in combination with the others above.
        pass

    if score >= 6:
        classification = "Spam"
    elif score >= 3:
        classification = "Suspicious"
    else:
        classification = "Likely legitimate"

    if not signals:
        signals.append("No suspicious signals detected by this heuristic checklist.")

    return {
        "subject": subject,
        "sender": sender,
        "message": message,
        "classification": classification,
        "score": score,
        "signals": signals,
        "method_note": "Educational heuristic checklist (word lists + pattern rules), not a trained spam-classification model.",
    }
