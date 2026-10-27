"""
Structured NLP knowledge base powering the NLP Learning Assistant.

Every entry is real, accurate NLP content — written to match what this project's
own labs actually teach and implement (Porter stemming, CYK parsing, Jaccard/
Cosine/TF-IDF/Lesk WSD, Hobbs-style discourse, the Real-World NLP application
demos, etc.), not a generic textbook blurb. This is data, not a language model:
the assistant engine (nlp_assistant.py) looks entries up by concept id and
formats them according to the user's detected intent.

Each concept follows the same structured shape so the assistant can answer a
DEFINITION, EXAMPLE, WHY, CODE, REAL_WORLD_USE, etc. question about any of them
without a bespoke branch per topic:

{
    "name": str,
    "aliases": set[str]          # keyword/phrase triggers used for topic detection
    "category": str,             # one of the 7 course sections
    "labRoute": str | None,      # None only for a handful of peripheral terms with no dedicated lab
    "difficulty": "beginner" | "intermediate" | "advanced",
    "definition": str,           # precise, technical
    "simpleMeaning": str,        # one/two plain-language sentences
    "why": str,                  # why this technique/concept is used
    "examples": list[dict],      # each: {"input": ..., "output": ..., "explanation": ...}
    "realWorldApplications": list[str],
    "relatedConcepts": list[str],        # concept ids
    "prerequisiteConcepts": list[str],   # concept ids
    "formula": str | None,
    "formulaExplanation": str | None,
    "codeExample": str | None,
    "commonMistakes": list[str],
    "vivaQuestions": list[dict],   # each: {"question": ..., "modelAnswer": ...}
    "challengeExamples": list[str],
    "advanced": str | None,        # deeper/mathematical explanation, for ADVANCED intent
}
"""

CONCEPTS: dict[str, dict] = {
    # ---------------------------------------------------------------- FOUNDATIONS
    "nlp": {
        "name": "Natural Language Processing",
        "aliases": {"nlp", "natural language processing"},
        "category": "foundations",
        "labRoute": "/foundations",
        "difficulty": "beginner",
        "definition": "Natural Language Processing (NLP) is the field of computer science and "
                       "linguistics concerned with enabling computers to process, analyze, and "
                       "generate human language.",
        "simpleMeaning": "Teaching computers to read, understand, and produce human language.",
        "why": "Human language is how most information is recorded and communicated, so NLP is "
               "how computers make that information searchable, analyzable, and actionable.",
        "examples": [
            {"input": "\"Book me a flight to Mumbai\"", "output": "intent: book_flight, destination: Mumbai",
             "explanation": "An NLP system extracts structured meaning from an unstructured sentence."},
        ],
        "realWorldApplications": ["Search engines", "Voice assistants", "Machine translation", "Spam filters"],
        "relatedConcepts": ["nlp_pipeline", "ambiguity"],
        "prerequisiteConcepts": [],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Treating NLP as a single algorithm rather than a pipeline of many sub-tasks."],
        "vivaQuestions": [
            {"question": "What distinguishes NLP from general software text processing?",
             "modelAnswer": "NLP specifically models the structure and meaning of human language "
                             "(syntax, semantics, ambiguity) rather than just manipulating strings."},
        ],
        "challengeExamples": [],
        "advanced": None,
    },
    "ambiguity": {
        "name": "Ambiguity in Language",
        "aliases": {"ambiguity", "ambiguous", "lexical ambiguity", "syntactic ambiguity", "semantic ambiguity"},
        "category": "foundations",
        "labRoute": "/foundations",
        "difficulty": "beginner",
        "definition": "Ambiguity is when a word, phrase, or sentence has more than one valid "
                       "interpretation. Lexical ambiguity is a word with multiple meanings "
                       "(\"bank\"); syntactic ambiguity is a sentence with multiple valid grammatical "
                       "structures (\"I saw the man with a telescope\"); semantic ambiguity is when "
                       "the meaning itself is unclear even with structure resolved.",
        "simpleMeaning": "A sentence or word that can be understood in more than one way.",
        "why": "Ambiguity is the reason NLP is hard — a computer must pick the right interpretation "
               "using context, unlike a human who does this almost unconsciously.",
        "examples": [
            {"input": "\"I saw the man with a telescope.\"",
             "output": "Reading 1: I used a telescope to see him. Reading 2: The man had a telescope.",
             "explanation": "Syntactic ambiguity — \"with a telescope\" can attach to either \"saw\" or \"the man\"."},
            {"input": "\"He went to the bank.\"", "output": "financial institution OR river bank",
             "explanation": "Lexical ambiguity — \"bank\" has two unrelated meanings, resolved by word sense disambiguation."},
        ],
        "realWorldApplications": ["Machine translation (choosing the right sense)", "Search query understanding", "Question answering"],
        "relatedConcepts": ["wsd", "parsing", "nlp"],
        "prerequisiteConcepts": ["nlp"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming ambiguity is rare — it's the default state of natural language."],
        "vivaQuestions": [
            {"question": "Give an example of syntactic ambiguity and explain the two readings.",
             "modelAnswer": "\"I saw the man with a telescope\" — either the telescope is the instrument "
                             "of seeing, or a possession of the man, depending on attachment."},
        ],
        "challengeExamples": ["Classify: \"Visiting relatives can be boring.\" — which type of ambiguity is this?"],
        "advanced": None,
    },
    "nlp_pipeline": {
        "name": "NLP Pipeline",
        "aliases": {"nlp pipeline", "pipeline", "processing pipeline"},
        "category": "foundations",
        "labRoute": "/playground",
        "difficulty": "beginner",
        "definition": "The NLP pipeline is the sequence of processing stages raw text typically "
                       "passes through: tokenization → normalization → stemming/lemmatization → "
                       "(optionally) parsing → semantic analysis → application-level task.",
        "simpleMeaning": "The step-by-step assembly line raw text goes through before a task like "
                          "sentiment analysis or translation can use it.",
        "why": "Breaking language processing into stages makes each stage independently testable "
               "and reusable across many downstream applications — this project's NLP Playground "
               "lets you configure this pipeline yourself.",
        "examples": [
            {"input": "\"The cats are running!\"", "output": "tokens → [\"the\",\"cats\",\"are\",\"running\",\"!\"] → "
                                                                "stemmed → [\"the\",\"cat\",\"are\",\"run\"]",
             "explanation": "Each pipeline stage transforms the output of the previous one."},
        ],
        "realWorldApplications": ["Every real NLP application chains pipeline stages internally"],
        "relatedConcepts": ["tokenization", "stemming", "lemmatization", "normalization"],
        "prerequisiteConcepts": ["nlp"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Skipping normalization and being surprised stemming/matching fails on case or punctuation differences."],
        "vivaQuestions": [
            {"question": "Why is tokenization almost always the first pipeline stage?",
             "modelAnswer": "Every later stage (stemming, parsing, counting) operates on discrete "
                             "tokens, so text must be split into tokens before anything else can run."},
        ],
        "challengeExamples": [],
        "advanced": None,
    },

    # ------------------------------------------------------------ TEXT PROCESSING
    "tokenization": {
        "name": "Tokenization",
        "aliases": {"tokeniz", "token"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Tokenization is the process of splitting a text into smaller units called "
                       "tokens — usually words, punctuation marks, or subword pieces — typically "
                       "the first step of an NLP pipeline.",
        "simpleMeaning": "Breaking a sentence into its individual words and punctuation marks.",
        "why": "Nearly every later NLP step (counting, tagging, parsing) needs discrete units to "
               "operate on rather than one long string.",
        "examples": [
            {"input": "\"I love NLP!\"", "output": '["I", "love", "NLP", "!"]',
             "explanation": "The sentence was split into smaller units called tokens, including the exclamation mark as its own token."},
            {"input": "\"Natural Language Processing is fun.\"", "output": '["Natural", "Language", "Processing", "is", "fun", "."]',
             "explanation": "Each word and the final period become separate tokens."},
            {"input": "\"Mumbai is beautiful.\"", "output": '["Mumbai", "is", "beautiful", "."]',
             "explanation": "A rule-based tokenizer keeps the proper noun intact and separates the period."},
            {"input": "\"NLP is interesting!\"", "output": '["NLP", "is", "interesting", "!"]',
             "explanation": "Punctuation is tokenized separately from the word it follows."},
            {"input": "\"Don't stop learning.\"", "output": '["Do", "n\'t", "stop", "learning", "."]',
             "explanation": "Contractions like \"don't\" are a classic tokenization edge case — different "
                             "tokenizers split them differently, which is exactly what this project's "
                             "whitespace vs. rule-based vs. regex tokenizers let you compare."},
        ],
        "realWorldApplications": ["Search engines (indexing documents by token)", "Chatbots", "Sentiment analysis",
                                   "Machine translation", "Text classification"],
        "relatedConcepts": ["sentence_segmentation", "stemming", "normalization", "nlp_pipeline"],
        "prerequisiteConcepts": ["nlp"],
        "formula": None, "formulaExplanation": None,
        "codeExample": 'text = "I love Natural Language Processing!"\n\ntokens = text.split()\n\nprint(tokens)\n'
                        '# [\'I\', \'love\', \'Natural\', \'Language\', \'Processing!\']',
        "commonMistakes": ["Using plain .split() and assuming punctuation is handled — it sticks to the "
                            "previous word (\"Processing!\") unless you tokenize punctuation separately.",
                            "Forgetting that different tokenizers (whitespace/rule-based/regex) disagree on contractions and hyphenated words."],
        "vivaQuestions": [
            {"question": "Why might whitespace tokenization and rule-based tokenization disagree on \"don't\"?",
             "modelAnswer": "Whitespace tokenization only splits on spaces, so \"don't\" stays one token; "
                             "a rule-based tokenizer applies contraction rules to split it into \"Do\" + \"n't\"."},
        ],
        "challengeExamples": ["Tokenize \"Mr. Smith's e-mail isn't working.\" and identify every edge case a naive splitter would get wrong."],
        "advanced": "Formally, tokenization defines a segmentation function T: string → [token₁, ..., tokenₙ] "
                    "such that concatenating the tokens (with recoverable whitespace/punctuation rules) "
                    "reconstructs the original string. Subword tokenizers (BPE, WordPiece) generalize this "
                    "by allowing tokens smaller than a whole word, trained to minimize vocabulary size for a "
                    "target coverage — outside the scope of this project's rule-based tokenizers.",
    },
    "sentence_segmentation": {
        "name": "Sentence Segmentation",
        "aliases": {"sentence segmentation", "sentence tokeniz", "sentence boundary"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Sentence segmentation splits a text into individual sentences, typically using "
                       "punctuation (., !, ?) as boundary signals while handling exceptions like abbreviations.",
        "simpleMeaning": "Cutting a paragraph into its separate sentences.",
        "why": "Many NLP tasks (summarization, sentiment scoring per sentence, discourse analysis) "
               "operate at the sentence level, so a paragraph must first be split correctly.",
        "examples": [
            {"input": "\"Dr. Smith arrived. He was late.\"", "output": '["Dr. Smith arrived.", "He was late."]',
             "explanation": "A naive splitter on every period would incorrectly cut after \"Dr.\" — real segmenters special-case abbreviations."},
        ],
        "realWorldApplications": ["Text summarization", "Document analysis", "Machine translation (sentence-by-sentence)"],
        "relatedConcepts": ["tokenization", "nlp_pipeline"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": 'import re\n\ntext = "Dr. Smith arrived. He was late."\nsentences = re.split(r"(?<!Dr)(?<=[.!?])\\s+", text)\nprint(sentences)',
        "commonMistakes": ["Splitting on every period without excluding abbreviations (Dr., Mr., e.g., etc.)."],
        "vivaQuestions": [{"question": "Why can't sentence segmentation just split on every period?",
                            "modelAnswer": "Periods also appear in abbreviations, decimal numbers, and initials, "
                                           "so a correct segmenter needs rules or context to avoid false splits."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "stemming": {
        "name": "Stemming",
        "aliases": {"stem", "stemming", "porter", "porter stemmer"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Stemming strips suffixes from a word using heuristic rules to reduce it to a "
                       "common root form (a \"stem\"), which may not be a real dictionary word.",
        "simpleMeaning": "Chopping word endings off so related words (run/running/runs) map to the same root.",
        "why": "It groups word variants together so they're treated as the same term — useful for "
               "search and text matching where \"running\" and \"run\" should count as related.",
        "examples": [
            {"input": '"running", "runs", "runner"', "output": '"run", "run", "runner"',
             "explanation": "The Porter stemmer strips the -ing and -s suffixes but leaves \"runner\" alone since "
                             "\"runn\" wouldn't be a valid stem under its rules."},
            {"input": '"studies", "studying"', "output": '"studi", "studi"',
             "explanation": "Porter's rules can produce a non-word stem (\"studi\") — this is expected and is "
                             "the key difference from lemmatization."},
        ],
        "realWorldApplications": ["Search engines (matching query terms to document variants)", "Information retrieval indexing"],
        "relatedConcepts": ["lemmatization", "porter_stemmer", "morphology"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Expecting stemmed output to always be a valid dictionary word — it often isn't."],
        "vivaQuestions": [{"question": "Why might a stemmer produce a non-word like \"studi\"?",
                            "modelAnswer": "Stemming applies fixed suffix-stripping rules without a dictionary, "
                                           "so it can overshoot and cut into the root itself."}],
        "challengeExamples": ["Stem \"argued\", \"argument\", \"arguing\" by hand using Porter's step-1 rules and compare results."],
        "advanced": None,
    },
    "porter_stemmer": {
        "name": "Porter Stemmer",
        "aliases": {"porter stemmer", "porter algorithm", "porter 1980"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "intermediate",
        "definition": "The Porter Stemmer (Porter, 1980) is a widely used rule-based stemming "
                       "algorithm that applies an ordered sequence of suffix-stripping rules in "
                       "multiple passes (steps 1a–5), each conditioned on the word's measure "
                       "(a count of consonant-vowel sequences).",
        "simpleMeaning": "The specific, well-known set of exact rules this project's stemmer implements.",
        "why": "It's a standard, reproducible algorithm (not a black box), which is why this project "
               "implements it from scratch and cross-checks it against nltk's reference implementation.",
        "examples": [
            {"input": '"caresses"', "output": '"caress"', "explanation": "Step 1a rule: -sses → -ss."},
        ],
        "realWorldApplications": ["Search indexing", "Any IR system needing a standard, well-documented stemmer"],
        "relatedConcepts": ["stemming"],
        "prerequisiteConcepts": ["stemming"],
        "formula": "m = number of consonant-vowel-consonant sequences in the stem",
        "formulaExplanation": "Porter's rules are gated by \"measure\" m of the stem before the suffix — e.g. "
                               "a rule might only fire if m > 1, preventing over-stemming of short words.",
        "codeExample": None,
        "commonMistakes": ["Assuming Porter is the only stemmer — Snowball and Lancaster stemmers use different, sometimes more aggressive rules."],
        "vivaQuestions": [{"question": "What role does \"measure\" (m) play in the Porter algorithm?",
                            "modelAnswer": "It counts VC (vowel-consonant) sequences in the stem and gates whether "
                                           "certain suffix-stripping rules are allowed to fire, preventing very short words from being over-stemmed."}],
        "challengeExamples": [],
        "advanced": "This project's implementation was cross-verified against nltk.stem.PorterStemmer "
                    "(ORIGINAL_ALGORITHM mode) across 151 test words with zero mismatches — see the Text "
                    "Processing lab for the full comparison.",
    },
    "lemmatization": {
        "name": "Lemmatization",
        "aliases": {"lemma", "lemmatiz"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Lemmatization maps a word to its dictionary base form (its lemma) using "
                       "vocabulary and morphological/grammatical rules, e.g. \"better\" → \"good\", "
                       "\"running\" → \"run\".",
        "simpleMeaning": "Reducing a word to its proper dictionary form, unlike stemming which just chops letters off.",
        "why": "It's usually more accurate than stemming for tasks where a valid, readable word matters "
               "(e.g. displaying results to a user).",
        "examples": [
            {"input": '"better"', "output": '"good"', "explanation": "Lemmatization uses lexical knowledge, so it can map an irregular form to its true root — a stemmer could not do this."},
            {"input": '"mice"', "output": '"mouse"', "explanation": "Irregular plural handled correctly, unlike a suffix-stripping stemmer."},
        ],
        "realWorldApplications": ["Search engines", "Text classification (normalizing vocabulary)", "Chatbots"],
        "relatedConcepts": ["stemming", "morphology"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Confusing lemmatization with stemming — lemmatization needs a vocabulary/POS context, stemming is purely rule-based on the surface string."],
        "vivaQuestions": [{"question": "Why can lemmatization correctly handle \"better\" → \"good\" but stemming cannot?",
                            "modelAnswer": "Lemmatization consults linguistic/vocabulary knowledge about irregular forms, "
                                           "while stemming only strips suffixes from the surface string with no dictionary."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "morphology": {
        "name": "Morphology",
        "aliases": {"morpholog", "inflectional morphology", "derivational morphology", "prefix", "suffix"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "intermediate",
        "definition": "Morphology is the study of word structure — how words are built from morphemes "
                       "(prefix + root + suffix). Inflectional morphology changes grammatical properties "
                       "(tense, number) without changing word class (\"walk\" → \"walked\"); derivational "
                       "morphology creates a new word, often a new word class (\"happy\" → \"happiness\").",
        "simpleMeaning": "Breaking a word down into its smallest meaningful pieces: prefix, root, and suffix.",
        "why": "Understanding morpheme structure lets an NLP system recognize related word forms and "
               "generalize to words it hasn't seen before.",
        "examples": [
            {"input": '"unhappiness"', "output": "prefix: un- | root: happy | suffix: -ness",
             "explanation": "\"un-\" negates, \"happy\" is the root, \"-ness\" turns the adjective into a noun — a derivational change."},
            {"input": '"walked"', "output": "root: walk | suffix: -ed (past tense)",
             "explanation": "An inflectional change — the word class stays a verb, only tense changes."},
        ],
        "realWorldApplications": ["Spell checkers", "Stemming/lemmatization systems", "Morphologically rich language processing (e.g. Hindi, Marathi)"],
        "relatedConcepts": ["stemming", "lemmatization"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Confusing inflectional and derivational morphology — inflection never changes the word's part of speech, derivation often does."],
        "vivaQuestions": [{"question": "Is \"-ed\" in \"walked\" inflectional or derivational? Why?",
                            "modelAnswer": "Inflectional — it changes tense (grammatical property) but \"walked\" is still a verb, same word class as \"walk\"."}],
        "challengeExamples": ["Break down \"internationalization\" into its morphemes and classify each as inflectional or derivational."],
        "advanced": "A Finite State Transducer (FST) is the classical way to model morphology computationally: "
                    "it maps between surface form and underlying lexical form (e.g. \"boxes\" ⟷ \"box +N +PL\") "
                    "via a two-tape automaton. This project's morphology tool uses simpler rule-based decomposition rather than a full FST.",
    },
    "fst": {
        "name": "Finite State Transducer (FST)",
        "aliases": {"fst", "finite state transducer"},
        "category": "text_processing",
        "labRoute": None,
        "difficulty": "advanced",
        "definition": "A Finite State Transducer is a two-tape automaton that maps strings on an input "
                       "tape to strings on an output tape, classically used to model morphological "
                       "analysis and generation (surface form ⟷ lexical form).",
        "simpleMeaning": "A machine that translates one string into another by following states, used for morphology.",
        "why": "It gives a compact, reversible way to both analyze (\"boxes\" → \"box+N+PL\") and generate "
               "(\"box+N+PL\" → \"boxes\") word forms with the same model.",
        "examples": [{"input": "surface: \"boxes\"", "output": "lexical: box +N +PL",
                       "explanation": "The FST reads the surface string and outputs its morphological analysis."}],
        "realWorldApplications": ["Spell checkers", "Morphological analyzers for morphologically rich languages"],
        "relatedConcepts": ["morphology"],
        "prerequisiteConcepts": ["morphology"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": "This project does not implement a full FST — its Morphology tool uses direct rule-based "
                    "decomposition instead, which is simpler but less general than a true transducer.",
    },
    "edit_distance": {
        "name": "Edit Distance (Levenshtein Distance)",
        "aliases": {"edit distance", "levenshtein"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "intermediate",
        "definition": "Edit distance (Levenshtein distance) is the minimum number of single-character "
                       "insertions, deletions, and substitutions needed to transform one string into "
                       "another, computed via dynamic programming.",
        "simpleMeaning": "How many single-letter edits it takes to turn one word into another.",
        "why": "It gives a precise numeric measure of how similar two strings are — the basis for spell-checking and fuzzy matching.",
        "examples": [
            {"input": '"kitten" → "sitting"', "output": "3",
             "explanation": "substitute k→s, substitute e→i, insert g — 3 edits total."},
        ],
        "realWorldApplications": ["Spell checkers", "DNA sequence alignment", "Fuzzy search/autocomplete"],
        "relatedConcepts": ["tokenization"],
        "prerequisiteConcepts": [],
        "formula": "D(i,j) = min( D(i-1,j)+1, D(i,j-1)+1, D(i-1,j-1)+cost(i,j) )",
        "formulaExplanation": "D(i,j) is the edit distance between the first i characters of one string and "
                               "the first j of the other; cost(i,j) is 0 if the characters match, else 1 for a substitution.",
        "codeExample": "def edit_distance(a, b):\n"
                        "    m, n = len(a), len(b)\n"
                        "    dp = [[0]*(n+1) for _ in range(m+1)]\n"
                        "    for i in range(m+1): dp[i][0] = i\n"
                        "    for j in range(n+1): dp[0][j] = j\n"
                        "    for i in range(1, m+1):\n"
                        "        for j in range(1, n+1):\n"
                        "            cost = 0 if a[i-1] == b[j-1] else 1\n"
                        "            dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)\n"
                        "    return dp[m][n]\n",
        "commonMistakes": ["Forgetting to initialize the first row/column of the DP table to 0..n (base case: transforming to/from an empty string)."],
        "vivaQuestions": [{"question": "What do the first row and column of the edit-distance DP table represent?",
                            "modelAnswer": "The cost of transforming a prefix into (or from) the empty string — "
                                           "purely insertions or deletions, so row i / column j is initialized to i / j."}],
        "challengeExamples": ["Compute the full DP matrix and edit distance for \"intention\" → \"execution\" by hand."],
        "advanced": None,
    },
    "normalization": {
        "name": "Text Normalization",
        "aliases": {"normaliz", "normalisation"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Text normalization converts text into a consistent standard form — typically "
                       "lowercasing, removing/standardizing punctuation, and expanding contractions or abbreviations.",
        "simpleMeaning": "Cleaning text into one consistent format before further processing.",
        "why": "Without normalization, \"NLP\" and \"nlp\" would be treated as different tokens, breaking matching and counting.",
        "examples": [{"input": '"NLP is COOL!!"', "output": '"nlp is cool"',
                       "explanation": "Lowercased and punctuation stripped so it matches other occurrences of the same words."}],
        "realWorldApplications": ["Search engines", "Any counting/matching-based NLP pipeline"],
        "relatedConcepts": ["tokenization", "stop_words"],
        "prerequisiteConcepts": [],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Over-normalizing and losing meaningful information, e.g. lowercasing named entities where case distinguishes meaning (\"US\" the country vs. \"us\" the pronoun)."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "stop_words": {
        "name": "Stop Words",
        "aliases": {"stop word", "stopword"},
        "category": "text_processing",
        "labRoute": "/preprocessing",
        "difficulty": "beginner",
        "definition": "Stop words are common function words (\"the\", \"is\", \"and\", \"of\") that carry "
                       "little topic-specific meaning and are often filtered out before frequency-based analysis.",
        "simpleMeaning": "Very common, low-information words that are often removed before analysis.",
        "why": "Removing them stops frequency counts and search relevance being dominated by words that appear in every document regardless of topic.",
        "examples": [{"input": '"the cat is on the mat"', "output": '["cat", "mat"]',
                       "explanation": "\"the\", \"is\", and \"on\" are removed as stop words, leaving the content-bearing words."}],
        "realWorldApplications": ["Search indexing", "TF-IDF / summarization (this project's summarizer reuses the same stop-word set)"],
        "relatedConcepts": ["tokenization", "tfidf"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Removing stop words before a task (like parsing) where function words are grammatically essential."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },

    # -------------------------------------------------------------- LANGUAGE MODELING
    "ngram": {
        "name": "N-grams",
        "aliases": {"n-gram", "ngram", "bigram", "trigram", "unigram"},
        "category": "language_modeling",
        "labRoute": "/language-modeling",
        "difficulty": "beginner",
        "definition": "An n-gram is a contiguous sequence of n tokens from a text. A unigram is a "
                       "single token, a bigram is two consecutive tokens, a trigram is three.",
        "simpleMeaning": "A sliding window of N consecutive words, used to model how likely word "
                          "sequences are.",
        "why": "N-grams let a language model estimate how probable a sequence of words is, without "
               "needing to understand meaning — just local word co-occurrence statistics.",
        "examples": [
            {"input": '"I love NLP" (bigrams)', "output": '[("I","love"), ("love","NLP")]',
             "explanation": "Every consecutive pair of tokens becomes one bigram."},
            {"input": '"I love NLP" (trigrams)', "output": '[("I","love","NLP")]',
             "explanation": "With only 3 tokens, there's exactly one trigram."},
        ],
        "realWorldApplications": ["Autocomplete/predictive text", "Speech recognition (ranking candidate transcriptions)", "Spelling correction"],
        "relatedConcepts": ["language_model_probability", "perplexity", "laplace_smoothing"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": 'text = ["I", "love", "NLP"]\nn = 2\nbigrams = [tuple(text[i:i+n]) for i in range(len(text)-n+1)]\nprint(bigrams)  # [(\'I\', \'love\'), (\'love\', \'NLP\')]',
        "commonMistakes": ["Confusing an n-gram (a sequence of tokens) with an n-gram model (the probability model built from n-gram counts)."],
        "vivaQuestions": [{"question": "How many bigrams does an n-token sentence have?",
                            "modelAnswer": "n − 1, since each bigram is a pair of consecutive tokens."}],
        "challengeExamples": ["List every trigram in \"the cat sat on the mat\"."],
        "advanced": None,
    },
    "language_model_probability": {
        "name": "Language Model Probability",
        "aliases": {"language model", "conditional probability", "sentence probability", "unsmoothed"},
        "category": "language_modeling",
        "labRoute": "/language-modeling",
        "difficulty": "intermediate",
        "definition": "An n-gram language model estimates the probability of a word given the "
                       "preceding n-1 words using the conditional probability formula "
                       "P(wᵢ | wᵢ₋₁) = Count(wᵢ₋₁, wᵢ) / Count(wᵢ₋₁) for a bigram model, and the "
                       "probability of a whole sentence as the product of these conditional probabilities (the chain rule).",
        "simpleMeaning": "Estimating how likely a word is to come next, based on counting how often it followed the previous word(s) in a corpus.",
        "why": "This lets a system judge which of several candidate sentences (or transcriptions, or translations) is more like real, fluent language.",
        "examples": [
            {"input": 'Count("the dog")=5, Count("the")=10', "output": "P(dog | the) = 5/10 = 0.5",
             "explanation": "The bigram conditional probability formula applied directly to the counts."},
        ],
        "realWorldApplications": ["Speech recognition (ranking transcriptions)", "Machine translation (fluency scoring)", "Autocomplete"],
        "relatedConcepts": ["ngram", "laplace_smoothing", "perplexity"],
        "prerequisiteConcepts": ["ngram"],
        "formula": "P(wᵢ | wᵢ₋₁) = Count(wᵢ₋₁, wᵢ) / Count(wᵢ₋₁)",
        "formulaExplanation": "The probability of word wᵢ following wᵢ₋₁ is the number of times that exact "
                               "pair occurred, divided by the number of times wᵢ₋₁ occurred at all.",
        "codeExample": None,
        "commonMistakes": ["Dividing by the total corpus size instead of Count(wᵢ₋₁) — the denominator must be the count of the conditioning context, not the whole corpus."],
        "vivaQuestions": [{"question": "What happens to a bigram model's probability estimate if Count(wᵢ₋₁, wᵢ) = 0?",
                            "modelAnswer": "The estimate is exactly 0, even if the pair is merely unseen rather "
                                           "than impossible — this is why smoothing techniques like Laplace smoothing exist."}],
        "challengeExamples": [],
        "advanced": "Sentence probability is computed via the chain rule: "
                    "P(w₁...wₙ) = ∏ᵢ P(wᵢ | w₁...wᵢ₋₁), which an n-gram model approximates by truncating "
                    "the conditioning context to just the previous n−1 words (the Markov assumption).",
    },
    "laplace_smoothing": {
        "name": "Laplace Smoothing",
        "aliases": {"laplace", "add-one smoothing", "smoothing"},
        "category": "language_modeling",
        "labRoute": "/language-modeling",
        "difficulty": "intermediate",
        "definition": "Laplace (add-one) smoothing adds 1 to every n-gram count before computing "
                       "probabilities, so unseen n-grams get a small non-zero probability instead of "
                       "exactly zero.",
        "simpleMeaning": "Pretending every possible word pair was seen at least once, so unseen ones "
                          "aren't given zero probability.",
        "why": "An unsmoothed model assigns probability 0 to any sequence containing an unseen n-gram, "
               "which is too harsh — a sentence isn't impossible just because this exact pair wasn't in training data.",
        "examples": [{"input": "V=1000 words, Count(the dog)=5, Count(the)=10",
                       "output": "P(dog|the) = (5+1)/(10+1000) = 0.00594",
                       "explanation": "Add 1 to the numerator and V (vocabulary size) to the denominator."}],
        "realWorldApplications": ["Any language model needing to handle unseen word combinations gracefully"],
        "relatedConcepts": ["language_model_probability", "ngram"],
        "prerequisiteConcepts": ["language_model_probability"],
        "formula": "P_Laplace(wᵢ | wᵢ₋₁) = (Count(wᵢ₋₁, wᵢ) + 1) / (Count(wᵢ₋₁) + V)",
        "formulaExplanation": "V is the vocabulary size. Adding 1 to every count and V to every denominator "
                               "keeps probabilities summing to 1 while guaranteeing no zero probabilities.",
        "codeExample": None,
        "commonMistakes": ["Forgetting to add V (not just 1) to the denominator — this is required to keep the distribution valid (summing to 1)."],
        "vivaQuestions": [{"question": "Why do we add V, not just 1, to the denominator in Laplace smoothing?",
                            "modelAnswer": "Because we added 1 to the count of every one of the V possible "
                                           "words that could follow, so the total added to the denominator must be V for probabilities to still sum to 1."}],
        "challengeExamples": [],
        "advanced": "Laplace smoothing is simple but over-smooths in practice — it shifts too much "
                    "probability mass to unseen events when V is large. Good-Turing discounting and "
                    "Kneser-Ney smoothing are more sophisticated alternatives used in production systems.",
    },
    "good_turing_discounting": {
        "name": "Good-Turing Discounting",
        "aliases": {"good-turing", "good turing"},
        "category": "language_modeling",
        "labRoute": None,
        "difficulty": "advanced",
        "definition": "Good-Turing discounting re-estimates the probability of n-grams seen r times "
                       "using the count of n-grams seen r+1 times, reassigning some probability mass "
                       "to unseen events based on how many n-grams were seen exactly once.",
        "simpleMeaning": "A smarter alternative to Laplace smoothing that uses how many rare things you "
                          "saw to estimate how much probability to reserve for things you haven't seen yet.",
        "why": "It generally gives more accurate probability estimates than add-one smoothing, especially with large vocabularies.",
        "examples": [],
        "realWorldApplications": ["Production-grade statistical language models"],
        "relatedConcepts": ["laplace_smoothing"],
        "prerequisiteConcepts": ["laplace_smoothing"],
        "formula": "r* = (r+1) · N_{r+1} / N_r",
        "formulaExplanation": "r* is the adjusted count for n-grams originally seen r times; N_r is the "
                               "number of distinct n-grams seen exactly r times.",
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": "This project's Language Modeling lab implements unsmoothed and Laplace-smoothed models "
                    "only; Good-Turing is covered here conceptually since it is not implemented in the lab.",
    },
    "perplexity": {
        "name": "Perplexity",
        "aliases": {"perplexity"},
        "category": "language_modeling",
        "labRoute": "/language-modeling",
        "difficulty": "intermediate",
        "definition": "Perplexity measures how well a language model predicts a sequence of text: it is "
                       "the inverse probability of the test set, normalized by the number of words.",
        "simpleMeaning": "A score for how \"surprised\" a language model is by a piece of text — lower "
                          "means the model predicted it well.",
        "why": "It gives one number to compare language models: a lower perplexity model assigns higher probability to real, fluent text.",
        "examples": [{"input": "P(sentence) = 0.001, n = 5 words",
                       "output": "PP = 0.001^(-1/5) ≈ 3.98",
                       "explanation": "Perplexity is the probability raised to the power -1/n."}],
        "realWorldApplications": ["Comparing/evaluating language models", "Speech recognition (choosing the least-surprising transcription)"],
        "relatedConcepts": ["language_model_probability", "ngram"],
        "prerequisiteConcepts": ["language_model_probability"],
        "formula": "PP(W) = P(w₁w₂...wₙ)^(-1/n)",
        "formulaExplanation": "W is the word sequence, n is its length, and P(W) is the language model's "
                               "probability for the whole sequence. Raising to -1/n normalizes for sentence length.",
        "codeExample": None,
        "commonMistakes": ["Comparing perplexity scores across models trained on different vocabularies/corpora — perplexity is only meaningful for models evaluated under comparable conditions."],
        "vivaQuestions": [{"question": "What does a perplexity of 1 mean?",
                            "modelAnswer": "The model assigns probability 1 to the sequence — it's not surprised "
                                           "at all, i.e. perfect prediction (essentially never achieved in practice)."}],
        "challengeExamples": [],
        "advanced": "Perplexity is mathematically the exponential of the cross-entropy of the model's "
                    "distribution against the true distribution: PP(W) = 2^(H(W)) where H is the "
                    "per-word cross-entropy in bits, so minimizing perplexity is equivalent to minimizing cross-entropy loss.",
    },
    "corpus_vocabulary": {
        "name": "Corpus and Vocabulary",
        "aliases": {"corpus", "vocabulary", "open vocabulary", "closed vocabulary", "unknown words"},
        "category": "language_modeling",
        "labRoute": "/language-modeling",
        "difficulty": "beginner",
        "definition": "A corpus is a large collection of text used to train or evaluate an NLP model; "
                       "its vocabulary is the set of distinct words it contains. A closed-vocabulary "
                       "model assumes the test data contains no words outside this set; an "
                       "open-vocabulary model must handle unknown words (often via a special <UNK> token).",
        "simpleMeaning": "The training text (corpus) and the unique set of words it contains (vocabulary).",
        "why": "A model's vocabulary determines what it has ever seen — words outside it (\"unknown "
               "words\") are the reason real systems need a fallback strategy.",
        "examples": [{"input": '"the cat sat on the mat" as a mini-corpus', "output": "vocabulary = {the, cat, sat, on, mat} — size 5",
                       "explanation": "Vocabulary counts distinct words, so \"the\" appearing twice is counted once."}],
        "realWorldApplications": ["Every trained language model or classifier defines vocabulary handling as a design decision"],
        "relatedConcepts": ["ngram", "laplace_smoothing"],
        "prerequisiteConcepts": [],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Confusing corpus size (total word count) with vocabulary size (distinct word count)."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "noisy_channel_model": {
        "name": "Noisy Channel Model",
        "aliases": {"noisy channel"},
        "category": "language_modeling",
        "labRoute": None,
        "difficulty": "advanced",
        "definition": "The noisy channel model treats an observed (possibly corrupted) signal as the "
                       "output of a true message passed through a noisy channel, and recovers the "
                       "most likely original message using Bayes' rule: argmax P(message) · P(signal|message).",
        "simpleMeaning": "A framework for figuring out the most likely \"clean\" input given a corrupted output.",
        "why": "It underlies classical spelling correction and speech recognition: combining how likely a "
               "word is in general (the language model) with how likely a given corruption/mishearing is.",
        "examples": [{"input": "typo \"teh\"", "output": "most likely correction: \"the\"",
                       "explanation": "Combines the language model probability of \"the\" with the probability that \"the\" gets typo'd as \"teh\"."}],
        "realWorldApplications": ["Spelling correction", "Speech recognition", "OCR error correction"],
        "relatedConcepts": ["language_model_probability", "edit_distance"],
        "prerequisiteConcepts": ["language_model_probability"],
        "formula": "ŵ = argmax_w P(w) · P(signal | w)",
        "formulaExplanation": "P(w) is the language model prior; P(signal|w) is the channel/error model — "
                               "together they pick the most probable original word.",
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },

    # ------------------------------------------------------------------- PARSING
    "parsing": {
        "name": "Parsing",
        "aliases": {"parsing", "parse", "syntax", "constituency"},
        "category": "parsing",
        "labRoute": "/parsing",
        "difficulty": "intermediate",
        "definition": "Parsing analyzes a sentence's grammatical structure according to a formal "
                       "grammar, typically producing a parse tree that shows how words group into "
                       "phrases (constituents) and how those phrases combine.",
        "simpleMeaning": "Figuring out the grammatical structure of a sentence — which words form which phrase.",
        "why": "Knowing structure (not just word order) is necessary for correctly interpreting who "
               "did what to whom, and for downstream semantic analysis.",
        "examples": [{"input": '"the cat sat"', "output": "S → NP VP, NP → the cat, VP → sat",
                       "explanation": "The sentence is broken into a noun phrase and a verb phrase, each further decomposed."}],
        "realWorldApplications": ["Grammar checkers", "Machine translation (structural transfer)", "Question answering"],
        "relatedConcepts": ["cyk", "pcfg", "parse_tree"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming there's only ever one valid parse tree per sentence — structural (syntactic) ambiguity is common."],
        "vivaQuestions": [{"question": "What is the difference between top-down and bottom-up parsing?",
                            "modelAnswer": "Top-down starts from the start symbol and expands rules to try to "
                                           "match the sentence; bottom-up starts from the words and combines "
                                           "them upward into larger constituents until reaching the start symbol."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "top_down_bottom_up_parsing": {
        "name": "Top-Down and Bottom-Up Parsing",
        "aliases": {"top-down parsing", "bottom-up parsing", "shift-reduce", "predictive parser"},
        "category": "parsing",
        "labRoute": "/parsing",
        "difficulty": "advanced",
        "definition": "Top-down parsing starts from the grammar's start symbol and expands production "
                       "rules to try to derive the input sentence. Bottom-up parsing (e.g. shift-reduce) "
                       "starts from the input words and repeatedly combines (\"reduces\") them into "
                       "larger constituents until reaching the start symbol.",
        "simpleMeaning": "Two opposite strategies for building a parse tree: starting from the grammar rules downward, or from the words upward.",
        "why": "Each strategy has different efficiency and backtracking trade-offs, which is why "
               "several parsing algorithms exist rather than one universal approach.",
        "examples": [],
        "realWorldApplications": ["Compilers use shift-reduce parsing for programming languages", "NLP syntactic parsers"],
        "relatedConcepts": ["parsing", "cyk"],
        "prerequisiteConcepts": ["parsing"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming shift-reduce parsing is unique to NLP — it's also the classical technique behind most programming-language compilers."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "earley_parser": {
        "name": "Earley Parser",
        "aliases": {"earley parser", "earley"},
        "category": "parsing",
        "labRoute": None,
        "difficulty": "advanced",
        "definition": "The Earley parser is a chart-parsing algorithm that can parse any context-free "
                       "grammar (not just Chomsky Normal Form) in O(n³) time using a table of "
                       "predict/scan/complete operations.",
        "simpleMeaning": "A general parsing algorithm that doesn't require the grammar to be converted into a special normal form first.",
        "why": "Unlike CYK, it works directly on grammars in their natural form, which is convenient "
               "when converting to CNF is undesirable.",
        "examples": [],
        "realWorldApplications": ["General-purpose CFG parsing where CNF conversion is impractical"],
        "relatedConcepts": ["cyk", "parsing"],
        "prerequisiteConcepts": ["parsing"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": "This project's Parsing Lab implements CYK (which requires CNF) rather than Earley — "
                    "Earley is covered here conceptually as the CNF-free alternative.",
    },
    "cyk": {
        "name": "CYK Algorithm",
        "aliases": {"cyk", "cocke-younger-kasami"},
        "category": "parsing",
        "labRoute": "/parsing",
        "difficulty": "advanced",
        "definition": "The CYK (Cocke-Younger-Kasami) algorithm parses a sentence against a "
                       "context-free grammar in Chomsky Normal Form (CNF) using dynamic programming, "
                       "filling a triangular chart where cell [i,j] holds every non-terminal that can "
                       "derive the substring spanning i..j.",
        "simpleMeaning": "A table-filling method for figuring out whether (and how) a sentence fits a grammar.",
        "why": "It's guaranteed to find a valid parse (if one exists) in polynomial time, using dynamic "
               "programming instead of trying every possible tree structure by brute force.",
        "examples": [{"input": 'Grammar: S→NP VP, NP→"the" N, VP→V NP | "sat", N→"cat", V→"sat"; sentence "the cat sat"',
                       "output": "cell[0,3] contains S — the full sentence parses successfully",
                       "explanation": "CYK builds up from single-word spans to the full-sentence span, combining adjacent cells per grammar rule."}],
        "realWorldApplications": ["Formal grammar-checking systems", "Foundation for statistical PCFG parsers"],
        "relatedConcepts": ["parsing", "pcfg", "parse_tree"],
        "prerequisiteConcepts": ["parsing"],
        "formula": "chart[i,j] = { A | A → BC ∈ grammar, B ∈ chart[i,k], C ∈ chart[k,j], for some split k }",
        "formulaExplanation": "For every way of splitting the span [i,j] into two adjacent sub-spans, if a "
                               "rule A→BC exists and B/C match those sub-spans, A is added to chart[i,j].",
        "codeExample": None,
        "commonMistakes": ["Forgetting the grammar must first be converted to Chomsky Normal Form (every rule "
                            "is A→BC or A→\"terminal\") — CYK does not work directly on arbitrary CFGs.",
                            "Reporting failure without checking every possible split point k for a span."],
        "vivaQuestions": [{"question": "Why must the grammar be in Chomsky Normal Form for CYK to work?",
                            "modelAnswer": "CYK's dynamic-programming recurrence only knows how to combine "
                                           "exactly two adjacent sub-spans per rule (A→BC), so every production "
                                           "must be binary (or a single terminal) — arbitrary-length right-hand sides break the recurrence."}],
        "challengeExamples": ["Given a small CNF grammar and the sentence \"the dog chased the cat\", fill in the CYK chart cell by cell and state whether it parses.",
                               "Given a filled CYK chart, reconstruct one valid parse tree from it."],
        "advanced": "CYK runs in O(n³ · |G|) time where n is sentence length and |G| is grammar size — "
                    "the n³ factor comes from choosing a start position i, an end position j, and a split point k for every span.",
    },
    "pcfg": {
        "name": "PCFG (Probabilistic Context-Free Grammar)",
        "aliases": {"pcfg", "probabilistic context-free grammar", "probabilistic grammar"},
        "category": "parsing",
        "labRoute": "/parsing",
        "difficulty": "advanced",
        "definition": "A Probabilistic Context-Free Grammar attaches a probability to every production "
                       "rule (probabilities for all rules sharing a left-hand side sum to 1), so among "
                       "multiple valid parses for an ambiguous sentence, the parser can rank them by "
                       "total probability.",
        "simpleMeaning": "A grammar where each rule also has a likelihood attached, so the parser can pick the most probable parse when several are grammatically valid.",
        "why": "Real sentences are often structurally ambiguous; a plain CFG can't say which parse is "
               "more likely — a PCFG can, by multiplying rule probabilities along each candidate tree.",
        "examples": [{"input": "S→NP VP [1.0], VP→V NP [0.7], VP→V NP PP [0.3]",
                       "output": "a parse using VP→V NP is preferred over VP→V NP PP unless the PP clearly attaches elsewhere",
                       "explanation": "Each full parse tree's probability is the product of the probabilities of every rule used in it."}],
        "realWorldApplications": ["Statistical parsers used in real NLP systems (choosing among ambiguous parses)"],
        "relatedConcepts": ["cyk", "parsing"],
        "prerequisiteConcepts": ["cyk"],
        "formula": "P(tree) = ∏ (rule probabilities used in the tree)",
        "formulaExplanation": "Multiply the probability of every production rule used to derive the tree; "
                               "the highest-probability tree among all valid parses is selected.",
        "codeExample": None,
        "commonMistakes": ["Forgetting that probabilities are per left-hand-side symbol and must sum to 1 across all of that symbol's rules."],
        "vivaQuestions": [{"question": "How does a PCFG resolve syntactic ambiguity that a plain CFG cannot?",
                            "modelAnswer": "It assigns a probability to every rule, so competing parse trees "
                                           "get a total probability (product of their rules' probabilities), and the parser picks the highest-scoring one."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "parse_tree": {
        "name": "Parse Tree",
        "aliases": {"parse tree", "syntax tree"},
        "category": "parsing",
        "labRoute": "/parsing",
        "difficulty": "beginner",
        "definition": "A parse tree is a hierarchical tree representation of a sentence's grammatical "
                       "structure, with the sentence as the root, phrases as internal nodes, and words as leaves.",
        "simpleMeaning": "A tree diagram showing how a sentence's words group into phrases.",
        "why": "It makes grammatical structure explicit and machine-readable, rather than implicit in word order alone.",
        "examples": [{"input": '"the cat sat"', "output": "S\n├── NP\n│   └── \"the cat\"\n└── VP\n    └── \"sat\"",
                       "explanation": "The root S splits into a noun phrase and a verb phrase, each expanding down to the actual words."}],
        "realWorldApplications": ["Grammar-aware search", "Machine translation", "Text-to-speech phrasing"],
        "relatedConcepts": ["parsing", "cyk"],
        "prerequisiteConcepts": ["parsing"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },

    # ----------------------------------------------------------------- SEMANTICS
    "semantics": {
        "name": "Semantics",
        "aliases": {"semantics", "meaning representation"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "Semantics is the study of meaning in language — how words, phrases, and "
                       "sentences convey meaning, independent of the syntactic structure that carries it.",
        "simpleMeaning": "The study of what words and sentences actually mean.",
        "why": "Correct syntax alone doesn't guarantee correct meaning (\"Colorless green ideas sleep "
               "furiously\" is grammatical but nonsensical) — semantics is what lets a system reason about meaning itself.",
        "examples": [{"input": '"He kicked the bucket."', "output": "literal meaning vs. idiomatic meaning (\"he died\")",
                       "explanation": "The same syntax supports two very different semantic interpretations."}],
        "realWorldApplications": ["Question answering", "Search relevance", "Sentiment analysis"],
        "relatedConcepts": ["wsd", "lexical_relations", "wordnet"],
        "prerequisiteConcepts": ["parsing"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "lexical_relations": {
        "name": "Lexical Semantic Relations",
        "aliases": {"synonym", "antonym", "homonym", "polysemy", "hypernym", "hyponym", "meronym", "holonym", "lexical relation"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "Lexical semantic relations describe how word meanings relate: synonymy (same "
                       "meaning, e.g. \"big\"/\"large\"), antonymy (opposite, \"hot\"/\"cold\"), "
                       "homonymy (same spelling, unrelated meanings, \"bank\"), polysemy (same word, "
                       "related meanings, \"paper\" the material vs. \"paper\" the essay), hypernymy/"
                       "hyponymy (is-a, \"animal\"/\"dog\"), and meronymy/holonymy (part-of, \"wheel\"/\"car\").",
        "simpleMeaning": "The different ways word meanings can relate to each other — same, opposite, part-of, or a general/specific pair.",
        "why": "These relations are what a thesaurus or a knowledge graph (like WordNet) formally encodes, enabling similarity and reasoning.",
        "examples": [
            {"input": '"dog" and "animal"', "output": "hyponym / hypernym pair", "explanation": "\"dog\" is a specific kind of \"animal\" (hyponym), and \"animal\" is the general category (hypernym)."},
            {"input": '"wheel" and "car"', "output": "meronym / holonym pair", "explanation": "A wheel is part of a car."},
        ],
        "realWorldApplications": ["Thesaurus/synonym suggestion", "Semantic search", "Knowledge graphs"],
        "relatedConcepts": ["wordnet", "semantics"],
        "prerequisiteConcepts": ["semantics"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Confusing homonymy (unrelated meanings, coincidentally same spelling) with polysemy (related meanings of the same word)."],
        "vivaQuestions": [{"question": "Is \"bank\" (river) vs. \"bank\" (financial institution) homonymy or polysemy?",
                            "modelAnswer": "Homonymy — the two meanings are historically and conceptually unrelated, despite sharing a spelling."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "wordnet": {
        "name": "WordNet",
        "aliases": {"wordnet", "babelnet"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "WordNet is a large lexical database of English that groups words into sets of "
                       "cognitive synonyms (\"synsets\"), each expressing a distinct concept, linked by "
                       "semantic relations like hypernymy, hyponymy, and meronymy.",
        "simpleMeaning": "A big dictionary-like graph connecting words by their meanings and relationships.",
        "why": "It provides a structured, machine-readable source of lexical relations for tasks like "
               "WSD and semantic similarity, rather than requiring relations to be hand-coded per application.",
        "examples": [{"input": '"car"', "output": "synset {car, auto, automobile} → hypernym: motor vehicle",
                       "explanation": "WordNet groups near-synonyms into one synset and links it upward to broader concepts."}],
        "realWorldApplications": ["Word sense disambiguation", "Semantic similarity scoring", "Ontology construction"],
        "relatedConcepts": ["lexical_relations", "wsd", "semantics"],
        "prerequisiteConcepts": ["lexical_relations"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": "BabelNet extends the same synset idea to a large multilingual knowledge graph "
                    "spanning many languages and Wikipedia concepts — this project's WordNet explorer covers English WordNet only.",
    },
    "ontology": {
        "name": "Ontology",
        "aliases": {"ontology", "knowledge graph"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "advanced",
        "definition": "An ontology is a formal, explicit specification of the concepts in a domain and "
                       "the relationships between them — a knowledge graph is one common way to represent an ontology as nodes and edges.",
        "simpleMeaning": "A structured map of concepts in a domain and how they connect to each other.",
        "why": "It gives NLP systems a shared, explicit model of world/domain knowledge to reason over, beyond just word co-occurrence statistics.",
        "examples": [{"input": '"NLP" —is-a→ "AI subfield" —uses→ "Machine Learning"', "output": "a small knowledge-graph fragment",
                       "explanation": "Concepts become nodes and relations become labeled edges."}],
        "realWorldApplications": ["Knowledge graphs (Google Knowledge Graph)", "Question answering over structured facts"],
        "relatedConcepts": ["wordnet", "semantics"],
        "prerequisiteConcepts": ["semantics"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "wsd": {
        "name": "Word Sense Disambiguation (WSD)",
        "aliases": {"word sense", "wsd", "disambiguation", "lesk"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "Word Sense Disambiguation identifies which sense (meaning) of an ambiguous word "
                       "is intended in a given context. The Lesk algorithm is a classical approach that "
                       "picks the candidate sense whose dictionary definition overlaps most with the surrounding context words.",
        "simpleMeaning": "Figuring out which meaning of a word (like \"bank\") is meant, using the surrounding words.",
        "why": "Downstream tasks (translation, QA, search) need the correct sense, not just the word — translating \"bank\" wrong changes meaning entirely.",
        "examples": [{"input": '"I sat by the river bank watching the water."', "output": "sense: river bank (not financial institution)",
                       "explanation": "The Lesk algorithm compares this sentence's words against each sense's dictionary gloss and picks the one with the most word overlap — here, \"river\" and \"water\" overlap heavily with the river-bank sense's definition."}],
        "realWorldApplications": ["Machine translation", "Search query understanding", "Question answering"],
        "relatedConcepts": ["ambiguity", "wordnet", "semantics"],
        "prerequisiteConcepts": ["ambiguity", "wordnet"],
        "formula": "score(sense) = |context_words ∩ gloss_words(sense)|",
        "formulaExplanation": "The simplified Lesk algorithm scores each candidate sense by counting how "
                               "many words the sentence's context shares with that sense's dictionary definition (gloss), and picks the highest-scoring sense.",
        "codeExample": None,
        "commonMistakes": ["Using too small a context window, so there isn't enough word overlap with any gloss to make a confident decision."],
        "vivaQuestions": [{"question": "How does the Lesk algorithm choose between candidate word senses?",
                            "modelAnswer": "It compares the words in the sentence's context against each "
                                           "candidate sense's dictionary definition and picks the sense with the most overlapping words."}],
        "challengeExamples": ["Given the word \"bat\" in \"the bat flew out of the cave at dusk\" and two candidate glosses (flying mammal vs. sports equipment), apply Lesk by hand and pick the correct sense."],
        "advanced": None,
    },
    "tfidf": {
        "name": "TF-IDF",
        "aliases": {"tf-idf", "tfidf", "term frequency"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "TF-IDF (term frequency–inverse document frequency) weighs how important a term "
                       "is to one document within a collection: term frequency rewards words that "
                       "appear often in the document, while inverse document frequency penalizes words "
                       "that appear in many documents across the collection (and are therefore less distinctive).",
        "simpleMeaning": "A score that highlights words that are common in one document but rare across all documents — usually the most topic-relevant words.",
        "why": "It lets a search engine or classifier weigh distinctive words (like \"perplexity\") much "
               "more than words that appear everywhere (like \"the\"), without needing stop-word lists to be perfect.",
        "examples": [{"input": 'term "nlp" appears 3× in a 100-word doc; appears in 2 of 10 total documents',
                       "output": "TF = 3/100 = 0.03, IDF = log(10/2) ≈ 1.61, TF-IDF ≈ 0.048",
                       "explanation": "TF rewards frequent local use; IDF rewards rarity across the corpus; multiplying combines both signals."}],
        "realWorldApplications": ["Search engines (this project's Information Retrieval demo ranks documents by TF-IDF + cosine similarity)", "Document keyword extraction", "Text classification features"],
        "relatedConcepts": ["cosine_similarity", "information_retrieval"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": "TF-IDF(t,d) = TF(t,d) × log(N / DF(t))",
        "formulaExplanation": "TF(t,d) is how often term t appears in document d; N is the total number "
                               "of documents; DF(t) is how many documents contain t at all.",
        "codeExample": None,
        "commonMistakes": ["Forgetting IDF entirely and just using raw term frequency — this makes every common word look artificially important."],
        "vivaQuestions": [{"question": "Why does a word appearing in every document get a low TF-IDF score even if it's frequent?",
                            "modelAnswer": "Its IDF term (log(N/DF)) approaches log(1) = 0 when DF equals N, "
                                           "driving the whole TF-IDF score toward zero regardless of how high its TF is."}],
        "challengeExamples": ["Compute TF-IDF for the word \"parsing\" given its count in one document and its document frequency across a 5-document corpus."],
        "advanced": None,
    },
    "cosine_similarity": {
        "name": "Cosine Similarity",
        "aliases": {"cosine similarity", "cosine"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "intermediate",
        "definition": "Cosine similarity measures how similar two vectors are by computing the cosine "
                       "of the angle between them: 1 means identical direction, 0 means orthogonal (unrelated).",
        "simpleMeaning": "A number from -1 to 1 (0 to 1 for word-count vectors) showing how similar two "
                          "pieces of text are, based on the angle between their word-frequency vectors.",
        "why": "It ignores document length (a long and a short document about the same topic can still "
               "score highly similar), unlike raw distance measures.",
        "examples": [{"input": 'doc A = [1,1,0], doc B = [1,0,1]', "output": "cosine similarity = 0.5",
                       "explanation": "The dot product (1) divided by the product of the vector magnitudes (√2·√2=2) gives 0.5."}],
        "realWorldApplications": ["Search engine ranking", "Document clustering", "Plagiarism detection"],
        "relatedConcepts": ["tfidf", "jaccard_similarity"],
        "prerequisiteConcepts": ["tfidf"],
        "formula": "cos(θ) = (A · B) / (‖A‖ ‖B‖)",
        "formulaExplanation": "A·B is the dot product of the two vectors; ‖A‖ and ‖B‖ are their magnitudes (Euclidean norms).",
        "codeExample": None,
        "commonMistakes": ["Confusing cosine similarity with cosine distance — similarity of 1 means identical, whereas distance of 1 would mean very different."],
        "vivaQuestions": [{"question": "Why is cosine similarity preferred over Euclidean distance for comparing documents of different lengths?",
                            "modelAnswer": "Cosine similarity only measures the angle (direction) between "
                                           "vectors, not their magnitude, so a long document and a short one "
                                           "about the same topic can still have a high similarity score."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "jaccard_similarity": {
        "name": "Jaccard Similarity",
        "aliases": {"jaccard"},
        "category": "semantics",
        "labRoute": "/semantics",
        "difficulty": "beginner",
        "definition": "Jaccard similarity compares two sets by dividing the size of their intersection "
                       "by the size of their union.",
        "simpleMeaning": "How much two sets of words overlap, as a fraction of all the distinct words between them.",
        "why": "It's a simple way to measure overlap between two documents' vocabularies without needing frequency counts, just set membership.",
        "examples": [{"input": 'A={"nlp","is","fun"}, B={"nlp","is","hard"}', "output": "J = |{nlp,is}| / |{nlp,is,fun,hard}| = 2/4 = 0.5",
                       "explanation": "Two shared words out of four total distinct words across both sets."}],
        "realWorldApplications": ["Plagiarism/duplicate detection", "Document similarity when only vocabulary overlap matters"],
        "relatedConcepts": ["cosine_similarity"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": "J(A,B) = |A ∩ B| / |A ∪ B|",
        "formulaExplanation": "Divide the number of shared elements by the total number of distinct elements across both sets.",
        "codeExample": None,
        "commonMistakes": ["Using raw word lists (with duplicates) instead of sets — Jaccard is defined over sets, so repeated words shouldn't be double-counted."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },

    # ------------------------------------------------------------------ DISCOURSE
    "discourse": {
        "name": "Discourse Analysis",
        "aliases": {"discourse", "coherence", "cohesion"},
        "category": "discourse",
        "labRoute": "/discourse",
        "difficulty": "intermediate",
        "definition": "Discourse analysis studies how sentences relate to each other across a text — "
                       "including coherence (logical connectedness of ideas) and cohesion (grammatical/"
                       "lexical links like pronouns and connectives that tie sentences together).",
        "simpleMeaning": "Understanding how sentences connect to form a meaningful, connected text, not just isolated sentences.",
        "why": "A sentence's full meaning often depends on earlier sentences (e.g. what a pronoun refers to) — analyzing sentences in isolation misses this.",
        "examples": [{"input": '"Priya finished her thesis. She celebrated with friends."',
                       "output": "\"She\" refers to \"Priya\" — resolved via coreference",
                       "explanation": "The two sentences are cohesive because \"She\" grammatically links back to \"Priya\"."}],
        "realWorldApplications": ["Summarization (tracking entities across sentences)", "Dialogue systems", "Machine translation of pronouns"],
        "relatedConcepts": ["coreference", "hobbs_algorithm"],
        "prerequisiteConcepts": ["parsing"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "coreference": {
        "name": "Coreference Resolution",
        "aliases": {"coreference", "pronoun", "antecedent", "anaphora"},
        "category": "discourse",
        "labRoute": "/discourse",
        "difficulty": "intermediate",
        "definition": "Coreference resolution identifies which earlier expression (the antecedent) a "
                       "later referring expression — usually a pronoun — refers to. Anaphora is the "
                       "specific case of a pronoun referring back to something mentioned earlier.",
        "simpleMeaning": "Matching a pronoun like \"she\" or \"it\" to the noun it stands for.",
        "why": "Without resolving it, a system can't correctly connect facts stated about a pronoun back to the entity they're really about.",
        "examples": [{"input": '"Riya lost her keys. She was upset."', "output": "\"her\" and \"She\" → \"Riya\"",
                       "explanation": "Both referring expressions are resolved to the same antecedent, \"Riya\", using gender/number agreement and recency."}],
        "realWorldApplications": ["Summarization", "Information extraction", "Dialogue systems"],
        "relatedConcepts": ["discourse", "hobbs_algorithm"],
        "prerequisiteConcepts": ["discourse"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Resolving purely by recency/agreement without any syntactic constraints — this project's Discourse Lab combines a simplified NP chunker with agreement constraints, not agreement alone."],
        "vivaQuestions": [{"question": "What agreement constraints does a coreference resolver typically check?",
                            "modelAnswer": "Number (singular/plural) and gender agreement between the pronoun and its candidate antecedent, plus syntactic constraints ruling out certain positions."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "hobbs_algorithm": {
        "name": "Hobbs Algorithm",
        "aliases": {"hobbs", "hobbs algorithm", "hobbs' algorithm"},
        "category": "discourse",
        "labRoute": "/discourse",
        "difficulty": "advanced",
        "definition": "The Hobbs algorithm (Hobbs, 1978) resolves pronoun references by walking the "
                       "parse trees of the current and preceding sentences in a specific left-to-right, "
                       "breadth-first order, applying syntactic constraints (e.g. binding theory) to "
                       "skip invalid candidates, and returning the first NP that satisfies number/gender agreement.",
        "simpleMeaning": "A specific, ordered tree-search procedure for finding what a pronoun refers to, one of the earliest algorithmic approaches to coreference.",
        "why": "It gives a well-defined, purely syntactic procedure (no semantic reasoning needed) that "
               "performs surprisingly well as a baseline for pronoun resolution.",
        "examples": [{"input": '"John saw a dog. He petted it."', "output": "\"He\"→John, \"it\"→dog",
                       "explanation": "Hobbs's tree-walk finds the nearest agreeing NP candidate for each pronoun in a fixed search order across the current and prior sentence's parse trees."}],
        "realWorldApplications": ["Baseline component of coreference resolution systems"],
        "relatedConcepts": ["coreference", "discourse", "parse_tree"],
        "prerequisiteConcepts": ["coreference", "parse_tree"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming Hobbs uses any semantic/world knowledge — it is a purely syntactic, tree-traversal algorithm."],
        "vivaQuestions": [{"question": "Is the Hobbs algorithm semantic or syntactic in nature?",
                            "modelAnswer": "Purely syntactic — it walks parse trees in a defined search order "
                                           "and applies grammatical constraints, without using word meaning."}],
        "challengeExamples": ["Trace the Hobbs search order by hand for a two-sentence example with two competing pronoun candidates."],
        "advanced": "This project's Discourse Lab implements a simplified version of Hobbs — a simplified "
                    "NP chunker plus agreement constraints and Hobbs-style candidate ranking, explicitly "
                    "labeled as a simplification rather than the full original algorithm.",
    },

    # --------------------------------------------------------------- APPLICATIONS
    "sentiment_analysis": {
        "name": "Sentiment Analysis",
        "aliases": {"sentiment", "sentiment analysis"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "beginner",
        "definition": "Sentiment analysis classifies text as expressing positive, negative, or neutral "
                       "opinion/emotion. A lexicon-based approach scores words against curated "
                       "positive/negative word lists, accounting for negation and intensifiers.",
        "simpleMeaning": "Figuring out whether a piece of text sounds positive, negative, or neutral.",
        "why": "It lets businesses and researchers automatically gauge opinion at scale — impossible to do by manually reading every review or post.",
        "examples": [{"input": '"This product is not good at all."', "output": "Negative (negation flips \"good\")",
                       "explanation": "A negation word before a positive term flips its contribution to the overall score — this project's demo detects this via a preceding-token window."}],
        "realWorldApplications": ["Product review analysis", "Social media brand monitoring", "Customer feedback triage"],
        "relatedConcepts": ["tokenization", "text_classification"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming a lexicon-based approach can detect sarcasm — this project's demo is explicit that it cannot."],
        "vivaQuestions": [{"question": "Why does negation handling matter for lexicon-based sentiment analysis?",
                            "modelAnswer": "Without it, \"not good\" would score positively just from matching "
                                           "\"good\" in the lexicon — negation detection flips or dampens the polarity of the word(s) that follow it."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "text_classification": {
        "name": "Text Classification",
        "aliases": {"text classification", "classify", "classification"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Text classification assigns a predefined category label to a piece of text, "
                       "e.g. via a trained Naive Bayes classifier that estimates P(category|text) "
                       "using word frequency statistics learned from labeled training examples.",
        "simpleMeaning": "Sorting text into categories automatically, based on patterns learned from labeled examples.",
        "why": "It automates routing/organizing large volumes of text (news, support tickets, emails) by topic.",
        "examples": [{"input": '"The team won the championship match last night."', "output": "category: Sports (highest probability)",
                       "explanation": "Words like \"team\", \"won\", \"match\" have high probability under the Sports category in the trained model."}],
        "realWorldApplications": ["News categorization", "Support ticket routing", "Content moderation"],
        "relatedConcepts": ["tfidf", "sentiment_analysis"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": "P(category | text) ∝ P(category) · ∏ P(wordᵢ | category)",
        "formulaExplanation": "Naive Bayes assumes word occurrences are conditionally independent given the "
                               "category, so it multiplies each word's likelihood under that category by the category's prior probability.",
        "codeExample": None,
        "commonMistakes": ["Forgetting Laplace smoothing in the word-likelihood estimates — an unseen word would otherwise give the whole product probability 0."],
        "vivaQuestions": [{"question": "Why is it called \"naive\" Bayes?",
                            "modelAnswer": "Because it naively assumes every word's occurrence is conditionally "
                                           "independent of every other word given the category — an assumption that's false in real language but works well in practice."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "machine_translation": {
        "name": "Machine Translation",
        "aliases": {"machine translation", "translate", "translation"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Machine translation automatically converts text from a source language to a "
                       "target language, preserving meaning as closely as possible.",
        "simpleMeaning": "Automatically converting text from one language into another.",
        "why": "It breaks down language barriers at a scale no team of human translators could match.",
        "examples": [{"input": '"Hello" (en→hi)', "output": '"नमस्ते"', "explanation": "This project's demo uses a real translation service (deep-translator/Google Translate), not a hand-rolled dictionary."}],
        "realWorldApplications": ["Cross-language communication", "Website/document localization", "Real-time captioning"],
        "relatedConcepts": ["parsing", "language_model_probability"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming any translation system supports every language pair equally well — quality varies a lot by language and domain."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": "Modern neural machine translation uses sequence-to-sequence models with attention "
                    "(and, more recently, Transformers), trained end-to-end on large parallel corpora — a "
                    "very different architecture from the classical noisy-channel statistical MT models used historically.",
    },
    "text_summarization": {
        "name": "Text Summarization",
        "aliases": {"summariz", "summary"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Text summarization condenses a document into a shorter version that preserves "
                       "its key information. Extractive summarization (used in this project) selects "
                       "and concatenates the most important existing sentences, scored by word-frequency "
                       "(a Luhn-style approach); abstractive summarization generates new sentences.",
        "simpleMeaning": "Shortening a document down to its most important sentences.",
        "why": "It lets a reader get the gist of a long document (news, research paper, meeting notes) in seconds instead of reading the whole thing.",
        "examples": [{"input": "a 5-sentence article", "output": "the 2 highest-scoring sentences by word-frequency",
                       "explanation": "Extractive summarization picks real sentences verbatim rather than generating new text."}],
        "realWorldApplications": ["News digests", "Research paper abstracts", "Meeting note condensation"],
        "relatedConcepts": ["tfidf", "sentence_segmentation"],
        "prerequisiteConcepts": ["sentence_segmentation"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Confusing extractive (selecting real sentences) with abstractive (generating new sentences) summarization — this project only implements the former."],
        "vivaQuestions": [{"question": "What's the key difference between extractive and abstractive summarization?",
                            "modelAnswer": "Extractive summarization selects existing sentences verbatim from the "
                                           "source; abstractive summarization generates new sentences that may not appear in the source at all."}],
        "challengeExamples": [],
        "advanced": None,
    },
    "information_retrieval": {
        "name": "Information Retrieval",
        "aliases": {"information retrieval", "search engine", "ir"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Information retrieval ranks a collection of documents by relevance to a query, "
                       "classically via the vector-space model: representing both query and documents "
                       "as TF-IDF vectors and ranking documents by cosine similarity to the query.",
        "simpleMeaning": "How a search engine decides which documents best match your search query.",
        "why": "It's the foundational technique behind every keyword search engine, ranking results by measured relevance instead of arbitrary order.",
        "examples": [{"input": 'query "n-gram probability"', "output": "documents about language modeling rank highest by cosine similarity to the query vector",
                       "explanation": "Both the query and every document are converted to TF-IDF vectors, and cosine similarity ranks documents by relevance."}],
        "realWorldApplications": ["Search engines", "Document lookup systems", "Recommendation via content similarity"],
        "relatedConcepts": ["tfidf", "cosine_similarity"],
        "prerequisiteConcepts": ["tfidf", "cosine_similarity"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming IR requires understanding meaning — the classical vector-space model ranks by statistical term overlap, not semantic understanding."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "question_answering": {
        "name": "Question Answering",
        "aliases": {"question answering", "qa system"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Question answering extracts a direct answer to a question from a given passage "
                       "of text, e.g. via keyword-overlap sentence scoring narrowed to a matching named entity type for who/when/where/how-much questions.",
        "simpleMeaning": "Pulling a specific, direct answer out of a passage instead of returning the whole passage.",
        "why": "Users want a precise answer (\"Mumbai University\"), not a whole paragraph to read through themselves.",
        "examples": [{"input": 'Context: "Shruti works at Mumbai University." Question: "Where does Shruti work?"',
                       "output": '"Mumbai University"',
                       "explanation": "The system finds the sentence with the most keyword overlap with the question, then narrows to the LOCATION/ORGANIZATION entity within it."}],
        "realWorldApplications": ["Search engine answer snippets", "Help-desk assistants", "Reading-comprehension systems"],
        "relatedConcepts": ["ner", "discourse"],
        "prerequisiteConcepts": ["ner"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming this is a trained neural QA model — this project's demo is an explicitly heuristic, keyword+NER-based approach."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "chatbot": {
        "name": "Chatbots",
        "aliases": {"chatbot", "conversational agent", "dialogue system"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "beginner",
        "definition": "A chatbot is a program that carries on a conversation with a user, ranging from "
                       "simple rule-based/keyword-matching systems to modern large language models.",
        "simpleMeaning": "A program you can chat with in natural language.",
        "why": "Chatbots automate first-line conversation (FAQs, support, tutoring) at a scale humans can't match.",
        "examples": [{"input": '"What is tokenization?"', "output": "the assistant matches the question to its tokenization knowledge and answers with a definition",
                       "explanation": "This is literally what this NLP Learning Assistant is doing right now."}],
        "realWorldApplications": ["Customer support", "FAQ assistants", "Tutoring systems (like this one)"],
        "relatedConcepts": ["nlp"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming every chatbot is powered by a large language model — this assistant is explicitly rule-based intent detection over a structured knowledge base, not an LLM."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "ner": {
        "name": "Named Entity Recognition (NER)",
        "aliases": {"named entity", "ner", "entity recognition"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Named Entity Recognition finds and labels real-world entities in text — people, "
                       "locations, organizations, dates, money, and more — e.g. via gazetteer lookups and pattern rules.",
        "simpleMeaning": "Finding and tagging names of people, places, organizations, dates, and amounts in text.",
        "why": "It turns unstructured text into structured, queryable facts (who, where, when, how much).",
        "examples": [{"input": '"Dr. Rao joined Mumbai University in March 2020."',
                       "output": "PERSON: Dr. Rao, ORGANIZATION: Mumbai University, DATE: March 2020",
                       "explanation": "\"Mumbai University\" is classified as ORGANIZATION rather than LOCATION "
                                      "by checking organization-suffix words before the location gazetteer, even though \"Mumbai\" alone is a known place name."}],
        "realWorldApplications": ["Document tagging", "News analysis", "Resume parsing"],
        "relatedConcepts": ["question_answering", "document_analysis"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Relying purely on a location gazetteer without checking multi-word organization patterns first — this misclassifies phrases like \"Mumbai University\" as LOCATION instead of ORGANIZATION."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "spam_detection": {
        "name": "Spam Detection",
        "aliases": {"spam", "spam detection", "spam filter"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "beginner",
        "definition": "Spam detection classifies a message as spam or legitimate, e.g. via a heuristic "
                       "checklist of signals (urgency words, promotional language, suspicious punctuation/URL ratios).",
        "simpleMeaning": "Automatically flagging suspicious or unwanted messages.",
        "why": "It protects users from scams and unwanted noise at a volume no human moderator could review individually.",
        "examples": [{"input": '"URGENT!! You won $1,000,000! Click here NOW!!"', "output": "flagged as spam — urgency words, excessive punctuation, promotional language",
                       "explanation": "This project's demo names the exact heuristic signals that fired, rather than a black-box score."}],
        "realWorldApplications": ["Email inboxes", "SMS filtering", "Comment moderation"],
        "relatedConcepts": ["text_classification"],
        "prerequisiteConcepts": ["tokenization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Presenting a heuristic checklist as if it were a trained statistical classifier — this project's demo explicitly labels it as heuristic, not model-derived."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "document_analysis": {
        "name": "Document Analysis",
        "aliases": {"document analysis", "document intelligence"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "intermediate",
        "definition": "Document analysis combines several NLP techniques — NER, sentiment analysis, "
                       "summarization, keyword extraction — to extract a full structured profile from one document at once.",
        "simpleMeaning": "Running several NLP tools together on one document to get entities, sentiment, keywords, and a summary all at once.",
        "why": "Real documents (contracts, reports, long emails) need multiple angles of analysis together, not just one isolated technique.",
        "examples": [{"input": "a long report", "output": "entities + sentiment + top keywords + a short summary, all in one pass",
                       "explanation": "This project's document analysis composes its existing NER, sentiment, and summarization functions rather than reimplementing anything new."}],
        "realWorldApplications": ["Contract review", "Long email triage", "Report analysis"],
        "relatedConcepts": ["ner", "sentiment_analysis", "text_summarization"],
        "prerequisiteConcepts": ["ner", "sentiment_analysis", "text_summarization"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": [],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "social_media_analysis": {
        "name": "Social Media Analysis",
        "aliases": {"social media", "social media analysis", "tweet analysis"},
        "category": "applications",
        "labRoute": "/applications",
        "difficulty": "beginner",
        "definition": "Social media analysis applies NLP techniques like sentiment analysis and NER to "
                       "short, informal posts to track public opinion, brand mentions, or emerging topics.",
        "simpleMeaning": "Using NLP to understand what people are saying and feeling in short social media posts.",
        "why": "It lets brands and researchers monitor public sentiment/topics at a scale far beyond manual reading.",
        "examples": [{"input": '"App keeps crashing every time I open it, so frustrating."',
                       "output": "sentiment: Negative",
                       "explanation": "Lexicon-based sentiment applied directly to an informal, short post — though this approach can't reliably detect sarcasm."}],
        "realWorldApplications": ["Brand monitoring", "Public sentiment tracking", "Trend detection"],
        "relatedConcepts": ["sentiment_analysis", "ner"],
        "prerequisiteConcepts": ["sentiment_analysis"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming lexicon-based sentiment handles sarcasm or slang reliably — it generally does not."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },

    # ---------------------------------------------------------------- DEEP LEARNING
    # Added for the NeuroNLP Nexus expansion (Stage 12) — real content matching what
    # the DL labs themselves implement (a real neuron/activation math in DL
    # Foundations, real convolution in the CNN Lab, real recurrence/gating in the
    # RNN & LSTM Lab, real scaled dot-product attention in the Attention Lab), the
    # same standard every NLP concept above is held to. Nothing below is generic
    # textbook filler disconnected from what this platform actually computes.
    "neuron": {
        "name": "Artificial Neuron",
        "aliases": {"neuron", "artificial neuron", "perceptron", "weighted sum"},
        "category": "deep_learning",
        "labRoute": "/dl-foundations",
        "difficulty": "beginner",
        "definition": "An artificial neuron computes a weighted sum of its inputs plus a bias "
                       "term (z = Σ(x_i · w_i) + b), then passes that value through a nonlinear "
                       "activation function to produce its output.",
        "simpleMeaning": "A tiny calculator: multiply each input by its own importance (weight), "
                          "add them up plus one extra number (bias), then squash the result.",
        "why": "The weighted sum is how a neuron combines evidence from multiple inputs; the "
               "activation function afterward is what lets stacking many neurons approximate "
               "non-linear functions — without it, any number of layers would collapse to one "
               "linear transformation.",
        "examples": [
            {"input": "inputs=[1, 2], weights=[0.5, -0.5], bias=0.1, activation=sigmoid",
             "output": "z = 0.5 − 1.0 + 0.1 = −0.4, output = sigmoid(−0.4) ≈ 0.401",
             "explanation": "The exact computation the DL Foundations neuron calculator runs."},
        ],
        "realWorldApplications": ["The basic building block of every neural network — CNNs, RNNs, and Transformers all stack these."],
        "relatedConcepts": ["activation_function", "gradient_descent", "neural_network"],
        "prerequisiteConcepts": [],
        "formula": "z = Σ(x_i · w_i) + b,  ŷ = activation(z)",
        "formulaExplanation": "x_i are inputs, w_i their weights, b the bias — z is the weighted sum, ŷ the neuron's final output.",
        "codeExample": "z = sum(x * w for x, w in zip(inputs, weights)) + bias\ny_hat = activation(z)  # e.g. sigmoid, relu, tanh",
        "commonMistakes": ["Forgetting the bias term.", "Assuming a neuron without an activation function can learn non-linear patterns."],
        "vivaQuestions": [
            {"question": "Why is a nonlinear activation function necessary after the weighted sum?",
             "modelAnswer": "Without it, stacking layers is mathematically equivalent to a single linear layer — nonlinearity is what lets a network represent complex, non-linear functions."},
        ],
        "challengeExamples": ["Given inputs [1, -1], weights [0.3, 0.7], bias 0.0, and ReLU activation, what is the neuron's output?"],
        "advanced": None,
    },
    "activation_function": {
        "name": "Activation Function",
        "aliases": {"activation function", "sigmoid", "relu", "tanh", "leaky relu", "softmax"},
        "category": "deep_learning",
        "labRoute": "/dl-foundations",
        "difficulty": "beginner",
        "definition": "An activation function is a nonlinear function applied to a neuron's "
                       "weighted sum, shaping its output range and introducing the nonlinearity "
                       "that lets a network learn complex functions. Common choices: sigmoid "
                       "(squashes to (0,1)), tanh (squashes to (−1,1)), ReLU (max(0,z)), and "
                       "softmax (normalizes a whole vector into a probability distribution).",
        "simpleMeaning": "A rule that turns a raw number into the neuron's actual output — "
                          "e.g. ReLU just zeroes out anything negative.",
        "why": "Different activations suit different jobs: sigmoid/softmax for probabilities, "
               "ReLU for hidden layers (cheap to compute, avoids some training issues sigmoid has).",
        "examples": [
            {"input": "relu(-3.5)", "output": "0.0", "explanation": "ReLU zeroes any negative input."},
            {"input": "sigmoid(0)", "output": "0.5", "explanation": "Sigmoid is centered at 0.5 when z=0."},
        ],
        "realWorldApplications": ["Every layer of every real neural network uses one."],
        "relatedConcepts": ["neuron", "cnn"],
        "prerequisiteConcepts": ["neuron"],
        "formula": "sigmoid(z) = 1/(1+e^−z),  relu(z) = max(0, z),  tanh(z) = (e^z−e^−z)/(e^z+e^−z)",
        "formulaExplanation": "Each activation maps a real number z to a specific output range.",
        "codeExample": "def relu(z):\n    return max(0.0, z)",
        "commonMistakes": ["Using sigmoid in deep hidden layers (vanishing gradients) instead of ReLU.", "Confusing softmax (a whole-vector function) with a per-value activation."],
        "vivaQuestions": [
            {"question": "Why is softmax different from the other activation functions listed?",
             "modelAnswer": "Softmax normalizes an entire vector of values together so they sum to 1 (a probability distribution), while sigmoid/tanh/ReLU are applied independently to each value."},
        ],
        "challengeExamples": [],
        "advanced": "Sigmoid's derivative is at most 0.25, so in a deep network its gradient shrinks "
                    "geometrically layer by layer — the vanishing gradient problem ReLU largely avoids "
                    "(its derivative is exactly 1 for any positive input).",
    },
    "gradient_descent": {
        "name": "Gradient Descent & Backpropagation",
        "aliases": {"gradient descent", "backpropagation", "backprop", "learning rate", "loss function"},
        "category": "deep_learning",
        "labRoute": "/dl-foundations",
        "difficulty": "intermediate",
        "definition": "Gradient descent trains a neuron/network by repeatedly computing how much "
                       "each weight contributed to the current error (the gradient, via the chain "
                       "rule — backpropagation) and nudging every weight a small step "
                       "(learning_rate) in the direction that reduces that error.",
        "simpleMeaning": "Guess, measure how wrong you were, and adjust every weight a little bit "
                          "in the direction that would have made you less wrong — repeat.",
        "why": "It's the mechanism that actually lets a network learn from data, rather than "
               "requiring every weight to be hand-set.",
        "examples": [
            {"input": "one neuron, MSE loss, learning_rate=0.1, 5 epochs",
             "output": "loss decreases epoch over epoch as weights/bias update",
             "explanation": "The DL Foundations Gradient Descent lab runs this exact loop for real, with a live loss chart."},
        ],
        "realWorldApplications": ["How every trained neural network — from a small classifier to GPT — is actually trained."],
        "relatedConcepts": ["neuron", "activation_function"],
        "prerequisiteConcepts": ["neuron"],
        "formula": "w_new = w_old − learning_rate × ∂L/∂w",
        "formulaExplanation": "Each weight moves opposite its gradient (the direction of steepest loss increase), scaled by the learning rate.",
        "codeExample": "for epoch in range(epochs):\n    grad = compute_gradient(inputs, weights, bias, y_true)\n    weights = [w - lr * g for w, g in zip(weights, grad.dW)]\n    bias -= lr * grad.db",
        "commonMistakes": ["A learning rate too high overshoots and diverges; too low trains impractically slowly.", "Forgetting that backprop is just the chain rule applied layer by layer, not a separate algorithm from calculus."],
        "vivaQuestions": [
            {"question": "What role does the chain rule play in backpropagation?",
             "modelAnswer": "Backpropagation computes each weight's gradient by chaining the derivative of the loss w.r.t. the output, the output w.r.t. the weighted sum, and the weighted sum w.r.t. that weight — literally the calculus chain rule, applied layer by layer."},
        ],
        "challengeExamples": [],
        "advanced": "In a deep network, backprop applies the chain rule across every layer, so a "
                    "weight in an early layer's gradient is a product of many downstream "
                    "derivatives — which is exactly why activation choice (vanishing/exploding "
                    "gradients) matters so much in deep architectures.",
    },
    "neural_network": {
        "name": "Neural Network (Multi-Layer)",
        "aliases": {"neural network", "multi-layer network", "feedforward network", "hidden layer", "mlp"},
        "category": "deep_learning",
        "labRoute": "/neural-networks",
        "difficulty": "intermediate",
        "definition": "A (feedforward) neural network stacks layers of neurons: each layer's "
                       "neurons take the previous layer's real outputs as their inputs, compute "
                       "their own weighted sums and activations, and pass the result forward — "
                       "from the input layer, through one or more hidden layers, to an output layer.",
        "simpleMeaning": "Many neurons, arranged in layers, each layer feeding its real output "
                          "forward into the next.",
        "why": "A single neuron can only represent simple (near-linear) decision boundaries; "
               "stacking many neurons across layers lets a network approximate far more complex "
               "functions.",
        "examples": [
            {"input": "2 inputs → hidden layer of 3 (ReLU) → output layer of 1 (sigmoid)",
             "output": "a real forward pass through all 4 neurons, layer by layer",
             "explanation": "Exactly what the Neural Network Playground computes and animates."},
        ],
        "realWorldApplications": ["The architecture underlying most classic deep learning systems before CNNs/RNNs/Transformers specialized it further."],
        "relatedConcepts": ["neuron", "cnn", "rnn_lstm"],
        "prerequisiteConcepts": ["neuron", "activation_function"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Believing more layers always helps — deep networks are harder to train and can overfit without enough data/regularization."],
        "vivaQuestions": [],
        "challengeExamples": [],
        "advanced": None,
    },
    "cnn": {
        "name": "Convolutional Neural Network (CNN)",
        "aliases": {"cnn", "convolutional neural network", "convolution", "feature map", "pooling", "max pooling"},
        "category": "deep_learning",
        "labRoute": "/cnn-lab",
        "difficulty": "intermediate",
        "definition": "A CNN slides a small learned filter (kernel) across an input grid (like an "
                       "image), computing a real dot-product at each position to produce a feature "
                       "map, applies a nonlinear activation, then downsamples with pooling "
                       "(max or average) — repeating this to build up increasingly abstract features.",
        "simpleMeaning": "Instead of connecting every pixel to every neuron, a small filter scans "
                          "across the image looking for the same pattern (an edge, a texture) "
                          "everywhere in it.",
        "why": "Weight-sharing (the same filter reused across every position) makes CNNs far more "
               "parameter-efficient than a fully-connected network for grid-like data, and gives "
               "them translation invariance — a pattern is detected regardless of where it appears.",
        "examples": [
            {"input": "4×4 image, 2×2 kernel, stride 1", "output": "a 3×3 feature map",
             "explanation": "Valid convolution: output size = (input − kernel)/stride + 1, computed for real in the CNN Lab."},
        ],
        "realWorldApplications": ["Image classification", "Object detection", "Medical imaging analysis"],
        "relatedConcepts": ["activation_function", "neural_network"],
        "prerequisiteConcepts": ["neuron", "activation_function"],
        "formula": "feature_map[i][j] = Σ_k Σ_l image[i+k][j+l] · kernel[k][l]",
        "formulaExplanation": "Each output cell is the real sum of element-wise products between the kernel and the image window it currently covers.",
        "codeExample": "for i in range(out_h):\n    for j in range(out_w):\n        feature_map[i][j] = sum(\n            image[i+k][j+l] * kernel[k][l]\n            for k in range(kh) for l in range(kw)\n        )",
        "commonMistakes": ["Confusing 'convolution' as CNNs use it with true mathematical convolution — it's technically cross-correlation (no kernel flipping).", "Forgetting pooling reduces spatial size but not the number of channels/filters."],
        "vivaQuestions": [
            {"question": "Why does pooling help after a convolution layer?",
             "modelAnswer": "Pooling reduces the feature map's spatial size (fewer parameters downstream, less overfitting) while keeping the strongest/average activation in each window, giving some tolerance to small shifts in the input."},
        ],
        "challengeExamples": [],
        "advanced": None,
    },
    "rnn_lstm": {
        "name": "RNN & LSTM",
        "aliases": {"rnn", "recurrent neural network", "lstm", "long short-term memory", "hidden state", "gates"},
        "category": "deep_learning",
        "labRoute": "/rnn-lstm-lab",
        "difficulty": "advanced",
        "definition": "A Recurrent Neural Network (RNN) processes a sequence one step at a time, "
                       "carrying a real hidden state forward so each step's computation depends on "
                       "everything seen so far. An LSTM adds four gates (forget, input, candidate, "
                       "output) that let it selectively remember or forget information over much "
                       "longer sequences than a plain RNN can.",
        "simpleMeaning": "A network with a memory that updates as it reads a sequence, one item "
                          "at a time — an LSTM just has finer control over what it keeps or drops.",
        "why": "Plain RNNs struggle to retain information over long sequences (vanishing "
               "gradients through many recurrent steps); LSTM's gates were specifically designed "
               "to fix that.",
        "examples": [
            {"input": "a 3-step sequence through a simple RNN", "output": "3 real hidden states, each depending on the previous one",
             "explanation": "h_t = tanh(W_xh·x_t + W_hh·h_(t-1) + b_h) — the actual recurrence computed in the RNN & LSTM Lab."},
        ],
        "realWorldApplications": ["Time-series forecasting", "Speech recognition", "Early machine translation systems (before attention/Transformers took over)"],
        "relatedConcepts": ["neuron", "activation_function", "attention"],
        "prerequisiteConcepts": ["neuron", "neural_network"],
        "formula": "h_t = activation(W_xh·x_t + W_hh·h_(t-1) + b_h)",
        "formulaExplanation": "The hidden state at each step is a function of the current input AND the previous hidden state — that feedback is the 'recurrent' part.",
        "codeExample": "h = [0.0] * hidden_size\nfor x in sequence:\n    z = matvec(w_xh, x) + matvec(w_hh, h) + b_h\n    h = [activate(v) for v in z]",
        "commonMistakes": ["Thinking an RNN's hidden state is reset between timesteps — it's carried forward.", "Confusing the cell state and hidden state in an LSTM — they're updated by different equations."],
        "vivaQuestions": [
            {"question": "What problem do LSTM gates solve that a plain RNN has?",
             "modelAnswer": "A plain RNN's gradient tends to vanish or explode over many timesteps, making long-range dependencies hard to learn; LSTM's forget/input/output gates let it explicitly control what information persists in the cell state over long sequences."},
        ],
        "challengeExamples": [],
        "advanced": "An LSTM's cell state update, c_t = f_t⊙c_(t-1) + i_t⊙c̃_t, is closer to an additive "
                    "(rather than multiplicative) recurrence, which is precisely what keeps its "
                    "gradient from vanishing as quickly as a plain RNN's across many steps.",
    },
    "attention": {
        "name": "Attention",
        "aliases": {"attention", "attention mechanism", "self-attention", "query key value", "attention weights"},
        "category": "deep_learning",
        "labRoute": "/attention-transformers",
        "difficulty": "advanced",
        "definition": "Attention lets a model weigh how much every position in a sequence should "
                       "influence its representation of every other position. Each token is "
                       "projected into a Query, Key, and Value vector; attention weights are "
                       "computed as softmax(Q·K^T / √d_k), then the output is those weights times V.",
        "simpleMeaning": "For each word, decide how much to 'look at' every other word when "
                          "building its new representation — the weights genuinely sum to 1.",
        "why": "Unlike an RNN, attention gives every position a direct path to every other "
               "position (no information has to pass through many recurrent steps to get there), "
               "which is both more parallelizable and better at long-range dependencies.",
        "examples": [
            {"input": "2 tokens, identity Q/K/V projections", "output": "a real 2×2 attention-weight matrix, rows summing to 1",
             "explanation": "Exactly what the Attention & Transformers Lab computes and displays."},
        ],
        "realWorldApplications": ["Neural machine translation", "Every modern large language model (BERT, GPT, and beyond)"],
        "relatedConcepts": ["transformer", "rnn_lstm"],
        "prerequisiteConcepts": ["neuron"],
        "formula": "Attention(Q,K,V) = softmax(QK^T / √d_k) · V",
        "formulaExplanation": "Q·K^T scores how well each query matches each key; dividing by √d_k keeps the scores from growing too large before softmax; the result weights V.",
        "codeExample": "scores = matmul(Q, transpose(K))\nscaled = [[s / sqrt(d_k) for s in row] for row in scores]\nweights = [softmax(row) for row in scaled]\noutput = matmul(weights, V)",
        "commonMistakes": ["Forgetting the 1/√d_k scaling factor — without it, large dot products push softmax into near-one-hot, tiny-gradient territory.", "Treating attention weights as fixed — they're recomputed from Q/K for every new input."],
        "vivaQuestions": [
            {"question": "Why scale the dot-product scores by 1/√d_k before the softmax?",
             "modelAnswer": "As d_k grows, dot products tend to grow large in magnitude, pushing softmax toward extremely peaked (near one-hot) distributions with tiny gradients; dividing by √d_k keeps the scores in a range where softmax's gradient stays useful."},
        ],
        "challengeExamples": [],
        "advanced": None,
    },
    "transformer": {
        "name": "Transformer",
        "aliases": {"transformer", "transformers", "bert", "gpt", "multi-head attention"},
        "category": "deep_learning",
        "labRoute": "/attention-transformers",
        "difficulty": "advanced",
        "definition": "A Transformer replaces recurrence entirely with (multi-head) self-attention "
                       "layers, letting every position attend to every other position in parallel, "
                       "plus positional encoding (since attention alone has no sense of order) and "
                       "feedforward sublayers. BERT (encoder-only, bidirectional) and GPT "
                       "(decoder-only, autoregressive) are both stacks of this same core block.",
        "simpleMeaning": "A model built entirely out of attention layers instead of recurrence — "
                          "it processes a whole sequence at once rather than one step at a time.",
        "why": "Removing recurrence makes training highly parallelizable (a huge practical win at "
               "scale) and gives every position a direct, short path to every other position.",
        "examples": [
            {"input": "one real attention head, as in the Attention Lab", "output": "the same Q/K/V → scores → softmax → weighted-V computation, repeated across many heads and layers in a real Transformer",
             "explanation": "This platform computes one real head at hand-sized scale; a production Transformer stacks many of them."},
        ],
        "realWorldApplications": ["BERT (search, classification)", "GPT family (text generation, chat, code assistants)", "Most current state-of-the-art NLP systems"],
        "relatedConcepts": ["attention", "rnn_lstm"],
        "prerequisiteConcepts": ["attention"],
        "formula": None, "formulaExplanation": None,
        "codeExample": None,
        "commonMistakes": ["Assuming 'Transformer' and 'attention' are the same thing — attention is the core mechanism; a Transformer is a full architecture built around it, plus positional encoding and feedforward layers.", "Confusing BERT (bidirectional encoder) with GPT (autoregressive decoder) — they're pretrained on different objectives suited to different tasks."],
        "vivaQuestions": [
            {"question": "Why does a Transformer need positional encoding if RNNs don't?",
             "modelAnswer": "An RNN processes tokens in order, so position is implicit in when each token is read; a Transformer's self-attention looks at all positions at once with no inherent notion of order, so position must be added explicitly."},
        ],
        "challengeExamples": [],
        "advanced": "Real Transformers use *multi-head* attention — several independent Q/K/V "
                    "projections computed in parallel and concatenated — so different heads can "
                    "learn to attend to different kinds of relationships (e.g. one head tracking "
                    "syntax, another tracking coreference). This lab's Attention Lab computes one "
                    "head at a time to keep the arithmetic hand-checkable.",
    },
}

# Build a flat alias → concept_id index once at import time for fast topic detection.
ALIAS_INDEX: dict[str, str] = {}
for _cid, _entry in CONCEPTS.items():
    for _alias in _entry["aliases"]:
        ALIAS_INDEX[_alias.lower()] = _cid

# Group concept ids by category, in the order the labs teach them (for suggestions/navigation).
CATEGORY_ORDER = ["foundations", "text_processing", "language_modeling", "parsing", "semantics", "discourse", "applications", "deep_learning"]
CONCEPTS_BY_CATEGORY: dict[str, list[str]] = {cat: [] for cat in CATEGORY_ORDER}
for _cid, _entry in CONCEPTS.items():
    CONCEPTS_BY_CATEGORY[_entry["category"]].append(_cid)
