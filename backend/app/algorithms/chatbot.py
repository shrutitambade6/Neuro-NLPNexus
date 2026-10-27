"""
A rule-based NLP-concept chatbot — explicitly NOT an LLM. It matches the
user's message against a small keyword-indexed knowledge base of real NLP
definitions (consistent with what the labs in this project actually teach)
and returns the matching definition verbatim, or an honest "I don't know
that one" response naming what it *does* know. No response is generated —
every answer is a fixed, pre-written definition looked up by keyword.
"""
import re

KNOWLEDGE_BASE: list[dict] = [
    {
        "keywords": {"tokeniz", "token"},
        "topic": "Tokenization",
        "answer": "Tokenization is splitting text into smaller units called tokens — usually "
                  "words or subword pieces. It's normally the first step in an NLP pipeline. "
                  "See the Text Processing lab for whitespace, rule-based, and regex tokenizers side by side.",
    },
    {
        "keywords": {"stem", "stemming", "porter"},
        "topic": "Stemming",
        "answer": "Stemming strips suffixes from a word to reach a common root form, e.g. "
                  "\"running\" → \"run\". This project implements the real Porter (1980) stemmer "
                  "from scratch — try it in the Text Processing lab.",
    },
    {
        "keywords": {"lemma", "lemmatiz"},
        "topic": "Lemmatization",
        "answer": "Lemmatization maps a word to its dictionary base form (its lemma) using "
                  "vocabulary and grammar rules, e.g. \"better\" → \"good\". It's usually more "
                  "accurate than stemming but needs more linguistic knowledge.",
    },
    {
        "keywords": {"n-gram", "ngram", "bigram", "trigram"},
        "topic": "N-grams",
        "answer": "An n-gram is a contiguous sequence of n tokens. Bigrams (n=2) and trigrams "
                  "(n=3) are used to build language models that estimate the probability of a "
                  "word given the words before it. Try the Language Modeling lab.",
    },
    {
        "keywords": {"perplexity"},
        "topic": "Perplexity",
        "answer": "Perplexity measures how well a language model predicts a sequence of text — "
                  "lower perplexity means the model is less \"surprised\" by the text, i.e. it "
                  "predicts it better.",
    },
    {
        "keywords": {"edit distance", "levenshtein"},
        "topic": "Edit distance",
        "answer": "Edit distance (Levenshtein distance) counts the minimum number of insertions, "
                  "deletions, and substitutions needed to turn one string into another. It's "
                  "computed with dynamic programming and used in spell-checkers.",
    },
    {
        "keywords": {"tf-idf", "tfidf"},
        "topic": "TF-IDF",
        "answer": "TF-IDF (term frequency-inverse document frequency) weighs how important a word "
                  "is to a document within a collection: common words across all documents get a "
                  "lower weight, rare-but-frequent-in-this-document words get a higher weight.",
    },
    {
        "keywords": {"cosine similarity", "cosine"},
        "topic": "Cosine similarity",
        "answer": "Cosine similarity measures how similar two vectors are by the cosine of the "
                  "angle between them, ranging from -1 to 1 (0 to 1 for non-negative vectors like "
                  "TF-IDF). It's widely used to compare documents represented as word-frequency vectors.",
    },
    {
        "keywords": {"jaccard"},
        "topic": "Jaccard similarity",
        "answer": "Jaccard similarity compares two sets by dividing the size of their intersection "
                  "by the size of their union — a simple way to measure overlap between, say, two "
                  "documents' vocabularies.",
    },
    {
        "keywords": {"parsing", "parse tree", "cyk", "grammar"},
        "topic": "Parsing",
        "answer": "Parsing builds a tree showing a sentence's grammatical structure. The CYK "
                  "algorithm parses a sentence against a context-free grammar in Chomsky Normal "
                  "Form using dynamic programming — try it in the Parsing Lab.",
    },
    {
        "keywords": {"word sense", "wsd", "disambiguation", "lesk"},
        "topic": "Word sense disambiguation",
        "answer": "Word sense disambiguation (WSD) figures out which meaning of an ambiguous word "
                  "(like \"bank\") is meant in context. The Lesk algorithm does this by comparing "
                  "the context's words against each candidate sense's dictionary definition.",
    },
    {
        "keywords": {"named entity", "ner", "entity recognition"},
        "topic": "Named entity recognition",
        "answer": "Named entity recognition (NER) finds and labels real-world entities in text — "
                  "people, locations, organizations, dates, and more. This project's Real-World "
                  "NLP demo uses a rule-based/gazetteer approach, not a trained model.",
    },
    {
        "keywords": {"sentiment", "sentiment analysis"},
        "topic": "Sentiment analysis",
        "answer": "Sentiment analysis classifies text as positive, negative, or neutral. A "
                  "lexicon-based approach (used in this project's demo) scores words from a "
                  "curated opinion word list, handling negation and intensifiers.",
    },
    {
        "keywords": {"discourse", "coreference", "hobbs", "pronoun", "antecedent"},
        "topic": "Discourse and coreference",
        "answer": "Discourse analysis studies how sentences relate across a text — including "
                  "coreference resolution, matching a pronoun to the entity it refers to. This "
                  "project's Discourse Lab uses a simplified version of Hobbs' (1978) algorithm.",
    },
    {
        "keywords": {"chatbot", "yourself", "what are you", "who are you"},
        "topic": "About this chatbot",
        "answer": "I'm a rule-based, keyword-matching assistant — I look up your question against "
                  "a small fixed list of NLP definitions and return the matching one. I'm not a "
                  "language model, so I only know the topics listed when you ask \"what can you answer\".",
    },
]

FALLBACK_TOPICS = sorted({entry["topic"] for entry in KNOWLEDGE_BASE})


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def ask(message: str) -> dict:
    normalized = _normalize(message)
    tokens = set(re.findall(r"[a-z'-]+", normalized))

    best_entry = None
    best_score = 0
    for entry in KNOWLEDGE_BASE:
        score = 0
        for kw in entry["keywords"]:
            if " " in kw:
                if kw in normalized:
                    score += 2
            elif kw in tokens or any(t.startswith(kw) for t in tokens):
                score += 1
        if score > best_score:
            best_score = score
            best_entry = entry

    if best_entry is None:
        return {
            "message": message,
            "matched_topic": None,
            "answer": "I don't have an answer for that. I only know about specific NLP concepts: "
                      + ", ".join(FALLBACK_TOPICS) + ".",
            "known_topics": FALLBACK_TOPICS,
            "method_note": "Rule-based keyword matching against a fixed knowledge base — not an LLM.",
        }

    return {
        "message": message,
        "matched_topic": best_entry["topic"],
        "answer": best_entry["answer"],
        "known_topics": FALLBACK_TOPICS,
        "method_note": "Rule-based keyword matching against a fixed knowledge base — not an LLM.",
    }
