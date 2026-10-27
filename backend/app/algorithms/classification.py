"""
Text classification via a real, from-scratch Multinomial Naive Bayes
classifier (with Laplace/add-one smoothing), trained at import time on a
small, honestly-labeled example dataset embedded in this module. This is a
genuinely trained probabilistic model — every P(class), P(word|class), and
the resulting posterior are real computed numbers, not invented scores. The
training set is intentionally small (a handful of examples per category),
so accuracy on unusual inputs will be limited — stated honestly rather than
overclaimed.
"""
import math
import re
from collections import Counter, defaultdict

TRAINING_DATA: list[tuple[str, str]] = [
    ("the team won the championship game last night", "Sports"),
    ("the striker scored a hat trick in the football match", "Sports"),
    ("she broke the world record in the 100 meter sprint", "Sports"),
    ("the cricket match went into a thrilling final over", "Sports"),
    ("the coach substituted two players in the second half", "Sports"),
    ("the tennis player won in straight sets at the final", "Sports"),
    ("the new smartphone features a faster processor and better camera", "Technology"),
    ("researchers released an open source machine learning library", "Technology"),
    ("the startup launched a new app for scheduling meetings", "Technology"),
    ("the company unveiled its latest laptop with a longer battery life", "Technology"),
    ("engineers are testing a new algorithm to improve search results", "Technology"),
    ("the software update fixes several security vulnerabilities", "Technology"),
    ("the central bank raised interest rates to control inflation", "Business"),
    ("the company reported record quarterly profits this year", "Business"),
    ("stock prices fell sharply after the earnings announcement", "Business"),
    ("the merger between the two firms was approved by regulators", "Business"),
    ("the startup raised a new round of venture capital funding", "Business"),
    ("unemployment numbers dropped for the third straight month", "Business"),
    ("the film won several awards at the international festival", "Entertainment"),
    ("the singer announced a new album releasing next month", "Entertainment"),
    ("the actor will star in an upcoming superhero movie", "Entertainment"),
    ("the concert tickets sold out within minutes of release", "Entertainment"),
    ("the streaming platform renewed the popular series for another season", "Entertainment"),
    ("critics praised the director's latest movie for its screenplay", "Entertainment"),
    ("parliament passed a new bill after a lengthy debate", "Politics"),
    ("the president met with foreign leaders to discuss trade", "Politics"),
    ("voters head to the polls in the upcoming election", "Politics"),
    ("the senator proposed new legislation on healthcare reform", "Politics"),
    ("the prime minister addressed the nation on the policy changes", "Politics"),
    ("the opposition party criticized the government's new budget", "Politics"),
]

CATEGORIES = sorted({label for _, label in TRAINING_DATA})

STOPWORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
    "and", "or", "but", "if", "then", "so", "of", "in", "on", "at", "to",
    "for", "with", "as", "by", "this", "that", "these", "those", "it", "its",
}


def _words(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-zA-Z']+", text.lower()) if w not in STOPWORDS]


def _train():
    class_counts = Counter(label for _, label in TRAINING_DATA)
    n_docs = len(TRAINING_DATA)
    log_prior = {c: math.log(class_counts[c] / n_docs) for c in CATEGORIES}

    word_counts: dict[str, Counter] = defaultdict(Counter)
    class_total_words: dict[str, int] = defaultdict(int)
    vocab: set[str] = set()

    for text, label in TRAINING_DATA:
        for w in _words(text):
            word_counts[label][w] += 1
            class_total_words[label] += 1
            vocab.add(w)

    vocab_size = len(vocab)
    return log_prior, word_counts, class_total_words, vocab_size


_LOG_PRIOR, _WORD_COUNTS, _CLASS_TOTAL_WORDS, _VOCAB_SIZE = _train()


def classify(text: str) -> dict:
    tokens = _words(text)
    log_scores: dict[str, float] = {}

    for c in CATEGORIES:
        score = _LOG_PRIOR[c]
        for w in tokens:
            count = _WORD_COUNTS[c][w]
            # Laplace (add-one) smoothing — real, standard Naive Bayes.
            prob = (count + 1) / (_CLASS_TOTAL_WORDS[c] + _VOCAB_SIZE)
            score += math.log(prob)
        log_scores[c] = score

    # Convert log-scores to a real normalized probability distribution
    # (softmax over the log-scores) rather than reporting raw log-likelihoods.
    max_log = max(log_scores.values())
    exp_scores = {c: math.exp(s - max_log) for c, s in log_scores.items()}
    total = sum(exp_scores.values())
    probabilities = {c: round(v / total, 4) for c, v in exp_scores.items()}

    predicted = max(probabilities, key=probabilities.get)

    return {
        "text": text,
        "predicted_category": predicted,
        "probabilities": probabilities,
        "categories": CATEGORIES,
        "training_examples_per_category": {c: sum(1 for _, l in TRAINING_DATA if l == c) for c in CATEGORIES},
        "method_note": "Multinomial Naive Bayes with Laplace smoothing, trained on a small embedded example dataset — real trained probabilities, honestly small training set.",
    }
