"""
Concept DNA — the fixed concept-graph catalog.

Mirrors this project's established finite-catalog convention (see
progress_catalog.py / community_catalog.py's own docstrings): a real,
hand-curated list of concepts and relationships, checked against this
codebase's actual pages/labs, never invented topics or routes. Every
`route` below is a real existing frontend route (several reuse an
existing `?tab=`/`?app=`/`#hash` deep link the same way
utils/knowledgeMapCatalog.ts's topics already do — see that file's own
docstring for why several named concepts intentionally share one real
page: this catalog mirrors it exactly, to stay one source of truth rather
than two competing descriptions of the same syllabus).

Three real signal sources feed a concept's computed mastery
(app/algorithms/concept_dna.py does the actual computation — this file
only declares WHICH signal(s) apply to which concept):
  - `module_id`: a real progress_catalog.py module_id — whether the
    student has completed that lesson/lab (LearningProgress).
  - `quiz_id`: set only for the three modules that have a real graded
    quiz today (Module 1/2/3 — see components/dl/ModuleQuiz.tsx's
    `quiz_id="{module_id}-quiz"` convention). None everywhere else —
    never fabricated.
  - `challenge_module`: set only for the four modules the real DL
    Challenges system tags (see challenges_service.DL_MODULES:
    "dl-foundations" | "cnn" | "rnn" | "attention") — a second, more
    granular real signal (per-attempt correctness) where it exists.
Every concept always has a `module_id` (every concept maps to at least
one real trackable lesson); `quiz_id`/`challenge_module` are None for the
large majority where no such graded signal exists yet — concept_dna.py's
scoring is explicitly built to degrade honestly when they're absent
(lesson-completion-only never gets scored as highly as real assessment
performance — see that file's own docstring).
"""
from dataclasses import dataclass, field

Domain = str  # "nlp" | "dl"
RelationshipType = str  # "prerequisite" | "related"


@dataclass(frozen=True)
class Concept:
    id: str
    label: str
    domain: Domain
    description: str
    difficulty: str  # "beginner" | "intermediate" | "advanced"
    route: str
    # Real progress_catalog.py module_id this concept's completion is read
    # from. Always set.
    module_id: str
    # Real quiz_id (see components/dl/ModuleQuiz.tsx), only where a real
    # graded quiz exists.
    quiz_id: str | None = None
    # Real Challenge.module tag (see challenges_service.DL_MODULES), only
    # where the real DL Challenges system covers this concept.
    challenge_module: str | None = None
    prerequisite_ids: tuple[str, ...] = field(default_factory=tuple)
    related_ids: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ConceptEdge:
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    # True only for the small, deliberately curated set of edges that
    # genuinely bridge NLP <-> Deep Learning (point 9 of the spec) — set
    # directly here rather than inferred from source.domain != target.domain,
    # so an edge only counts as a "cross-domain connection" when it's one
    # of the handful actually worth narrating, not every incidental NLP/DL
    # pair that happens to share a `related` tag.
    cross_domain: bool = False
    note: str | None = None


NLP_CONCEPTS: list[Concept] = [
    Concept(
        "tokenization", "Tokenization", "nlp",
        "How raw text is split into meaningful units called tokens — the first step of almost every NLP pipeline.",
        "beginner", "/preprocessing#tokenization", "preprocessing",
    ),
    Concept(
        "morphology", "Morphology (Stemming & Lemmatization)", "nlp",
        "How words are structured and how their forms change — stemming and lemmatization reduce a word to its root.",
        "beginner", "/preprocessing#morphology", "preprocessing",
        prerequisite_ids=("tokenization",), related_ids=("tokenization", "pos-tagging"),
    ),
    Concept(
        "pos-tagging", "POS Tagging", "nlp",
        "Labeling each word with its part of speech using a real Hidden Markov Model and the Viterbi algorithm.",
        "intermediate", "/pos-tagging", "pos-tagging",
        prerequisite_ids=("tokenization",), related_ids=("morphology", "parsing", "ner"),
    ),
    Concept(
        "language-models", "Language Modeling", "nlp",
        "Statistical n-gram models that estimate how likely a sequence of words is.",
        "intermediate", "/language-modeling", "language-modeling",
        prerequisite_ids=("tokenization",), related_ids=("translation",),
    ),
    Concept(
        "parsing", "Parsing", "nlp",
        "Building a sentence's syntactic structure — real bottom-up and top-down parsers.",
        "intermediate", "/parsing", "parsing",
        prerequisite_ids=("pos-tagging",), related_ids=("cyk", "pcfg"),
    ),
    Concept(
        "cyk", "CYK Parsing", "nlp",
        "The CYK chart-parsing algorithm, filling in span by span, bottom-up.",
        "advanced", "/parsing", "parsing",
        prerequisite_ids=("parsing",), related_ids=("pcfg",),
    ),
    Concept(
        "pcfg", "CFG / PCFG", "nlp",
        "Context-free and probabilistic context-free grammars, parsed top-down via leftmost derivation.",
        "advanced", "/parsing", "parsing",
        prerequisite_ids=("parsing",), related_ids=("cyk",),
    ),
    Concept(
        "discourse", "Discourse & Coreference", "nlp",
        "Resolving pronouns to their antecedents with real NP chunking and agreement constraints.",
        "advanced", "/discourse", "discourse",
        prerequisite_ids=("parsing",), related_ids=("qa",),
    ),
    Concept(
        "wsd", "Word Sense Disambiguation", "nlp",
        "Determining which sense of a word is meant in a given context.",
        "intermediate", "/semantics?tab=wsd", "semantics",
        prerequisite_ids=("pos-tagging",), related_ids=("wordnet", "similarity"),
    ),
    Concept(
        "wordnet", "WordNet Relations", "nlp",
        "Exploring real WordNet relations — synonyms, hypernyms, hyponyms — between words and senses.",
        "intermediate", "/semantics?tab=wordnet", "semantics",
        prerequisite_ids=("wsd",), related_ids=("similarity",),
    ),
    Concept(
        "similarity", "Vector Similarity & TF-IDF", "nlp",
        "Representing text as vectors (TF-IDF) and comparing meaning with Jaccard and cosine similarity.",
        "intermediate", "/semantics?tab=similarity", "semantics",
        prerequisite_ids=("tokenization",), related_ids=("wsd", "wordnet", "summarization", "sentiment"),
    ),
    Concept(
        "ner", "Named Entity Recognition", "nlp",
        "Finding and classifying real-world entities — people, places, organizations — in text.",
        "intermediate", "/applications?app=ner", "nlp-applications",
        prerequisite_ids=("pos-tagging",), related_ids=("qa",),
    ),
    Concept(
        "translation", "Machine Translation", "nlp",
        "Translating text between languages with a real translation system.",
        "intermediate", "/applications?app=translation", "nlp-applications",
        prerequisite_ids=("language-models",),
    ),
    Concept(
        "summarization", "Summarization", "nlp",
        "Condensing a long document down to its most important sentences.",
        "intermediate", "/applications?app=summarization", "nlp-applications",
        prerequisite_ids=("similarity",),
    ),
    Concept(
        "sentiment", "Sentiment Analysis", "nlp",
        "Classifying whether text expresses positive, negative, or neutral sentiment.",
        "beginner", "/applications?app=sentiment", "nlp-applications",
        prerequisite_ids=("similarity",),
    ),
    Concept(
        "qa", "Question Answering", "nlp",
        "Pulling an answer span directly out of a passage of text.",
        "advanced", "/applications?app=qa", "nlp-applications",
        prerequisite_ids=("parsing",), related_ids=("ner", "discourse"),
    ),
]

DL_CONCEPTS: list[Concept] = [
    Concept(
        "perceptron-mlp", "Perceptrons & MLPs", "dl",
        "M-P neurons, thresholding logic, the Perceptron learning algorithm, and multi-layer perceptrons.",
        "beginner", "/dl-module-1", "dl-module-1", quiz_id="dl-module-1-quiz",
        related_ids=("neural-networks",),
    ),
    Concept(
        "neural-networks", "Neural Networks", "dl",
        "Designing a multi-layer network and watching a genuine, animated forward pass.",
        "beginner", "/neural-networks", "neural-networks",
        prerequisite_ids=("perceptron-mlp",), related_ids=("activation-functions",),
    ),
    Concept(
        "activation-functions", "Activation Functions", "dl",
        "Sigmoid, tanh, ReLU and leaky ReLU — how a neuron turns its input into an output signal.",
        "beginner", "/dl-foundations", "dl-foundations",
        prerequisite_ids=("neural-networks",), related_ids=("gradient-descent",),
    ),
    Concept(
        "gradient-descent", "Gradient Descent", "dl",
        "A single artificial neuron's real arithmetic — forward pass, loss, gradient, and gradient descent.",
        "intermediate", "/dl-foundations", "dl-foundations", challenge_module="dl-foundations",
        prerequisite_ids=("activation-functions",), related_ids=("backpropagation",),
    ),
    Concept(
        "backpropagation", "Backpropagation", "dl",
        "A real 5-node backprop worked example, propagating error gradients back through a network.",
        "intermediate", "/dl-module-2", "dl-module-2", quiz_id="dl-module-2-quiz",
        prerequisite_ids=("gradient-descent",), related_ids=("cnn", "rnn"),
    ),
    Concept(
        "cnn", "Convolutional Neural Networks", "dl",
        "Real convolution, activation, pooling, and a dense+softmax classification head on an editable grid.",
        "advanced", "/cnn-lab", "cnn-lab", challenge_module="cnn",
        prerequisite_ids=("backpropagation",),
    ),
    Concept(
        "rnn", "Recurrent Neural Networks", "dl",
        "A real recurrent forward pass over an editable sequence.",
        "advanced", "/rnn-lstm-lab", "rnn-lstm-lab", challenge_module="rnn",
        prerequisite_ids=("backpropagation",), related_ids=("lstm",),
    ),
    Concept(
        "lstm", "LSTM", "dl",
        "All four LSTM gates — forget, input, output, and candidate — computed over an editable sequence.",
        "advanced", "/rnn-lstm-lab", "rnn-lstm-lab",
        prerequisite_ids=("rnn",), related_ids=("attention",),
    ),
    Concept(
        "attention", "Attention Mechanism", "dl",
        "Helps a model focus on the most relevant parts of an input — real scaled dot-product attention.",
        "advanced", "/attention-transformers", "attention-transformers", challenge_module="attention",
        prerequisite_ids=("lstm",), related_ids=("transformers",),
    ),
    Concept(
        "transformers", "Transformers", "dl",
        "The architecture built entirely out of attention layers, now behind most modern language models.",
        "advanced", "/attention-transformers", "attention-transformers",
        prerequisite_ids=("attention",),
    ),
    Concept(
        "autoencoders", "Autoencoders", "dl",
        "Autoencoders, sparsity, L2 regularization, and dropout — compressing and reconstructing data.",
        "advanced", "/dl-module-3", "dl-module-3", quiz_id="dl-module-3-quiz",
        prerequisite_ids=("backpropagation",),
    ),
    Concept(
        "dl-applications", "Deep Learning Applications", "dl",
        "Where DL meets NLP in practice, and a real-world showcase connecting the labs that compute it.",
        "intermediate", "/dl-applications", "dl-applications",
        prerequisite_ids=("transformers",),
    ),
]

ALL_CONCEPTS: list[Concept] = NLP_CONCEPTS + DL_CONCEPTS
CONCEPTS_BY_ID: dict[str, Concept] = {c.id: c for c in ALL_CONCEPTS}


def _build_edges() -> list[ConceptEdge]:
    """Expands every concept's own prerequisite_ids/related_ids into the
    flat edge list the API/frontend actually consumes, then layers on the
    small, hand-picked set of real cross-domain bridges (spec point 9) —
    deliberately few and specific rather than every incidental NLP/DL
    pair, so "Your Cross-Domain Connections" stays meaningful instead of
    noisy."""
    edges: list[ConceptEdge] = []
    seen: set[tuple[str, str, str]] = set()

    def add(source: str, target: str, kind: str, cross: bool = False, note: str | None = None) -> None:
        key = (source, target, kind)
        if key in seen:
            return
        seen.add(key)
        edges.append(ConceptEdge(source, target, kind, cross_domain=cross, note=note))

    for concept in ALL_CONCEPTS:
        for prereq_id in concept.prerequisite_ids:
            add(prereq_id, concept.id, "prerequisite")
        for related_id in concept.related_ids:
            add(concept.id, related_id, "related")

    # The curated cross-domain bridges. Each is a `related` edge with
    # cross_domain=True — never a fabricated prerequisite, since none of
    # these DL concepts genuinely require finishing the NLP one first.
    add("similarity", "neural-networks", "related", cross=True,
        note="Vector-space text representations connect to neural network representations.")
    add("language-models", "rnn", "related", cross=True,
        note="Statistical sequence modeling connects to recurrent neural sequence models.")
    add("ner", "transformers", "related", cross=True,
        note="Modern named entity recognition systems are commonly built on transformer architectures.")

    return edges


ALL_EDGES: list[ConceptEdge] = _build_edges()
