import type { BookChapter } from "./bookChapters";

// The real NLP Book content — migrated from the NLP lab pages' own
// TheoryBlock definitions, examples, and tables (see the project doc
// "Digital Books content migration" for the exact source mapping). Every
// definition/example/formula below is reproduced from where it already
// lived in the app; nothing here was invented to fill a chapter. Chapters
// are listed in reading order — reordering this array changes the book's
// chapter numbers but never any deep-link, since those target `id`.
export const NLP_CHAPTERS: BookChapter[] = [
  {
    id: "introduction-to-nlp",
    number: "Chapter 01",
    title: "Introduction to NLP",
    intro: "The concepts every other lab in NeuroNLP Nexus builds on.",
    blocks: [
      {
        kind: "definition",
        text:
          "Natural Language Processing (NLP) is the field concerned with enabling computers to process and derive meaning from human language. It sits at the intersection of linguistics and computer science: a computational system needs a formal grammar to recognize valid sentence structure, plus real-world knowledge to resolve what those sentences actually mean.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Without an explicit grammar, a machine has no principled way to tell a valid sentence from word salad — this is exactly what makes syntax, semantics, and pragmatics separate (but connected) problems, each covered by its own chapter and its own interactive lab in the app.",
      },
      { kind: "subheading", text: "Stages of a classical NLP pipeline" },
      {
        kind: "paragraph",
        text:
          "Classical NLP pipelines process text through a sequence of analysis stages — tokenization first, then grammatical/structural analysis, then meaning-level analysis — each one feeding the next. This book follows that same order: Preprocessing and Tokenization, then POS Tagging and Parsing, then Semantics, Word Sense Disambiguation, and Discourse.",
      },
      {
        kind: "tip",
        label: "Why NLP Is Hard for Indian Languages Too",
        text:
          "English NLP challenges (ambiguity, sparse data for rare constructions, idioms) carry over to Hindi and Marathi, plus additional ones: richer morphology (a single Hindi/Marathi verb form encodes more grammatical information than its English equivalent), freer word order, and — practically — far smaller labeled datasets and pretrained model coverage than English. NeuroNLP Nexus is honest about this rather than implying parity across languages it can't actually back up.",
      },
      { kind: "keyTerms", terms: ["Grammar", "Syntax", "Semantics", "Pragmatics", "Ambiguity"] },
      {
        kind: "thinkAboutIt",
        text: "Could you write a sentence that is grammatically perfect by every rule of English syntax, yet still means nothing at all? What does that tell you about why grammar alone can't be the whole story?",
      },
      {
        kind: "recap",
        points: [
          "NLP sits at the intersection of linguistics and computer science.",
          "A formal grammar is what lets a system tell a valid sentence from word salad.",
          "Syntax, semantics, and pragmatics are separate but connected problems.",
          "NLP's challenges are not English-specific — richer morphology and freer word order make Hindi and Marathi harder in their own ways, on top of having far less labeled data available.",
        ],
      },
    ],
  },
  {
    id: "ambiguity-in-language",
    number: "Chapter 02",
    title: "Ambiguity in Language",
    intro: "Resolving ambiguity is one of the hardest parts of NLP — humans use huge amounts of unstated context machines don't automatically have.",
    blocks: [
      {
        kind: "definition",
        text: "Ambiguity occurs whenever language allows more than one valid interpretation.",
      },
      { kind: "subheading", text: "Lexical Ambiguity" },
      { kind: "paragraph", text: "A single word has more than one possible meaning." },
      {
        kind: "table",
        headers: ["Language", "Example", "Explanation"],
        rows: [
          ["English", '"I went to the bank."', "Bank = financial institution, or river bank."],
          ["Hindi", '"वह आम खाता है।"', '"आम" can mean "mango" (noun) or "common/usual" (adjective).'],
          ["Marathi", '"त्याने पान खाल्लं."', '"पान" can mean "betel leaf" or, in some contexts, a page — context resolves it.'],
        ],
      },
      { kind: "subheading", text: "Syntactic Ambiguity" },
      { kind: "paragraph", text: "A sentence can be parsed into more than one valid grammatical structure." },
      {
        kind: "table",
        headers: ["Language", "Example", "Explanation"],
        rows: [
          ["English", '"I saw the man with the telescope."', "Did I use a telescope to see him, or did he have the telescope?"],
          ["Hindi", '"राधा ने चश्मे से किताब देखी।"', 'Did Radha use glasses to see the book, or is "चश्मे से" describing the book?'],
          ["Marathi", '"रोहनने दुर्बिणीने पक्षी पाहिला."', "Was the binocular the instrument Rohan used, or attached to the bird?"],
        ],
      },
      { kind: "subheading", text: "Semantic Ambiguity" },
      { kind: "paragraph", text: "A sentence has multiple possible meanings even with one grammatical structure." },
      {
        kind: "table",
        headers: ["Language", "Example", "Explanation"],
        rows: [
          ["English", '"Visiting relatives can be annoying."', "Are the relatives who visit annoying, or is the act of visiting them annoying?"],
          ["Hindi", '"वह हर किसी से प्यार करता है।"', "Does he love every specific person, or people in general as a category?"],
          ["Marathi", '"ती सर्वांशी प्रेमाने वागते."', 'Similar generic/specific reading ambiguity around "सर्वांशी" (everyone).'],
        ],
      },
      { kind: "subheading", text: "Pragmatic Ambiguity" },
      { kind: "paragraph", text: "The literal meaning is clear, but the speaker's intent depends on context." },
      {
        kind: "table",
        headers: ["Language", "Example", "Explanation"],
        rows: [
          ["English", '"Can you open the window?"', "Literally a yes/no question about ability, pragmatically a request to act."],
          ["Hindi", '"क्या आप दरवाज़ा बंद कर सकते हैं?"', "Same pattern: a literal capability question read as a polite request."],
          ["Marathi", '"तुम्ही खिडकी उघडू शकता का?"', "Again a literal-ability question functioning as a request."],
        ],
      },
      { kind: "subheading", text: "Referential Ambiguity" },
      { kind: "paragraph", text: "A pronoun or reference could point to more than one possible antecedent." },
      {
        kind: "table",
        headers: ["Language", "Example", "Explanation"],
        rows: [
          ["English", '"John told Peter that he had won."', 'Does "he" refer to John or Peter?'],
          ["Hindi", '"राम ने श्याम से कहा कि वह जीत गया।"', '"वह" (he) could refer to either राम or श्याम.'],
          ["Marathi", '"रामने श्यामला सांगितले की तो जिंकला."', '"तो" (he) is similarly ambiguous between the two names.'],
        ],
      },
      {
        kind: "tip",
        text: "Referential ambiguity is exactly the problem the Discourse & Anaphora Resolution chapter — and the real Discourse Lab — tackles head-on.",
      },
      {
        kind: "thinkAboutIt",
        text: "\"I saw the man with the telescope\" has two valid parses. What piece of real-world context would make one reading far more likely than the other — and how would a machine ever learn that without being told explicitly?",
      },
      {
        kind: "recap",
        points: [
          "Ambiguity occurs whenever language allows more than one interpretation.",
          "Lexical ambiguity is word-level; syntactic is structural; semantic is meaning-level even with one structure; pragmatic depends on speaker intent; referential is about which earlier entity a pronoun points to.",
          "These challenges show up in English, Hindi, and Marathi alike — ambiguity is not an English-specific problem.",
        ],
      },
    ],
  },
  {
    id: "text-preprocessing",
    number: "Chapter 03",
    title: "Text Preprocessing",
    intro: "Tokenization, stemming, lemmatization, and edit distance — the ground-floor text-processing steps every later chapter builds on.",
    blocks: [
      { kind: "subheading", text: "Tokenization" },
      {
        kind: "definition",
        text: "Splitting text into smaller units (tokens), typically words or subwords — splitting text into words, punctuation, and sentences.",
      },
      {
        kind: "tip",
        text: "The app's Text Preprocessing lab compares four real tokenization strategies side by side — whitespace, rule-based, regex, and sentence tokenization — on whatever sentence you enter.",
      },
      { kind: "subheading", text: "Stemming & Lemmatization" },
      {
        kind: "definition",
        text:
          "Stemming chops a word down to a rough root form using fixed suffix-stripping rules, without knowing if the result is a real word. Lemmatization returns the word's actual dictionary form (lemma), which needs more linguistic knowledge.",
      },
      {
        kind: "example",
        text: 'Porter stemmer: "relational" → "relat" (not a real word — that\'s expected, stemming is intentionally crude). Stemming is fast and mechanical ("studies" → "studi"); lemmatization tries to give you a real word ("studies" → "study").',
      },
      {
        kind: "important",
        label: "Why NLP Uses It",
        text: "Both reduce vocabulary size before indexing, search, or classification, so 'run', 'running', and 'ran' can be treated as related.",
      },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Expecting a stemmer to always output a real dictionary word — that's lemmatization's job, and a rule-based lemmatizer is honestly limited (a small irregular-forms list plus regular-suffix rules, not a full lexicon).",
      },
      { kind: "subheading", text: "Edit Distance (Levenshtein)" },
      {
        kind: "definition",
        text:
          "The minimum number of single-character insertions, deletions, or substitutions needed to turn one string into another, computed by dynamic programming.",
      },
      { kind: "example", text: '"kitten" → "sitting" needs 3 edits: substitute k→s, substitute e→i, insert g.' },
      {
        kind: "important",
        label: "Why NLP Uses It",
        text: "Powers spell-checkers, fuzzy search, DNA sequence alignment, and diff tools — anywhere you need to quantify or repair small differences between two strings.",
      },
      {
        kind: "thinkAboutIt",
        text: "If a stemmer can turn \"relational\" into \"relat\" — not even a real word — why would any real search engine still prefer stemming over the more linguistically correct lemmatization?",
      },
      {
        kind: "recap",
        points: [
          "Tokenization splits text into words, punctuation, or sentences.",
          "Stemming is fast and mechanical; lemmatization aims for a real dictionary word.",
          "Edit distance measures the minimum single-character edits to turn one string into another, via dynamic programming.",
        ],
      },
    ],
  },
  {
    id: "pos-tagging",
    number: "Chapter 04",
    title: "Part-of-Speech Tagging",
    intro: "A real Hidden Markov Model, decoded with the real Viterbi dynamic-programming algorithm.",
    blocks: [
      {
        kind: "definition",
        text: "Part-of-speech (POS) tagging assigns a grammatical category — noun, verb, adjective, and so on — to every word in a sentence.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text: "POS tags feed almost every other NLP task — parsing, information extraction, and even the attention patterns inside modern language models all lean on knowing a word's grammatical role.",
      },
      { kind: "subheading", text: "The pipeline" },
      { kind: "flow", steps: ["Tokens", "POS Tags", "Hidden Markov Model", "Transition Matrix", "Emission Matrix", "Initial Probability", "Viterbi Algorithm", "Tagged Sentence"] },
      {
        kind: "paragraph",
        text:
          "The transition matrix stores P(tag_j | tag_i) — the probability of each tag following each other tag, counted from a training corpus with add-one smoothing; every row sums to 1. The emission probabilities store P(word | tag) for each word actually in the sentence.",
      },
      {
        kind: "formula",
        label: "Viterbi Recurrence",
        formula: "Vₜ(j) = maxᵢ [ Vₜ₋₁(i) · aᵢⱼ ] · bⱼ(wordₜ)",
        note: "Computed in log-space (adding instead of multiplying) so scores don't underflow to zero on longer sentences. A higher (less negative) score is more likely.",
      },
      {
        kind: "tip",
        text: "Why Viterbi uses dynamic programming instead of trying every possible tag sequence: it keeps only the single best path into each cell, avoiding exponential blow-up.",
      },
      { kind: "keyTerms", terms: ["Hidden Markov Model", "Transition Matrix", "Emission Matrix", "Viterbi Algorithm"] },
      {
        kind: "thinkAboutIt",
        text: "An HMM tagger's accuracy depends entirely on its training corpus. What should happen when it meets a brand-new word it has never seen in any form — and can you think of a word whose shape/suffix would fool the out-of-vocabulary heuristic?",
      },
      {
        kind: "recap",
        points: [
          "POS tagging assigns a grammatical category to every word in a sentence.",
          "The transition matrix stores P(tag after tag); the emission matrix stores P(word given tag).",
          "Viterbi finds the single highest-probability tag sequence via dynamic programming, not brute-force search over every possible sequence.",
        ],
      },
    ],
  },
  {
    id: "syntax-and-parsing",
    number: "Chapter 05",
    title: "Syntax & Parsing",
    intro: "Two real, independently computed parsers — a CYK bottom-up chart parser and a genuine top-down derivation parser — reaching the same structure two different ways.",
    blocks: [
      {
        kind: "definition",
        text:
          "A CYK bottom-up chart parser starts from the input tokens and combines them upward toward the start symbol, over a grammar in Chomsky Normal Form. A top-down (leftmost-derivation) parser instead starts from the start symbol and expands grammar rules toward the input sentence.",
      },
      {
        kind: "important",
        text: "Both approaches, run against the exact same sentence and the exact same fixed educational grammar, reach the same parse structure — they differ only in which direction they search.",
      },
      {
        kind: "table",
        headers: ["Top-Down", "Bottom-Up"],
        rows: [
          ["Starts with the start symbol", "Starts with the input tokens"],
          ["Root → Leaves", "Leaves → Root"],
          ["Expands grammar rules", "Combines constituents"],
          ["Predictive / derivation-based", "Data / input-driven"],
        ],
      },
      { kind: "keyTerms", terms: ["Chomsky Normal Form", "Nonterminal"] },
      {
        kind: "thinkAboutIt",
        text: "If a bottom-up and a top-down parser are guaranteed to reach the exact same final structure for any sentence a grammar actually generates, why would anyone ever prefer one strategy over the other?",
      },
      {
        kind: "recap",
        points: [
          "CYK (bottom-up) builds spans from individual words upward toward the start symbol.",
          "Top-down parsing expands the start symbol's grammar rules downward toward the input.",
          "Both require a grammar — here, one in Chomsky Normal Form — and a sentence outside that fixed vocabulary is honestly rejected, not silently patched.",
        ],
      },
    ],
  },
  {
    id: "discourse-and-anaphora",
    number: "Chapter 06",
    title: "Discourse & Anaphora Resolution",
    intro: "Given a sentence and a pronoun, find which earlier noun phrase it most likely refers to.",
    blocks: [
      {
        kind: "definition",
        text: "Anaphora resolution: given a pronoun (he, she, it, they, ...), determine which earlier-mentioned entity (its antecedent) it refers to.",
      },
      {
        kind: "example",
        text: '"John gave Ravi the book because he needed it." — "he" should resolve to John or Ravi (a person), "it" should resolve to "the book" (a thing).',
      },
      {
        kind: "important",
        label: "Why It Matters",
        text: "Coreference resolution underlies summarization, question answering, and any task where a system needs to track what a pronoun points back to across a passage.",
      },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Assuming the nearest preceding noun phrase is always the answer — proximity is a strong heuristic, but gender/number/person agreement has to filter the candidates first, or 'it' could 'resolve' to a person.",
      },
      {
        kind: "important",
        label: "An Honest Limitation",
        text:
          "A real Hobbs (1978) algorithm walks a genuine syntactic parse tree. This platform's own parser only handles one fixed toy grammar and can't parse arbitrary sentences, so the Discourse Lab does something real but simpler instead: rule-based noun-phrase chunking plus Hobbs-style nearest-first candidate ranking with gender/number/person agreement constraints. It will get some sentences wrong — an honest limitation of not having a full parser, not a hidden bug.",
      },
      {
        kind: "thinkAboutIt",
        text: "\"The trophy didn't fit in the suitcase because it was too big\" — swap \"trophy\" and \"suitcase\" and \"it\" flips to mean the opposite thing, even though every grammar rule stays identical. Where does the real information needed to resolve \"it\" actually live?",
      },
      {
        kind: "recap",
        points: [
          "Anaphora resolution finds which earlier entity a pronoun refers to.",
          "Agreement (gender/number/person) filters candidates; proximity then ranks what's left.",
          "Hobbs' original algorithm is purely syntactic, with no semantic understanding — it can still be fooled when two candidates agree in gender and number.",
        ],
      },
    ],
  },
  {
    id: "language-modeling",
    number: "Chapter 07",
    title: "Language Modeling",
    intro: "Real n-gram counting and conditional-probability calculation — how likely a sequence of words is.",
    blocks: [
      {
        kind: "definition",
        text:
          "An n-gram language model assigns a probability to a sequence of words by breaking it into a chain of conditional probabilities, each conditioned only on the previous n−1 words (the Markov assumption).",
      },
      {
        kind: "formula",
        label: "Bigram Probability",
        formula: "P(nlp | learns) = count(learns nlp) / count(learns)",
      },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Confusing a bigger n with a better model — larger n needs exponentially more data to avoid zero counts, which is exactly why smoothing exists.",
      },
      { kind: "subheading", text: "Sentence probability & perplexity" },
      {
        kind: "formula",
        label: "Sentence Probability",
        formula: "P(sentence) = Π P(word | previous n−1 words)",
        note: "Including a final end-of-sentence step. With no smoothing, a single unseen n-gram anywhere makes the whole product exactly zero — the textbook motivation for smoothing.",
      },
      {
        kind: "formula",
        label: "Perplexity",
        formula: "Perplexity = P(sentence) ^ (−1/N)",
        note: "The inverse geometric mean of the per-word probabilities — how 'surprised' the model is by the sentence, on average per word. Lower is better.",
      },
      {
        kind: "important",
        text: "A perplexity of K means the model is, on average, as uncertain as if it had to choose uniformly among K equally likely words at each step.",
      },
      { kind: "keyTerms", terms: ["Perplexity", "Corpus", "Context"] },
      {
        kind: "thinkAboutIt",
        text: "If an n-gram model assigns exactly zero probability to any sentence containing one word pair it never saw in training, what happens if you try to build a 10-gram model from a small corpus — and why does that make smoothing non-optional rather than a nice-to-have?",
      },
      {
        kind: "recap",
        points: [
          "An n-gram model estimates sentence probability from counted word sequences in a corpus.",
          "Laplace (add-one) smoothing reserves probability mass for sequences never seen in training.",
          "Perplexity is the standard intrinsic metric for comparing language models — lower means less 'surprised' by real text.",
        ],
      },
    ],
  },
  {
    id: "lexical-semantics",
    number: "Chapter 08",
    title: "Lexical Semantics & Semantic Relations",
    intro: "How individual words carry meaning, and the structural ways two words' meanings can connect.",
    blocks: [
      {
        kind: "definition",
        label: "Lexical Semantics",
        text:
          "The study of word meaning — how individual lexeme units carry meaning, and how a single word can have multiple senses.",
      },
      { kind: "example", text: '"bank" → Sense 1: financial institution, Sense 2: side of a river.' },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Confusing a word's spelling with its meaning — 'bank' is one spelling but at least two unrelated meanings.",
      },
      { kind: "subheading", text: "Semantic relation types" },
      {
        kind: "definition",
        text: "Words relate to each other structurally: synonymy, antonymy, hypernymy/hyponymy, and meronymy/holonymy.",
      },
      {
        kind: "example",
        text: "Animal (hypernym) → Dog (hyponym); Car (holonym) → Wheel (meronym).",
      },
      {
        kind: "important",
        text: "Synonymy and antonymy are symmetric; hypernymy/hyponymy and holonymy/meronymy are directional opposites of each other.",
      },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Mixing up hypernym and hyponym direction — the broader term is the hypernym.",
      },
      { kind: "keyTerms", terms: ["Synonymy", "Antonymy", "Hypernym", "Hyponym", "Meronym", "Holonym", "Polysemy", "Homonymy"] },
      {
        kind: "thinkAboutIt",
        text: "Hypernymy (Animal → Dog) and holonymy (Car → Wheel) both describe a \"bigger thing containing a smaller thing.\" What's actually different about the relationship in each case that justifies treating them as two separate semantic relations?",
      },
      {
        kind: "recap",
        points: [
          "Lexical semantics studies what individual words mean, including multiple senses of one word.",
          "Synonymy/antonymy relate meanings directly; hypernymy/hyponymy and meronymy/holonymy are directional (category vs. instance, whole vs. part).",
        ],
      },
    ],
  },
  {
    id: "word-sense-disambiguation",
    number: "Chapter 09",
    title: "Word Sense Disambiguation & WordNet",
    intro: "Figuring out which meaning of a word is being used right now — and the lexical database built to help.",
    blocks: [
      {
        kind: "definition",
        label: "Word Sense Disambiguation",
        text: "Determining which sense of a word is meant in a specific context.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text: "Getting the wrong sense breaks translation, search, and summarization downstream.",
      },
      {
        kind: "tip",
        label: "Common Mistake",
        text: "Assuming more context always helps — irrelevant context can add noise, not signal.",
      },
      {
        kind: "important",
        label: "Method Used",
        text: "A simplified Lesk algorithm (gloss-overlap counting) — a real, classic WSD method, not a neural model.",
      },
      { kind: "subheading", text: "WordNet" },
      {
        kind: "definition",
        text: "A large lexical database of English that groups words into sets of synonyms (synsets) and links them via semantic relations.",
      },
      {
        kind: "table",
        headers: ["Feature", "WordNet", "BabelNet"],
        rows: [
          ["Primary focus", "English lexical database", "Multilingual semantic network"],
          ["Synsets", "Yes", "Yes"],
          ["Multilingual", "Limited", "Strong"],
          ["Semantic relations", "Yes", "Yes"],
          ["NLP usage", "WSD, semantics", "Multilingual semantics"],
        ],
      },
      {
        kind: "thinkAboutIt",
        text: "The Lesk algorithm picks whichever sense's dictionary gloss overlaps most with the surrounding words. Can you construct a sentence where this would confidently pick the wrong sense anyway?",
      },
      {
        kind: "recap",
        points: [
          "WSD determines which sense of an ambiguous word is meant in context.",
          "The Lesk algorithm disambiguates by counting gloss (definition) overlap between candidate senses and the surrounding context.",
          "WordNet groups English words into synsets linked by semantic relations; BabelNet extends the same idea across languages.",
        ],
      },
    ],
  },
  {
    id: "similarity-and-tfidf",
    number: "Chapter 10",
    title: "Similarity, TF-IDF & Embeddings",
    intro: "How NLP systems measure how close two pieces of text actually are in meaning.",
    blocks: [
      { kind: "subheading", text: "Jaccard Similarity" },
      {
        kind: "definition",
        text: "A set-based similarity measure: the size of the intersection divided by the size of the union of two sets.",
      },
      { kind: "example", text: "A={apple,banana,orange}, B={banana,orange,mango} → J = 2/4 = 0.5" },
      { kind: "tip", text: "Jaccard ignores frequency and word order — it only cares about set membership." },
      { kind: "subheading", text: "Cosine Similarity" },
      {
        kind: "definition",
        text: "A vector-based similarity measure: the cosine of the angle between two vectors.",
      },
      { kind: "formula", formula: "cos(A,B) = A·B / (‖A‖ ‖B‖)" },
      { kind: "tip", text: "Cosine similarity ranges from −1 to 1 for general vectors, but 0 to 1 for non-negative vectors like TF-IDF." },
      { kind: "subheading", text: "TF-IDF" },
      {
        kind: "definition",
        text: "Term Frequency–Inverse Document Frequency: a weighting scheme that boosts words frequent in one document but rare across the whole collection.",
      },
      { kind: "tip", text: "A word appearing in every document gets an IDF near zero — it stops being useful for distinguishing documents." },
      { kind: "subheading", text: "Similarity vs. relatedness" },
      {
        kind: "example",
        text: '"Car — Automobile" are highly similar (near-synonyms). "Car — Road" are related without being similar — connected by association, not shared meaning.',
      },
      { kind: "subheading", text: "Word embeddings (concept overview)" },
      {
        kind: "definition",
        text: "Dense numeric vectors positioned so that semantically similar words sit near each other in that space — e.g. the vector direction from 'man' to 'woman' is conceptually similar to the direction from 'king' to 'queen'.",
      },
      {
        kind: "important",
        label: "Honestly Scoped",
        text: "This is an illustrative concept overview only — no trained embedding model is loaded anywhere in this platform, so no actual vectors are computed here. See the Evolution of Language Models chapter for where embeddings fit historically.",
      },
      { kind: "keyTerms", terms: ["Embedding", "Semantic Similarity", "Relatedness"] },
      {
        kind: "thinkAboutIt",
        text: "\"Car\" and \"Road\" are related but not similar; \"Car\" and \"Automobile\" are similar. Which of those two word pairs would cosine similarity over TF-IDF vectors actually score highly — and which would it likely miss entirely?",
      },
      {
        kind: "recap",
        points: [
          "Jaccard compares sets (overlap ÷ union); cosine compares vectors (angle between them); TF-IDF weights words by how distinctive they are to one document.",
          "Similarity (near-synonymy) and relatedness (association) are different things — a frequent exam/viva distinction.",
          "Word embeddings place similar words near each other in a vector space — a concept this platform explains but does not compute live.",
        ],
      },
    ],
  },
  {
    id: "knowledge-graphs",
    number: "Chapter 11",
    title: "Knowledge Graphs & Ontologies",
    intro: "The rulebook of categories, and the actual web of facts built using it.",
    blocks: [
      {
        kind: "definition",
        text:
          "An ontology formally defines classes, instances, and properties (e.g. 'Dog is-a Mammal is-a Animal'); a knowledge graph is a network of specific facts connecting entities via relations.",
      },
      {
        kind: "example",
        text: "Ontology: Animal → Mammal → Dog (a class hierarchy). Knowledge graph: Riya → studies → NLP (a specific fact).",
      },
      { kind: "keyTerms", terms: ["Ontology", "Knowledge Graph"] },
      {
        kind: "thinkAboutIt",
        text: "An ontology says Dog is-a Mammal is-a Animal. A knowledge graph says Rex is-a Dog owned-by Riya. If you discovered Rex was actually a cat, which structure would you need to change — the ontology, the knowledge graph, or both?",
      },
      {
        kind: "recap",
        points: [
          "An ontology is the rulebook of categories and relationships in a domain.",
          "A knowledge graph is the web of actual facts — nodes as entities, edges as relationships — built on top of that rulebook.",
        ],
      },
    ],
  },
  {
    id: "real-world-nlp",
    number: "Chapter 12",
    title: "Real-World NLP Applications",
    intro: "Where the concepts above actually show up — stated honestly as real/interactive, conceptual-only, or not yet built.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "This platform's Real-World NLP and NLP Learning Hub pages map every concept covered in this book to a concrete application. Rather than claim parity it can't back up, each one is labeled honestly: whether a real backend computes a genuine result, whether the idea is explained but not yet computed here, or whether it was deliberately removed or never built.",
      },
      {
        kind: "table",
        headers: ["Application", "What it does", "Status"],
        rows: [
          ["Sentiment Analysis", "Is this text positive, negative, or neutral?", "Real & interactive — lexicon-based scoring with negation/intensifier handling."],
          ["Text Summarization", "Shorten a document to its most important sentences.", "Real & interactive — extractive (Luhn-style); every summary sentence is verbatim from the source."],
          ["Machine Translation", "Translate text between languages.", "Real & interactive — via a public translation endpoint."],
          ["Information Retrieval", "Rank documents by relevance to a query.", "Real & interactive — TF-IDF + cosine similarity."],
          ["Question Answering", "Extract a direct answer from a passage.", "Real & interactive — heuristic extractive QA, honestly not a trained QA model."],
          ["Named Entity Recognition", "Find people, places, organizations, dates, money.", "Real & interactive — rule-based/gazetteer recognizer."],
          ["Text Classification", "Sort text into categories.", "Real & interactive — a small trained Multinomial Naive Bayes classifier."],
          ["Chatbots", "Hold a conversation about a topic.", "Real & interactive — a context-aware assistant over this app's own NLP/DL knowledge base."],
          ["Topic Modeling / LDA", "Discover topics hiding inside documents.", "Removed by design — this app had a real, working LDA lab earlier; removed in a later redesign to stay focused."],
          ["Text Generation", "Automatically write new text.", "Not built — no generative language model runs in this app, so there is no genuine demo to show."],
        ],
      },
      {
        kind: "thinkAboutIt",
        text: "Several applications here are honestly labeled \"heuristic\" rather than \"trained model.\" Why might a heuristic spam filter still be worth shipping, even knowing a trained classifier would probably outperform it?",
      },
      {
        kind: "recap",
        points: [
          "Most classical NLP concepts in this book connect directly to a real, interactive demo elsewhere in the app.",
          "A few are honestly labeled conceptual-only or not-built rather than faked — status is stated plainly, never implied.",
        ],
      },
    ],
  },
  {
    id: "evolution-of-language-models",
    number: "Chapter 13",
    title: "Evolution of Language Models",
    intro: "A chronological, honest comparison of how NLP has represented and processed text, from raw word counts to modern Transformers.",
    blocks: [
      {
        kind: "important",
        label: "Honesty Note",
        text:
          "This comparison deliberately excludes specific accuracy/benchmark numbers — those depend heavily on dataset, training setup, and model size, and stating a single number here would misrepresent it as a fixed fact. What follows is each approach's real architectural mechanism and the general strengths/limitations that follow directly from it.",
      },
      {
        kind: "table",
        headers: ["Model", "Introduced", "Key mechanism", "Limitations"],
        rows: [
          ["Bag-of-Words / TF-IDF", "1970s–1990s", "Counts word occurrences, optionally IDF-weighted; no word order.", "Ignores word order and context entirely."],
          ["N-gram Language Models", "1980s–1990s", "Estimates a word's probability from a fixed window of preceding words.", "Fixed, small context window; n-gram counts explode with data sparsity."],
          ["Word2Vec", "2013", "Trains a small network to predict a word from its context, keeping the learned weights as dense vectors.", "One fixed vector per word regardless of context."],
          ["RNN / LSTM", "RNN: 1980s · LSTM: 1997", "Carries a hidden state forward one step at a time; LSTM adds gates to control long-term memory.", "Strictly sequential processing; still struggles with very long-range dependencies vs. attention."],
          ["CNN for Text", "2014", "Slides small filters over word embeddings, detecting local n-gram-like patterns anywhere in the sentence.", "A single layer only sees a fixed local window; longer-range structure needs stacking layers."],
          ["Seq2Seq with Attention", "2014–2015", "An RNN encoder/decoder, with attention letting the decoder look back at the most relevant encoder states.", "Still fundamentally sequential — inherits the RNN's step-by-step processing."],
          ["Transformer", "2017", "Replaces recurrence with self-attention — every position attends directly to every other, in parallel.", "Attention cost grows with the square of sequence length; needs explicit positional encoding."],
          ["BERT", "2018", "Transformer encoder layers, pretrained via masked language modeling using context from both directions.", "Not naturally suited to left-to-right generation."],
          ["GPT family", "2018–present", "Transformer decoder layers, pretrained to predict the next word from preceding words only.", "Only sees preceding context at each step; can generate fluent text that is factually wrong."],
        ],
      },
      {
        kind: "thinkAboutIt",
        text: "Every architecture in this chapter's table traded one limitation for another — none is a strict upgrade on the last. What limitation did Transformers introduce that a simple n-gram model never had to worry about in the first place?",
      },
      {
        kind: "recap",
        points: [
          "Text representation moved from counting words, to counting fixed-window sequences, to learned dense vectors, to attention-based models that see the whole sequence at once.",
          "Each step traded one limitation for another — none of these approaches is a strict, unconditional upgrade on the last.",
        ],
      },
    ],
  },
  {
    id: "nlp-and-deep-learning",
    number: "Chapter 14",
    title: "NLP + Deep Learning",
    intro: "How this platform's classical NLP labs and Deep Learning labs genuinely connect, not just sit side by side.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "Every classical NLP concept in this book works with symbolic or count-based representations of text. Deep Learning's contribution is a different kind of representation — dense numeric vectors — and a set of architectures for computing with them. The honest version of 'how NLP uses DL' is a handful of concrete bridges, not a vague claim that they're related.",
      },
      {
        kind: "table",
        headers: ["NLP concept", "Deep Learning concept", "The real connection"],
        rows: [
          ["Cosine/TF-IDF similarity", "A neuron's weighted sum", "Both compare vectors; DL just learns the vector instead of hand-defining it."],
          ["N-gram sequence probability", "RNN/LSTM sequence modeling", "N-grams count fixed windows; RNNs carry a learned hidden state across the whole sequence."],
          ["Pronoun/antecedent resolution", "Token-to-token attention weights", "Both are about which earlier words a model should 'look back' at."],
        ],
      },
      {
        kind: "important",
        text:
          "This is not a claim that this platform's classical NLP labs and DL labs share code or a trained model — they're separate, real implementations. The connection is conceptual: the same underlying problem, solved with two different toolkits.",
      },
      {
        kind: "thinkAboutIt",
        text: "Cosine similarity over TF-IDF vectors and a neuron's weighted sum are both, mechanically, a dot product. Given that, what's actually different between what the two are doing?",
      },
      {
        kind: "recap",
        points: [
          "Deep Learning's core contribution to NLP is a learned, dense vector representation instead of a hand-defined symbolic one.",
          "Three concrete bridges: similarity ↔ weighted sums, n-gram counting ↔ recurrence, pronoun resolution ↔ attention.",
        ],
      },
    ],
  },
  {
    id: "quick-revision",
    number: "Quick Revision",
    title: "Quick Revision",
    intro: "The essentials from every chapter above, condensed for a fast pass before an exam or viva.",
    blocks: [
      {
        kind: "recap",
        points: [
          "NLP = processing + deriving meaning from human language; needs both grammar (structure) and world knowledge (meaning).",
          "Ambiguity: lexical (word), syntactic (structure), semantic (meaning), pragmatic (intent), referential (which entity a pronoun means).",
          "Stemming is crude/mechanical; lemmatization returns a real dictionary word. Edit distance = minimum edits to transform one string into another.",
          "POS tagging via HMM: transition matrix = P(tag|tag), emission matrix = P(word|tag), Viterbi finds the best tag sequence via dynamic programming.",
          "CYK parses bottom-up (tokens → start symbol); top-down parsing expands the start symbol toward the tokens. Both need a fixed grammar.",
          "Anaphora resolution finds a pronoun's antecedent — agreement filters candidates, then proximity ranks them.",
          "N-gram models estimate sentence probability from counted sequences; perplexity measures how 'surprised' a model is, on average, per word.",
          "Synonymy/antonymy are symmetric; hypernymy/hyponymy and meronymy/holonymy are directional (category/instance, whole/part).",
          "WSD (via Lesk) picks the right sense of a word from context; WordNet organizes words into synsets linked by relations.",
          "Jaccard compares sets; cosine compares vector angle; TF-IDF weights a word by how distinctive it is to one document.",
          "An ontology is the rulebook of categories; a knowledge graph is the web of actual facts built on it.",
          "Text representation evolved: word counts → n-grams → learned embeddings → attention/Transformers — each trading one limitation for another.",
          "NLP and Deep Learning connect concretely: similarity↔weighted sums, n-grams↔recurrence, pronoun resolution↔attention.",
        ],
      },
    ],
  },
  {
    id: "glossary",
    number: "Glossary",
    title: "Glossary",
    intro: "Every term this book uses, in one place — the same definitions behind this app's own hover tooltips.",
    blocks: [
      {
        kind: "glossaryList",
        entries: [
          { term: "Morphology", definition: "The study of how words are formed and structured from smaller meaningful units called morphemes." },
          { term: "Ambiguity", definition: "A situation where a word, phrase, or sentence has more than one possible interpretation." },
          { term: "Constituent", definition: "A group of words that function together as a single unit within a sentence's grammatical structure." },
          { term: "Lexeme", definition: "An abstract unit of meaning that underlies a set of related word forms (e.g. run, runs, running, ran all share one lexeme)." },
          { term: "Hyponym", definition: "A word whose meaning is a more specific instance of a more general word (its hypernym)." },
          { term: "Hypernym", definition: "A word whose meaning covers a broader category that includes a more specific word (its hyponym)." },
          { term: "Perplexity", definition: "A measurement of how well a probability model predicts a sample, computed as 2 raised to the average negative log-probability per word." },
          { term: "Grammar", definition: "A formal set of rules that describes how words combine to form valid sentences in a language." },
          { term: "Syntax", definition: "The set of rules governing the structure and arrangement of words to form valid sentences." },
          { term: "Semantics", definition: "The study of meaning in language — what words and sentences actually refer to or mean." },
          { term: "Pragmatics", definition: "The study of how context influences the interpretation of meaning, beyond literal sentence content." },
          { term: "Discourse", definition: "The study of language beyond a single sentence — how sentences connect to form coherent text or conversation." },
          { term: "Tokenization", definition: "The process of splitting text into smaller units (tokens), typically words or subwords." },
          { term: "Chomsky Normal Form", definition: "A restricted grammar form where every production is either A → BC (two nonterminals) or A → a (one terminal). CYK parsing requires a grammar in this form." },
          { term: "Nonterminal", definition: "A grammar symbol (like NP, VP, S) that can be expanded into other symbols via production rules — it never appears in the final sentence itself." },
          { term: "Polysemy", definition: "A single word having multiple related meanings, all stemming from a shared core sense." },
          { term: "Homonymy", definition: "Two or more words that share the same spelling or pronunciation but have completely unrelated meanings." },
          { term: "Synonymy", definition: "A relationship between two words that have the same or nearly the same meaning." },
          { term: "Antonymy", definition: "A relationship between two words with opposite meanings." },
          { term: "Meronym", definition: "A word that denotes a part of something denoted by another word (its holonym)." },
          { term: "Holonym", definition: "A word that denotes a whole, whose parts are denoted by other words (meronyms)." },
          { term: "Disambiguation", definition: "The process of determining which sense of an ambiguous word is intended, given context." },
          { term: "Ontology", definition: "A formal, explicit specification of a shared conceptualization — classes, instances, properties, and relationships within a domain." },
          { term: "Knowledge Graph", definition: "A graph-structured representation of facts, where nodes are entities and edges are relationships between them." },
          { term: "Relatedness", definition: "A broader notion than similarity — two concepts can be related (e.g. through association or function) without meaning nearly the same thing." },
          { term: "Semantic Similarity", definition: "A measure of how close two words or concepts are in meaning, often based on shared features or substitutability." },
          { term: "Embedding", definition: "A dense numerical vector representation of a word or piece of text, positioned in a continuous space so that similar meanings end up close together." },
          { term: "Corpus", definition: "A large, structured collection of text used for linguistic analysis or training NLP models." },
          { term: "Context", definition: "The surrounding words, sentences, or situation that help determine the intended meaning of an ambiguous expression." },
        ],
      },
    ],
  },
];
