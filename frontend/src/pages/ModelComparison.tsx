import { Link } from "react-router-dom";

import ReadInBookLink from "../components/ReadInBookLink";

interface ModelRow {
  name: string;
  year: string;
  family: string;
  keyMechanism: string;
  strengths: string;
  limitations: string;
  tryPath?: string;
  tryLabel?: string;
}

const MODELS: ModelRow[] = [
  {
    name: "Bag-of-Words / TF-IDF",
    year: "1970s–1990s",
    family: "Statistical (no learned weights)",
    keyMechanism: "Counts word occurrences (optionally weighted by inverse document frequency); no notion of word order.",
    strengths: "Simple, fast, fully interpretable, no training data needed beyond the corpus itself.",
    limitations: "Ignores word order and context entirely — 'dog bites man' and 'man bites dog' look identical.",
    tryPath: "/semantics",
    tryLabel: "Semantic Lab (TF-IDF)",
  },
  {
    name: "N-gram Language Models",
    year: "1980s–1990s",
    family: "Statistical, count-based",
    keyMechanism: "Estimates the probability of a word from a fixed window of preceding words, by counting sequences in a corpus.",
    strengths: "Simple, exact, no training loop — probabilities come directly from counts.",
    limitations: "Context window is fixed and small; the number of possible n-grams explodes as the window grows (data sparsity).",
    tryPath: "/language-modeling",
    tryLabel: "Language Modeling Lab",
  },
  {
    name: "Word2Vec",
    year: "2013",
    family: "Shallow neural network",
    keyMechanism: "Trains a small neural network to predict a word from its context (or vice versa), and keeps the learned weights as dense word vectors.",
    strengths: "Captures some semantic relationships as vector geometry (the classic 'king − man + woman ≈ queen' example); dense vectors are far more compact than one-hot/TF-IDF vectors.",
    limitations: "One fixed vector per word regardless of context — 'bank' (river) and 'bank' (finance) get the same vector.",
    tryPath: "/dl-foundations",
    tryLabel: "DL Foundations (the neuron behind the embedding)",
  },
  {
    name: "RNN / LSTM",
    year: "RNN: 1980s · LSTM: 1997",
    family: "Recurrent neural network",
    keyMechanism: "Processes a sequence one step at a time, carrying a hidden state forward; LSTM adds gates (forget/input/output) to control what the hidden state remembers over long sequences.",
    strengths: "Naturally handles variable-length sequences; LSTM's gating meaningfully improves on plain RNNs at retaining information over many steps.",
    limitations: "Must process a sequence strictly step by step (hard to parallelize during training); still struggles with very long-range dependencies compared to attention-based models.",
    tryPath: "/rnn-lstm-lab",
    tryLabel: "RNN & LSTM Lab",
  },
  {
    name: "CNN for Text",
    year: "2014",
    family: "Convolutional neural network",
    keyMechanism: "Slides small filters over a sequence of word embeddings, detecting local n-gram-like patterns regardless of their position in the sentence.",
    strengths: "Fast and highly parallelizable (unlike an RNN, every filter position can be computed independently); effective at picking up local phrase patterns.",
    limitations: "A single convolutional layer only sees a fixed-size local window — capturing longer-range structure needs stacking many layers.",
    tryPath: "/cnn-lab",
    tryLabel: "CNN Lab",
  },
  {
    name: "Seq2Seq with Attention",
    year: "2014–2015",
    family: "Recurrent encoder-decoder + attention",
    keyMechanism: "An RNN encoder compresses the input into a sequence of hidden states; an RNN decoder generates the output, using an attention mechanism to look back at the most relevant encoder states at each step (Bahdanau et al., 2015).",
    strengths: "Attention removed the earlier seq2seq bottleneck of compressing an entire input sequence into one fixed-size vector.",
    limitations: "Still fundamentally sequential (inherits the RNN encoder/decoder's step-by-step processing).",
    tryPath: "/attention-transformers",
    tryLabel: "Attention & Transformers Lab",
  },
  {
    name: "Transformer",
    year: "2017",
    family: "Attention-only (no recurrence)",
    keyMechanism: "Replaces recurrence entirely with self-attention — every position attends directly to every other position in the sequence, computed in parallel (Vaswani et al., 'Attention Is All You Need').",
    strengths: "Highly parallelizable during training (unlike RNNs); attention gives every position a direct path to every other position, which helps with long-range dependencies.",
    limitations: "Self-attention's cost grows with the square of the sequence length; needs an explicit positional encoding since it has no inherent sense of word order.",
    tryPath: "/attention-transformers",
    tryLabel: "Attention & Transformers Lab",
  },
  {
    name: "BERT",
    year: "2018",
    family: "Transformer encoder",
    keyMechanism: "A stack of Transformer encoder layers, pretrained by predicting randomly masked words using both left and right context at once ('masked language modeling').",
    strengths: "Bidirectional context (sees the whole sentence at once) makes it strong at understanding tasks — classification, question answering, similarity.",
    limitations: "Not naturally suited to generating text left-to-right (its pretraining task isn't autoregressive generation).",
    tryPath: "/attention-transformers",
    tryLabel: "Attention & Transformers Lab",
  },
  {
    name: "GPT family",
    year: "2018–present",
    family: "Transformer decoder",
    keyMechanism: "A stack of Transformer decoder layers, pretrained to predict the next word given only the preceding words ('autoregressive language modeling').",
    strengths: "Naturally suited to generating fluent, coherent text one token at a time; scales well with more data and parameters.",
    limitations: "Only sees preceding context at each step (not bidirectional like BERT); can generate fluent text that is factually wrong.",
    tryPath: "/attention-transformers",
    tryLabel: "Attention & Transformers Lab",
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ModelComparison() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Model Comparison</h1>
        <p className="text-nexus-muted text-sm mt-1">
          A chronological, honest comparison of how NLP models have represented and processed text
          — from raw word counts to modern attention-based Transformers. Every row states real,
          well-established architectural facts (what it does and when it was introduced), never an
          invented benchmark score or a declared "winner". Different models excel at different
          things; that's the actual comparison being made here.
        </p>
      </div>

      <div className="flex gap-3">
        <ReadInBookLink book="nlp" chapterId="evolution-of-language-models" label="Read the full chapter in the NLP Book" />
        <ReadInBookLink book="dl" chapterId="cnn" label="Read the DL Book's CNN/RNN/Attention chapters" />
      </div>

      <Section title="Honesty note">
        <p className="text-xs text-nexus-muted leading-relaxed">
          This table deliberately does not include specific accuracy/benchmark numbers (e.g. GLUE
          or ImageNet scores) — those depend heavily on dataset, training setup, and model size,
          and stating a single number here would misrepresent them as fixed facts. What's below is
          each approach's real architectural mechanism, and the general strengths/limitations that
          follow directly from that mechanism — things that are true regardless of any particular
          benchmark run.
        </p>
      </Section>

      <Section title="Text representation & sequence modeling, 1970s → present">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-nexus-muted border-b border-nexus-border">
                <th className="py-2 pr-3 font-medium">Model</th>
                <th className="py-2 pr-3 font-medium">Introduced</th>
                <th className="py-2 pr-3 font-medium">Family</th>
                <th className="py-2 pr-3 font-medium">Key mechanism</th>
                <th className="py-2 pr-3 font-medium">Strengths</th>
                <th className="py-2 pr-3 font-medium">Limitations</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.name} className="border-b border-nexus-border/50 align-top">
                  <td className="py-2.5 pr-3 font-medium text-nexus-text whitespace-nowrap">
                    {m.name}
                    {m.tryPath && (
                      <div>
                        <Link to={m.tryPath} className="text-[10px] text-nexus-accent hover:underline">
                          Try: {m.tryLabel}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-nexus-muted whitespace-nowrap">{m.year}</td>
                  <td className="py-2.5 pr-3 text-nexus-muted whitespace-nowrap">{m.family}</td>
                  <td className="py-2.5 pr-3 text-nexus-muted min-w-[220px]">{m.keyMechanism}</td>
                  <td className="py-2.5 pr-3 text-nexus-muted min-w-[200px]">{m.strengths}</td>
                  <td className="py-2.5 pr-3 text-nexus-muted min-w-[200px]">{m.limitations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
