import ActivationVisualizer from "../components/dl/ActivationVisualizer";
import ConceptTooltip from "../components/ConceptTooltip";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import GradientCalculator from "../components/dl/GradientCalculator";
import GradientDescentLab from "../components/dl/GradientDescentLab";
import LossCalculator from "../components/dl/LossCalculator";
import NeuronCalculator from "../components/dl/NeuronCalculator";
import SoftmaxVisualizer from "../components/dl/SoftmaxVisualizer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const ACTIVATION_TABLE = [
  { name: "Sigmoid", formula: "1 / (1 + e⁻ᶻ)", range: "(0, 1)", use: "Binary output probabilities" },
  { name: "Tanh", formula: "(eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ)", range: "(−1, 1)", use: "Zero-centered hidden layers" },
  { name: "ReLU", formula: "max(0, z)", range: "[0, ∞)", use: "Default for most hidden layers" },
  { name: "Leaky ReLU", formula: "z if z>0 else 0.01·z", range: "(−∞, ∞)", use: "Fixes ReLU's \"dead neuron\" problem" },
  { name: "Softmax", formula: "eᶻⁱ / Σⱼ eᶻʲ", range: "(0, 1), sums to 1", use: "Multi-class output layer" },
];

export default function DlFoundations() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Deep Learning Foundations</h1>
        <p className="text-nexus-muted text-sm mt-1">
          The building blocks every Deep Learning lab in NeuroNLP Nexus builds on — a single
          artificial neuron, first, before layers of them. Every calculator on this page computes
          a real result from the numbers you enter; nothing is pre-baked or illustrative.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="dl-foundations" label="DL Foundations" />

      <Section title="What is Deep Learning?">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Deep Learning is a branch of machine learning built from layers of simple computational
          units — artificial <ConceptTooltip term="neuron">neurons</ConceptTooltip> — stacked so that each layer learns a slightly more abstract
          representation of the input than the one before it. "Deep" refers to having more than a
          couple of these layers. Unlike the rule-based and statistical methods used throughout the
          NLP labs in this platform (n-gram counts, TF-IDF, CYK parsing), a deep network doesn't
          have its logic written by hand — it learns its own weights from data by repeatedly
          measuring how wrong its predictions are and nudging itself to be less wrong. That
          "measure error, then adjust" loop — <ConceptTooltip term="lossFunction">loss</ConceptTooltip>, gradient, <ConceptTooltip term="gradientDescent">gradient descent</ConceptTooltip> — is exactly what
          this page walks through, one real neuron at a time.
        </p>
      </Section>

      <Section title="The artificial neuron">
        <p className="text-sm text-nexus-muted leading-relaxed">
          A computational unit: multiply inputs by learned <ConceptTooltip term="weight">weights</ConceptTooltip>, add a <ConceptTooltip term="bias">bias</ConceptTooltip>, squash through an <ConceptTooltip term="activationFunction">activation function</ConceptTooltip>.
        </p>
        <ReadInBookLink book="dl" chapterId="the-artificial-neuron" />
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 font-mono text-xs text-nexus-muted text-center">
          x₁·w₁ + x₂·w₂ + ⋯ + b = z &nbsp;→&nbsp; activation(z) = output
        </div>
      </Section>

      <Section title="Weights and bias">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Weights say how important each input is; bias shifts the result up or down, like a line's intercept.
        </p>
        <ReadInBookLink book="dl" chapterId="the-artificial-neuron" />
      </Section>

      <Section title="Activation functions">
        <p className="text-sm text-nexus-muted leading-relaxed">
          An activation function takes the raw weighted sum <span className="font-mono">z</span> and
          squashes or reshapes it — this is what lets a network learn non-linear patterns (without
          it, stacking any number of layers would collapse to one big linear equation).
        </p>
        <div className="overflow-x-auto rounded-xl border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                <th className="py-2 px-3">Function</th>
                <th className="py-2 px-3">Formula</th>
                <th className="py-2 px-3">Range</th>
                <th className="py-2 px-3">Typically used for</th>
              </tr>
            </thead>
            <tbody className="text-nexus-muted">
              {ACTIVATION_TABLE.map((row) => (
                <tr key={row.name} className="border-b border-nexus-border/50 last:border-0">
                  <td className="py-2 px-3 text-nexus-text font-medium">{row.name}</td>
                  <td className="py-2 px-3 font-mono">{row.formula}</td>
                  <td className="py-2 px-3 font-mono">{row.range}</td>
                  <td className="py-2 px-3">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Activation Function Visualizer">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Pick a function, drag the input, and watch a real marked point move along the function's
          actual curve — the graph itself is the same activation function evaluated at 200 points,
          not a decorative illustration. The readout below the slider also shows the function's
          real derivative at that exact point — the same slope value the Gradient calculator above
          used in its chain-rule calculation.
        </p>
        <ActivationVisualizer />
      </Section>

      <Section title="Softmax">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Turns a vector of raw scores into a probability distribution that sums to exactly 1.
        </p>
        <ReadInBookLink book="dl" chapterId="the-artificial-neuron" label="Read the full Softmax explanation in the DL Book" />
        <SoftmaxVisualizer />
      </Section>

      <Section title="Forward propagation — try it yourself">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Computing a network's output by passing inputs through weights, bias, and activation, left to right.
        </p>
        <ReadInBookLink book="dl" chapterId="forward-propagation-and-loss" />
        <NeuronCalculator />
      </Section>

      <Section title="Loss functions — try it yourself">
        <p className="text-sm text-nexus-muted leading-relaxed">
          A score for "how wrong was that prediction" — lower is better, zero is perfect.
        </p>
        <ReadInBookLink book="dl" chapterId="forward-propagation-and-loss" label="Read Loss Functions in the DL Book" />
        <LossCalculator />
      </Section>

      <Section title="Backpropagation and gradients — try it yourself">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Works backward from "how wrong were we" to exactly how much each weight and the bias was to blame, via the chain rule.
        </p>
        <ReadInBookLink book="dl" chapterId="backpropagation" />
        <GradientCalculator />
      </Section>

      <Section title="Gradient descent — try it yourself">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Repeatedly nudges each weight and bias toward less loss: new_weight = old_weight − learning_rate × gradient.
        </p>
        <ReadInBookLink book="dl" chapterId="gradient-descent" />
        <GradientDescentLab />
      </Section>

      <Section title="Epochs, batch size, and learning rate">
        <p className="text-sm text-nexus-muted leading-relaxed mb-3">
          Three settings control how training actually runs, distinct from the network's structure:
        </p>
        <div className="overflow-x-auto rounded-xl border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                <th className="py-2 px-3">Term</th>
                <th className="py-2 px-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-nexus-muted">
              <tr className="border-b border-nexus-border/50">
                <td className="py-2 px-3 text-nexus-text font-medium"><ConceptTooltip term="epoch">Epoch</ConceptTooltip></td>
                <td className="py-2 px-3">One complete pass through the entire training dataset. The Gradient Descent lab above runs one epoch per step, on a single fixed example, to keep the arithmetic visible — real training runs many epochs over many examples.</td>
              </tr>
              <tr className="border-b border-nexus-border/50">
                <td className="py-2 px-3 text-nexus-text font-medium">Batch size</td>
                <td className="py-2 px-3">How many training examples are averaged together before one weight update. A batch size of 1 (used above) updates after every single example; real networks usually average over a batch of dozens to thousands of examples per update for a smoother, less noisy gradient.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-nexus-text font-medium"><ConceptTooltip term="learningRate">Learning rate</ConceptTooltip></td>
                <td className="py-2 px-3">How large a step gradient descent takes on each update. It's the single most sensitive hyperparameter in most networks — see the viva point above.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
