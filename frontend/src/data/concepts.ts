export interface ConceptEntry {
  term: string;
  definition: string;
  simple: string;
  example?: string;
}

// Data-driven so new terms can be added without touching any component.
export const CONCEPTS: Record<string, ConceptEntry> = {
  morphology: {
    term: "Morphology",
    definition: "The study of how words are formed and structured from smaller meaningful units called morphemes.",
    simple: "How words are built.",
    example: "un + happy + ness → unhappiness",
  },
  ambiguity: {
    term: "Ambiguity",
    definition: "A situation where a word, phrase, or sentence has more than one possible interpretation.",
    simple: "When something could mean more than one thing.",
    example: '"I saw her duck" — did she lower her head, or does she own a duck?',
  },
  constituent: {
    term: "Constituent",
    definition: "A group of words that function together as a single unit within a sentence's grammatical structure.",
    simple: "A chunk of a sentence that acts as one piece.",
    example: '"the tall man" is a noun-phrase constituent.',
  },
  lexeme: {
    term: "Lexeme",
    definition: "An abstract unit of meaning that underlies a set of related word forms (e.g. run, runs, running, ran all share one lexeme).",
    simple: "The 'dictionary entry' behind a group of word forms.",
  },
  hyponym: {
    term: "Hyponym",
    definition: "A word whose meaning is a more specific instance of a more general word (its hypernym).",
    simple: "A more specific word under a broader category.",
    example: '"rose" is a hyponym of "flower".',
  },
  hypernym: {
    term: "Hypernym",
    definition: "A word whose meaning covers a broader category that includes a more specific word (its hyponym).",
    simple: "The broader category word.",
    example: '"flower" is a hypernym of "rose".',
  },
  perplexity: {
    term: "Perplexity",
    definition: "A measurement of how well a probability model predicts a sample, computed as 2 raised to the average negative log-probability per word.",
    simple: "How 'surprised' a language model is by real text — lower is better.",
  },
  grammar: {
    term: "Grammar",
    definition: "A formal set of rules that describes how words combine to form valid sentences in a language.",
    simple: "The rulebook for building correct sentences.",
  },
  syntax: {
    term: "Syntax",
    definition: "The set of rules governing the structure and arrangement of words to form valid sentences.",
    simple: "How words are ordered and grouped.",
  },
  semantics: {
    term: "Semantics",
    definition: "The study of meaning in language — what words and sentences actually refer to or mean.",
    simple: "What language actually means, not just how it's arranged.",
  },
  pragmatics: {
    term: "Pragmatics",
    definition: "The study of how context influences the interpretation of meaning, beyond literal sentence content.",
    simple: "How context changes what we really mean.",
    example: '"Can you pass the salt?" is literally a question, but pragmatically a request.',
  },
  discourse: {
    term: "Discourse",
    definition: "The study of language beyond a single sentence — how sentences connect to form coherent text or conversation.",
    simple: "How sentences fit together into a bigger conversation or text.",
  },
  tokenization: {
    term: "Tokenization",
    definition: "The process of splitting text into smaller units (tokens), typically words or subwords.",
    simple: "Chopping a sentence into pieces.",
  },
  cnf: {
    term: "Chomsky Normal Form",
    definition: "A restricted grammar form where every production is either A → BC (two nonterminals) or A → a (one terminal). CYK parsing requires a grammar in this form.",
    simple: "A strict grammar shape that makes CYK parsing possible.",
  },
  nonterminal: {
    term: "Nonterminal",
    definition: "A grammar symbol (like NP, VP, S) that can be expanded into other symbols via production rules — it never appears in the final sentence itself.",
    simple: "A grammar 'category' symbol, not an actual word.",
  },
  polysemy: {
    term: "Polysemy",
    definition: "A single word having multiple related meanings, all stemming from a shared core sense.",
    simple: "One word, several related meanings.",
    example: '"head" of a person, "head" of a company, "head" of a queue.',
  },
  homonymy: {
    term: "Homonymy",
    definition: "Two or more words that share the same spelling or pronunciation but have completely unrelated meanings.",
    simple: "Same word, unrelated meanings.",
    example: '"bank" (financial institution) vs "bank" (river edge).',
  },
  synonymy: {
    term: "Synonymy",
    definition: "A relationship between two words that have the same or nearly the same meaning.",
    simple: "Different words, (nearly) the same meaning.",
    example: '"big" and "large".',
  },
  antonymy: {
    term: "Antonymy",
    definition: "A relationship between two words with opposite meanings.",
    simple: "Opposite meanings.",
    example: '"hot" and "cold".',
  },
  meronym: {
    term: "Meronym",
    definition: "A word that denotes a part of something denoted by another word (its holonym).",
    simple: "A part of a bigger whole.",
    example: '"wheel" is a meronym of "car".',
  },
  holonym: {
    term: "Holonym",
    definition: "A word that denotes a whole, whose parts are denoted by other words (meronyms).",
    simple: "The whole thing, made of parts.",
    example: '"car" is a holonym of "wheel".',
  },
  disambiguation: {
    term: "Disambiguation",
    definition: "The process of determining which sense of an ambiguous word is intended, given context.",
    simple: "Figuring out which meaning was intended.",
  },
  ontology: {
    term: "Ontology",
    definition: "A formal, explicit specification of a shared conceptualization — classes, instances, properties, and relationships within a domain.",
    simple: "A structured map of concepts and how they relate.",
  },
  "knowledge-graph": {
    term: "Knowledge Graph",
    definition: "A graph-structured representation of facts, where nodes are entities and edges are relationships between them.",
    simple: "Facts stored as connected dots and arrows.",
  },
  relatedness: {
    term: "Relatedness",
    definition: "A broader notion than similarity — two concepts can be related (e.g. through association or function) without meaning nearly the same thing.",
    simple: "Connected in meaning, even if not similar.",
    example: '"car" and "road" are related but not similar.',
  },
  similarity: {
    term: "Semantic Similarity",
    definition: "A measure of how close two words or concepts are in meaning, often based on shared features or substitutability.",
    simple: "How close in meaning two things are.",
  },
  embedding: {
    term: "Embedding",
    definition: "A dense numerical vector representation of a word or piece of text, positioned in a continuous space so that similar meanings end up close together.",
    simple: "Turning words into numbers that capture meaning.",
  },
  corpus: {
    term: "Corpus",
    definition: "A large, structured collection of text used for linguistic analysis or training NLP models.",
    simple: "A big collection of text to learn from.",
  },
  context: {
    term: "Context",
    definition: "The surrounding words, sentences, or situation that help determine the intended meaning of an ambiguous expression.",
    simple: "What's around a word that helps you understand it.",
  },

  // Deep Learning terms (NeuroNLP Nexus expansion, Stage 12) — real
  // definitions matching what the DL labs themselves compute, the same
  // standard as every NLP term above.
  neuron: {
    term: "Neuron",
    definition: "A unit that computes a weighted sum of its inputs plus a bias, then applies a nonlinear activation function to produce its output.",
    simple: "A tiny calculator: weigh the inputs, add them up, squash the result.",
    example: "z = (1×0.5) + (2×−0.5) + 0.1 = −0.4, output = sigmoid(−0.4) ≈ 0.401",
  },
  activationFunction: {
    term: "Activation Function",
    definition: "A nonlinear function applied to a neuron's weighted sum — sigmoid, tanh, ReLU, and softmax are common choices — that shapes its output range and lets stacked layers represent non-linear relationships.",
    simple: "The rule that turns a raw number into a neuron's real output.",
    example: "relu(−3.5) = 0.0",
  },
  backpropagation: {
    term: "Backpropagation",
    definition: "The application of the calculus chain rule to compute how much each weight in a network contributed to the current loss, layer by layer, so gradient descent knows which direction to adjust each weight.",
    simple: "Tracing the error backward through the network to know which weights to blame.",
  },
  gradientDescent: {
    term: "Gradient Descent",
    definition: "An iterative optimization method that updates each weight by a small step in the direction that reduces the loss: w_new = w_old − learning_rate × gradient.",
    simple: "Guess, measure the error, nudge every weight to be a little less wrong — repeat.",
  },
  convolution: {
    term: "Convolution",
    definition: "Sliding a small kernel across a grid (like an image), computing a real dot-product at each position to produce a feature map that highlights where a pattern appears.",
    simple: "A small filter scanning across an image, looking for the same pattern everywhere.",
  },
  pooling: {
    term: "Pooling",
    definition: "Downsampling a feature map by summarizing each small window with its max or average value, reducing spatial size while keeping the strongest signal.",
    simple: "Shrinking a feature map by keeping only the strongest (or average) value in each small window.",
  },
  recurrence: {
    term: "Recurrence",
    definition: "Carrying a hidden state forward from one sequence step to the next, so each step's computation genuinely depends on everything the model has processed so far.",
    simple: "A running memory that updates as a model reads through a sequence, one step at a time.",
  },
  attentionMechanism: {
    term: "Attention",
    definition: "A mechanism that computes, for each position in a sequence, a real weighted combination of every other position's Value vector — the weights (softmax over scaled Query·Key scores) genuinely sum to 1.",
    simple: "For each word, decide how much to 'look at' every other word when building its new representation.",
  },
  softmax: {
    term: "Softmax",
    definition: "A function that normalizes a whole vector of real numbers into a probability distribution — every output is between 0 and 1, and they all sum to exactly 1.",
    simple: "Turns a list of scores into percentages that add up to 100%.",
  },
  transformer: {
    term: "Transformer",
    definition: "A neural architecture built entirely from (multi-head) self-attention and feedforward layers, with no recurrence — every position can attend to every other position in parallel.",
    simple: "A model made of attention layers instead of step-by-step recurrence.",
  },

  // 11 more DL terms (Redesign Stage 3) — bringing the DL glossary to 21
  // entries, matching the NLP glossary's existing hover/click pattern.
  // Picked by auditing what the DL labs themselves actually compute and
  // discuss (DL Foundations, Modules 1-3, CNN Lab, RNN & LSTM Lab,
  // Attention Lab), not invented in the abstract.
  weight: {
    term: "Weight",
    definition: "A learned number that scales one input's contribution to a neuron's weighted sum — how much that input matters to the result.",
    simple: "How much one input counts, learned from data.",
    example: "x₁·w₁ — if w₁ = 0, x₁ is completely ignored no matter its value.",
  },
  bias: {
    term: "Bias",
    definition: "A learned constant added to a neuron's weighted sum, independent of any input — it shifts the whole result up or down before the activation function is applied.",
    simple: "A fixed number added on top, like the intercept in a line's equation.",
  },
  lossFunction: {
    term: "Loss Function",
    definition: "A function that measures how wrong a single prediction is compared to the true value — small when the prediction is close, large when it's far off. The one number gradient descent tries to minimize.",
    simple: "A single score for 'how wrong was that prediction.'",
  },
  learningRate: {
    term: "Learning Rate",
    definition: "The step size used in each gradient descent update — how far every weight moves in the direction that reduces loss.",
    simple: "How big a step the network takes each time it corrects itself.",
    example: "Too high overshoots and the loss diverges; too low makes training painfully slow.",
  },
  epoch: {
    term: "Epoch",
    definition: "One complete pass of the entire training dataset through the network, after which every example has contributed at least one weight update.",
    simple: "One full lap through all the training examples.",
  },
  perceptron: {
    term: "Perceptron",
    definition: "The original (1958, Rosenblatt) single-layer neural model: a weighted sum of inputs plus a bias, passed through a hard step (threshold) activation to produce a binary output.",
    simple: "The earliest artificial neuron — all-or-nothing output, no in-between.",
  },
  multilayerPerceptron: {
    term: "Multi-Layer Perceptron (MLP)",
    definition: "A network of neurons arranged in stacked layers (an input layer, one or more hidden layers, and an output layer), which — unlike a single perceptron — can represent non-linear functions.",
    simple: "Several layers of neurons stacked so the network can learn curved, not just straight-line, patterns.",
  },
  overfitting: {
    term: "Overfitting",
    definition: "When a model fits the training data — including its noise and quirks — so closely that it performs worse on new, unseen data than a simpler model would.",
    simple: "Memorizing the practice questions instead of actually learning the subject.",
  },
  dropout: {
    term: "Dropout",
    definition: "A regularization technique that randomly deactivates a fraction of neurons on each training step, forcing the network to not rely too heavily on any single one of them.",
    simple: "Randomly switching off some neurons while training, so the network doesn't lean on just a few.",
  },
  autoencoder: {
    term: "Autoencoder",
    definition: "A network trained to reconstruct its own input after first compressing it through a smaller 'bottleneck' layer, which forces it to learn a compact representation of the data.",
    simple: "A network that squeezes its input down, then tries to rebuild it from that squeeze — learning what's essential in the process.",
  },
  lstmGate: {
    term: "LSTM Gate",
    definition: "One of an LSTM cell's four learned sigmoid/tanh units — forget, input, candidate, and output — that together control what old memory to discard, what new information to add, and what to expose as this step's output.",
    simple: "A small learned switch that decides how much of something (old memory, new info, output) gets through.",
  },
};
