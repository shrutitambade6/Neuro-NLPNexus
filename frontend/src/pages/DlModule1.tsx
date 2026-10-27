import ActivationVisualizer from "../components/dl/ActivationVisualizer";
import ConceptTooltip from "../components/ConceptTooltip";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import MPNeuronCalculator from "../components/dl/MPNeuronCalculator";
import ModuleQuiz, { type QuizQuestion } from "../components/dl/ModuleQuiz";
import PerceptronLab from "../components/dl/PerceptronLab";
import { SyllabusBadge, SupplementaryBadge } from "../components/dl/SyllabusBadge";
import { Link } from "react-router-dom";

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

const HISTORY = [
  { year: "1943", label: "McCulloch–Pitts Neuron", detail: "Warren McCulloch and Walter Pitts publish the first mathematical model of an artificial neuron." },
  { year: "1958", label: "The Perceptron", detail: "Frank Rosenblatt introduces the Perceptron, the first trainable neural network model." },
  { year: "1960s–1980s", label: "The Quiet Years", detail: "Single-layer perceptrons prove unable to solve problems like XOR; progress slows (the \"AI winter\")." },
  { year: "1980s", label: "Backpropagation", detail: "Hinton, Rumelhart, and Williams popularize backpropagation, making multi-layer network training practical." },
  { year: "1990s", label: "CNNs, RNNs, LSTMs", detail: "Yann LeCun's CNNs excel at images; Hochreiter and Schmidhuber's LSTMs excel at sequences." },
  { year: "2006", label: "Deep Belief Networks", detail: "Geoffrey Hinton shows deep architectures can be trained effectively, reviving interest in the field." },
  { year: "2012", label: "AlexNet", detail: "A deep CNN wins ImageNet by a wide margin, kicking off the modern deep learning era." },
  { year: "2014", label: "GANs", detail: "Ian Goodfellow introduces Generative Adversarial Networks." },
  { year: "2017", label: "Transformers", detail: "Google Brain's Transformer architecture reshapes natural language processing." },
];

const COMPARISON_TABLE = [
  { feature: "Inputs", mp: "Binary", perceptron: "Numeric", mlp: "Numeric", sigmoid: "Numeric" },
  { feature: "Learning", mp: "No", perceptron: "Yes", mlp: "Yes", sigmoid: "Yes" },
  { feature: "Layers", mp: "Single", perceptron: "Single", mlp: "Multiple", sigmoid: "Usually part of a network" },
  { feature: "Activation", mp: "Threshold", perceptron: "Step", mlp: "Nonlinear", sigmoid: "Sigmoid" },
  { feature: "Output", mp: "Binary", perceptron: "Binary", mlp: "Depends on activation", sigmoid: "0 to 1" },
  { feature: "Nonlinear modeling", mp: "Limited", perceptron: "No", mlp: "Yes", sigmoid: "Yes" },
  { feature: "Solves XOR", mp: "No", perceptron: "No", mlp: "Yes", sigmoid: "Yes, with suitable architecture" },
  { feature: "Gradient-based training", mp: "No", perceptron: "Traditionally no", mlp: "Yes", sigmoid: "Yes" },
];

const FORMULA_SHEET = [
  { name: "McCulloch–Pitts Neuron", formula: "y = 1 if Σwᵢxᵢ ≥ θ, else 0" },
  { name: "Perceptron", formula: "z = wᵀx + b,  y = f(z)" },
  { name: "Step function", formula: "f(z) = 1 if z ≥ 0, else 0" },
  { name: "Perceptron weight update", formula: "wᵢ_new = wᵢ_old + η(t − y)xᵢ" },
  { name: "Bias update", formula: "b_new = b_old + η(t − y)" },
  { name: "Sigmoid", formula: "σ(z) = 1 / (1 + e⁻ᶻ)" },
  { name: "Sigmoid derivative", formula: "σ′(z) = σ(z)(1 − σ(z))" },
  { name: "MLP hidden layer", formula: "h = f(W₁x + b₁)" },
  { name: "MLP output layer", formula: "y = f(W₂h + b₂)" },
];

const XOR_TABLE = [
  { x1: 0, x2: 0, xor: 0 },
  { x1: 0, x2: 1, xor: 1 },
  { x1: 1, x2: 0, xor: 1 },
  { x1: 1, x2: 1, xor: 0 },
];

const QUIZ: QuizQuestion[] = [
  {
    question: "An M-P neuron with weights w₁=1, w₂=1 and threshold θ=2 receives inputs x₁=1, x₂=0. What is its output?",
    options: ["1 (fires)", "0 (does not fire)", "0.5", "Undefined"],
    correctIndex: 1,
    explanation: "Weighted sum S = 1·1 + 1·0 = 1, which is less than θ=2, so the neuron does not fire and y=0 — this is exactly the AND-gate configuration from §2.3.",
  },
  {
    question: "What is the single biggest limitation of the M-P neuron compared to the Perceptron?",
    options: [
      "It can only take numeric inputs",
      "It has no learning mechanism — weights and threshold must be chosen manually",
      "It cannot represent logic gates",
      "It always outputs 0",
    ],
    correctIndex: 1,
    explanation: "§1.7: the M-P neuron has no learning mechanism; weights are manually selected. The Perceptron (Ch. 3) introduced a trainable weight-update rule.",
  },
  {
    question: "In the Perceptron Learning Algorithm, if the error e = t − y is 0, what happens to the weights?",
    options: ["They are set to zero", "They are unchanged", "They double", "They are randomized"],
    correctIndex: 1,
    explanation: "The update rule wᵢ ← wᵢ + η·e·xᵢ (§4.2) leaves weights unchanged whenever e=0 — the perceptron only updates on a wrong prediction.",
  },
  {
    question: "Why can't a single-layer perceptron solve the XOR problem?",
    options: [
      "XOR needs more than two inputs",
      "XOR's decision boundary isn't a straight line — the classes aren't linearly separable",
      "XOR requires negative weights, which perceptrons cannot use",
      "The perceptron learning rate is always too high for XOR",
    ],
    correctIndex: 1,
    explanation: "§6.3: no single straight line (hyperplane) can separate XOR's 0s and 1s, so a single-layer perceptron — whose decision boundary is always a hyperplane — cannot represent it.",
  },
  {
    question: "What does the Universal Approximation Theorem (§6.5) say, informally?",
    options: [
      "Every neural network converges to zero loss",
      "A feedforward network with one hidden layer, a suitable nonlinear activation, and enough hidden neurons can approximate a broad class of continuous functions to arbitrary accuracy",
      "Deep networks always outperform shallow ones",
      "Perceptrons can learn any function given enough training time",
    ],
    correctIndex: 1,
    explanation: "This is the theorem's informal statement from §6.5 — note it says nothing about whether one hidden layer is efficient or practical, only that it's theoretically sufficient.",
  },
  {
    question: "Why is the sigmoid function preferred over the hard step function for training multi-layer networks?",
    options: [
      "It is cheaper to compute than the step function",
      "It is smooth and differentiable everywhere, giving gradient descent a usable, non-zero gradient",
      "It always outputs exactly 0 or 1",
      "It removes the need for a bias term",
    ],
    correctIndex: 1,
    explanation: "§7.5-7.6: the step function's derivative is 0 almost everywhere, useless for gradient-based learning. Sigmoid's derivative σ(z)(1−σ(z)) is smooth and non-zero across most of its range, though it does vanish for very large |z| (§7.6.1).",
  },
];

export default function DlModule1() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Module 1 — Foundations of Neural Networks</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Rebuilt directly from your uploaded course material (<span className="font-mono text-xs">chap_01.docx</span> and{" "}
          <span className="font-mono text-xs">Brief_History1.1.docx</span>) — every definition, formula, and worked
          number below traces back to those documents. Calculators compute real arithmetic on whatever you enter;
          nothing here is a pre-baked animation.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="dl-module-1" label="Module 1 — Foundations" />

      <Section title="A brief history of deep learning" badge={<SyllabusBadge source="Brief_History1.1.docx" />}>
        <div className="space-y-3">
          {HISTORY.map((h) => (
            <div key={h.year} className="flex gap-3">
              <div className="w-24 shrink-0 text-xs font-mono text-nexus-accent pt-0.5">{h.year}</div>
              <div className="flex-1 border-l border-nexus-border pl-3 pb-1">
                <p className="text-sm font-medium text-nexus-text">{h.label}</p>
                <p className="text-xs text-nexus-muted mt-0.5 leading-relaxed">{h.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The McCulloch–Pitts (M-P) Neuron" badge={<SyllabusBadge source="chap_01.docx §1" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          The earliest neuron model (1943): a weighted sum compared against a fixed threshold, fires 1 or 0.
        </p>
        <ReadInBookLink book="dl" chapterId="mp-neuron-and-perceptron" />
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 font-mono text-xs text-nexus-muted text-center">
          S = Σ wᵢxᵢ &nbsp;→&nbsp; y = 1 if S ≥ θ, else 0
        </div>
        <p className="text-xs text-nexus-muted">Worked example from §1.5: x₁=1, x₂=1, w₁=w₂=1, θ=2 → S=2 ≥ θ → y=1.</p>
      </Section>

      <Section title="Thresholding logic & logic gates as M-P neurons" badge={<SyllabusBadge source="chap_01.docx §2" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          If the weighted input total ≥ threshold, fire 1 — otherwise 0. This is how the M-P neuron implements AND/OR/NOT gates by hand-picked weights.
        </p>
        <ReadInBookLink book="dl" chapterId="mp-neuron-and-perceptron" />
        <MPNeuronCalculator />
      </Section>

      <Section title="The Perceptron" badge={<SyllabusBadge source="chap_01.docx §3" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          The M-P neuron plus numeric weights, a bias, and — critically — the ability to learn its own weights from data.
        </p>
        <ReadInBookLink book="dl" chapterId="mp-neuron-and-perceptron" label="Read the Perceptron chapter in the DL Book" />
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 font-mono text-xs text-nexus-muted text-center">
          z = w·x + b &nbsp;→&nbsp; y = f(z), using the step function
        </div>
      </Section>

      <Section title="The Perceptron Learning Algorithm — try it yourself" badge={<SyllabusBadge source="chap_01.docx §4" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          On each wrong prediction, nudge weights and bias toward the correct answer: wᵢ ← wᵢ + η·(t−y)·xᵢ.
        </p>
        <ReadInBookLink book="dl" chapterId="mp-neuron-and-perceptron" label="Read the Perceptron Learning Algorithm in the DL Book" />
        <PerceptronLab />
      </Section>

      <Section title="Limitations & the XOR problem" badge={<SyllabusBadge source="chap_01.docx §4.5, §6.3" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          A single-layer perceptron solves AND/OR/NOT but not XOR — no straight line separates XOR's classes.
        </p>
        <ReadInBookLink book="dl" chapterId="mp-neuron-and-perceptron" label="Read the XOR limitation in the DL Book" />
        <div className="overflow-x-auto rounded-xl border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                <th className="py-2 px-3">x₁</th>
                <th className="py-2 px-3">x₂</th>
                <th className="py-2 px-3">XOR</th>
              </tr>
            </thead>
            <tbody className="text-nexus-muted">
              {XOR_TABLE.map((r, i) => (
                <tr key={i} className="border-b border-nexus-border/50 last:border-0">
                  <td className="py-2 px-3 font-mono">{r.x1}</td>
                  <td className="py-2 px-3 font-mono">{r.x2}</td>
                  <td className="py-2 px-3 font-mono text-nexus-text font-medium">{r.xor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-nexus-muted">
          Try training the <ConceptTooltip term="perceptron">perceptron</ConceptTooltip> above on AND or OR — it converges every time. There's no XOR training option here
          because it's mathematically guaranteed to fail for a single-layer perceptron, not because of a missing
          feature.
        </p>
      </Section>

      <Section title="Multilayer Perceptrons (MLPs) & the Universal Approximation Theorem" badge={<SyllabusBadge source="chap_01.docx §5-6" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Stacking hidden layers lets a network represent functions (like XOR) no single-layer perceptron could — the Universal Approximation Theorem is why one hidden layer is, in principle, enough.
        </p>
        <ReadInBookLink book="dl" chapterId="mlps-and-sigmoid-neurons" />
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 text-sm text-nexus-muted">
          To actually run forward propagation through a real multi-layer network — including one that solves XOR — head
          to the{" "}
          <Link to="/neural-networks" className="text-nexus-accent hover:underline">
            Neural Network Playground
          </Link>
          , which computes a genuine layer-by-layer forward pass on whatever architecture you configure.
        </div>
      </Section>

      <Section title="Sigmoid Neurons" badge={<SyllabusBadge source="chap_01.docx §7" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Replaces the hard step with a smooth curve, σ(z) = 1/(1+e⁻ᶻ) — exactly what gradient-based training needs.
        </p>
        <ReadInBookLink book="dl" chapterId="mlps-and-sigmoid-neurons" label="Read Sigmoid Neurons in the DL Book" />
        <p className="text-sm text-nexus-muted leading-relaxed">
          The visualizer below is the same real activation-function component used throughout this platform — drag the
          slider to see σ(2)≈0.8808 and σ(−2)≈0.1192 exactly as computed in §7.3, plus its real derivative at any point.
        </p>
        <ActivationVisualizer />
        <div className="flex items-center gap-2">
          <SupplementaryBadge />
          <p className="text-xs text-nexus-muted">Tanh, ReLU, and Leaky ReLU are shown for comparison — only Sigmoid is covered in chap_01.docx §7.</p>
        </div>
      </Section>

      <Section title="Comparison: M-P Neuron vs. Perceptron vs. MLP vs. Sigmoid Neuron" badge={<SyllabusBadge source="chap_01.docx §8" />}>
        <div className="overflow-x-auto rounded-xl border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                <th className="py-2 px-3">Feature</th>
                <th className="py-2 px-3">M-P Neuron</th>
                <th className="py-2 px-3">Perceptron</th>
                <th className="py-2 px-3">MLP</th>
                <th className="py-2 px-3">Sigmoid Neuron</th>
              </tr>
            </thead>
            <tbody className="text-nexus-muted">
              {COMPARISON_TABLE.map((row) => (
                <tr key={row.feature} className="border-b border-nexus-border/50 last:border-0">
                  <td className="py-2 px-3 text-nexus-text font-medium">{row.feature}</td>
                  <td className="py-2 px-3">{row.mp}</td>
                  <td className="py-2 px-3">{row.perceptron}</td>
                  <td className="py-2 px-3">{row.mlp}</td>
                  <td className="py-2 px-3">{row.sigmoid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Module 1 formula sheet" badge={<SyllabusBadge source="chap_01.docx §9" />}>
        <div className="grid sm:grid-cols-2 gap-2">
          {FORMULA_SHEET.map((f) => (
            <div key={f.name} className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
              <p className="text-xs text-nexus-muted">{f.name}</p>
              <p className="font-mono text-sm text-nexus-text mt-0.5">{f.formula}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quiz — check your understanding">
        <ModuleQuiz questions={QUIZ} domain="dl" quizId="dl-module-1-quiz" />
      </Section>

      <Section title="What to study for the exam">
        <div className="text-sm text-nexus-muted space-y-4 leading-relaxed">
          <div>
            <p className="text-nexus-text font-medium mb-1">Must-know definitions</p>
            <p>M-P neuron · thresholding logic · step function · perceptron · bias · decision boundary · linear separability · weight update rule · learning rate · Perceptron Convergence Theorem · multilayer perceptron (MLP) · Universal Approximation Theorem · sigmoid neuron · vanishing gradient.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Must-know formulas</p>
            <p>Every formula in the sheet above — especially the perceptron weight/bias update rule and the sigmoid function and its derivative, which reappear throughout Module 2's backpropagation derivation.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Numericals you should be able to redo by hand</p>
            <p>§1.5's M-P neuron example (S=2, y=1); §3.6's perceptron forward pass (z=0.3, y=1); §4.4's PLA update step (z=−0.2 → y=0 → error=1 → w₁ becomes 0.3, w₂ becomes 0.4, b becomes −0.6); §7.3's sigmoid evaluations (σ(2)≈0.8808, σ(−2)≈0.1192).</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Short-answer questions</p>
            <p>Why does the M-P neuron have no learning mechanism? State the Perceptron weight update rule and explain each term. Why is a step function unsuitable for gradient-based training? State the Universal Approximation Theorem informally. Give one advantage and one limitation of the sigmoid function.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Long-answer questions</p>
            <p>Derive the AND, OR, and NOT gates as M-P neurons, showing your choice of weights and threshold for each. Trace the Perceptron Learning Algorithm through at least two full update steps on a small example of your choosing, showing every intermediate value. Explain, with the XOR truth table, why no single-layer perceptron can solve XOR, and explain how an MLP overcomes this limitation.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
