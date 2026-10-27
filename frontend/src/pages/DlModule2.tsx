import ConceptTooltip from "../components/ConceptTooltip";
import { Link } from "react-router-dom";

import BackpropLab from "../components/dl/BackpropLab";
import EmailClassifierCalculator from "../components/dl/EmailClassifierCalculator";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import ModuleQuiz, { type QuizQuestion } from "../components/dl/ModuleQuiz";
import { SyllabusBadge, SupplementaryBadge } from "../components/dl/SyllabusBadge";

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

const LEARNING_TYPES = [
  { name: "Supervised Learning", desc: "The network learns from labeled input-output pairs; comparing its outputs to known desired outputs creates an error signal it uses to improve. (This is what every calculator on this page does.)" },
  { name: "Unsupervised Learning", desc: "The data has no labeled outputs. The network models the underlying structure of the input instead — clustering and association are common techniques." },
  { name: "Reinforcement Learning", desc: "The network learns by interacting with an environment, receiving rewards or penalties, and finding a strategy that maximizes cumulative reward over time." },
];

const NETWORK_TYPES = [
  { name: "Feedforward Network", desc: "Data moves from input to output in a single direction, with no loops." },
  { name: "Single-layer Perceptron", desc: "One layer: applies weights, sums inputs, and uses an activation to produce output (Module 1)." },
  { name: "Multilayer Perceptron (MLP)", desc: "Three or more layers: an input layer, one or more hidden layers, and an output layer." },
  { name: "Convolutional Neural Network (CNN)", desc: "Uses convolutional layers to automatically learn spatial features from images.", link: "/cnn-lab" },
  { name: "Recurrent Neural Network (RNN)", desc: "Handles sequential data using feedback loops that retain context over time.", link: "/rnn-lstm-lab" },
  { name: "Long Short-Term Memory (LSTM)", desc: "A type of RNN with memory cells and gates that handle long-term dependencies and avoid vanishing gradients.", link: "/rnn-lstm-lab" },
];

const QUIZ: QuizQuestion[] = [
  {
    question: "In the email classification example, why does H2 output exactly 0 for the input vector [1, 0, 1]?",
    options: [
      "Because the sigmoid function saturates at 0",
      "Because H2's weighted sum is −0.1, and ReLU(z) = max(0, z), so any negative z outputs 0",
      "Because the 'win' keyword is always weighted at 0",
      "Because the network hasn't been trained yet",
    ],
    correctIndex: 1,
    explanation: "H2's weighted sum = (1×0.4)+(0×0.1)+(1×−0.5) = −0.1. ReLU clips any negative value to 0, so H2 Output = 0 exactly.",
  },
  {
    question: "What are the two main steps of the Backpropagation algorithm?",
    options: [
      "Initialization and termination",
      "Forward pass and backward pass",
      "Training and testing",
      "Encoding and decoding",
    ],
    correctIndex: 1,
    explanation: "The forward pass computes the network's output; the backward pass propagates the error back through the network to update weights and biases using gradients.",
  },
  {
    question: "In the 5-node backprop worked example, what is δ5 (the output unit's error term) computed from?",
    options: [
      "δ5 = y5(1−y5)(y_target − y5) — the output's derivative times the raw error",
      "δ5 = y_target − y5 only",
      "δ5 = the learning rate times the weighted sum",
      "δ5 is always fixed at −0.5",
    ],
    correctIndex: 0,
    explanation: "δ5 = y5(1−y5)(y_target−y5) = 0.67×0.33×(−0.17) ≈ −0.0376 in the doc's worked example — this is the sigmoid derivative times the raw output error.",
  },
  {
    question: "Why does the weight w₂,₃ (from h2 to the output, originally 0.9) change more, in one step, than w₁,₁ (from x1 to h1, originally 0.2)?",
    options: [
      "It's random — there's no pattern",
      "Δw = η·δ·output, and w₂,₃'s hidden-to-output delta (δ5) and its input (y4=0.59) are both larger in magnitude than the input-to-hidden delta (δ3) and input (x1=0.35) feeding w₁,₁",
      "Output-layer weights always update faster by a fixed rule",
      "w₂,₃ has a higher learning rate than w₁,₁",
    ],
    correctIndex: 1,
    explanation: "Δw₂,₃ = 1×(−0.0376)×0.59 ≈ −0.0222, while Δw₁,₁ = 1×(−0.0027)×0.35 ≈ −0.00095 — the magnitude difference comes from the actual delta and input values at each connection, not a special rule for layer position.",
  },
  {
    question: "Which type of learning does the email classification and backprop examples on this page both use?",
    options: ["Unsupervised learning", "Reinforcement learning", "Supervised learning", "Self-supervised learning"],
    correctIndex: 2,
    explanation: "Both examples compare the network's output to a known, labeled target (spam/not spam; target output 0.5) and use that error to guide learning — the definition of supervised learning.",
  },
];

export default function DlModule2() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Module 2 — Neural Networks & Backpropagation</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Rebuilt directly from your uploaded <span className="font-mono text-xs">Neural_network_chap-2.docx</span> —
          including the exact network diagram, weights, and worked numbers for both the email-classification example
          and the 5-node <ConceptTooltip term="backpropagation">backpropagation</ConceptTooltip> example. The backprop network's weight labels came from reading the
          embedded diagram image directly, since Word doesn't store them as searchable text.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="dl-module-2" label="Module 2 — Backpropagation" />

      <Section title="Introduction to neural networks" badge={<SyllabusBadge source="nn_chap2.docx" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          A network of interconnected neurons, organized into layers, plus a learning rule that adjusts weights and biases over time.
        </p>
        <ReadInBookLink book="dl" chapterId="neural-network-fundamentals" />
        <p className="text-sm text-nexus-muted leading-relaxed">
          Learning follows three stages: <strong className="text-nexus-text">input computation</strong> (data enters
          the network), <strong className="text-nexus-text">output generation</strong> (the network produces an
          output from its current parameters), and <strong className="text-nexus-text">iterative refinement</strong>{" "}
          (weights and biases are adjusted to improve performance).
        </p>
      </Section>

      <Section title="Layers in a neural network" badge={<SyllabusBadge source="nn_chap2.docx" />}>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
            <p className="text-nexus-text font-medium mb-1">Input Layer</p>
            <p className="text-nexus-muted text-xs leading-relaxed">Receives the input data — each input neuron corresponds to one feature.</p>
          </div>
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
            <p className="text-nexus-text font-medium mb-1">Hidden Layer(s)</p>
            <p className="text-nexus-muted text-xs leading-relaxed">Do most of the computational work, transforming inputs into something the output layer can use.</p>
          </div>
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
            <p className="text-nexus-text font-medium mb-1">Output Layer</p>
            <p className="text-nexus-muted text-xs leading-relaxed">Produces the final result — its format depends on the task (classification, regression, ...).</p>
          </div>
        </div>
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 font-mono text-xs text-nexus-muted text-center">
          z = w₁x₁ + w₂x₂ + ⋯ + wₙxₙ + b &nbsp;→&nbsp; activation(z) = neuron output
        </div>
      </Section>

      <Section title="Email classification — a real forward-propagation example" badge={<SyllabusBadge source="nn_chap2.docx" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Keyword presence runs through a real 3-input, 2-ReLU-hidden, 1-sigmoid-output network to produce a spam probability.
        </p>
        <ReadInBookLink book="dl" chapterId="forward-propagation-and-loss" label="Read the worked example in the DL Book" />
        <EmailClassifierCalculator />
      </Section>

      <Section title="Types of learning">
        <div className="grid sm:grid-cols-1 gap-2">
          {LEARNING_TYPES.map((t) => (
            <div key={t.name} className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
              <p className="text-sm text-nexus-text font-medium">{t.name}</p>
              <p className="text-xs text-nexus-muted mt-0.5 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Types of neural networks">
        <div className="grid sm:grid-cols-2 gap-2">
          {NETWORK_TYPES.map((t) => (
            <div key={t.name} className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
              <p className="text-sm text-nexus-text font-medium">{t.name}</p>
              <p className="text-xs text-nexus-muted mt-0.5 leading-relaxed">{t.desc}</p>
              {t.link && (
                <Link to={t.link} className="text-xs text-nexus-accent hover:underline mt-1 inline-block">
                  Try the real lab →
                </Link>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Backpropagation — how a network actually learns" badge={<SyllabusBadge source="nn_chap2.docx" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Computes the loss, uses the chain rule to find each weight's share of the blame, then nudges every weight toward less error.
        </p>
        <ReadInBookLink book="dl" chapterId="backpropagation" />
      </Section>

      <Section title="Backpropagation — the 5-node worked example, step by step" badge={<SyllabusBadge source="nn_chap2.docx" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          A 2-input, 2-hidden-neuron, 1-output network (all sigmoid, no biases), trained toward a target output of 0.5
          with learning rate 1 — reproducing the doc's own hand-worked forward pass, error calculation, and weight
          update exactly, plus real repeated training the doc only describes in words ("this process continues until
          the desired output is reached").
        </p>
        <BackpropLab />
      </Section>

      <Section title="Backpropagation for XOR — Python reference">
        <div className="flex items-center gap-2 mb-1">
          <SupplementaryBadge />
          <p className="text-xs text-nexus-muted">Reproduced from the doc's own reference implementation, for reading — not an executable calculator on this page.</p>
        </div>
        <pre className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 text-xs font-mono text-nexus-muted overflow-x-auto">
{`def feedforward(self, X):
    self.hidden_activation = np.dot(X, self.weights_input_hidden) + self.bias_hidden
    self.hidden_output = self.sigmoid(self.hidden_activation)
    self.output_activation = np.dot(self.hidden_output, self.weights_hidden_output) + self.bias_output
    self.predicted_output = self.sigmoid(self.output_activation)
    return self.predicted_output

def backward(self, X, y, learning_rate):
    output_error = y - self.predicted_output
    output_delta = output_error * self.sigmoid_derivative(self.predicted_output)
    hidden_error = np.dot(output_delta, self.weights_hidden_output.T)
    hidden_delta = hidden_error * self.sigmoid_derivative(self.hidden_output)
    self.weights_hidden_output += np.dot(self.hidden_output.T, output_delta) * learning_rate
    self.weights_input_hidden += np.dot(X.T, hidden_delta) * learning_rate

# Trained on X = [[0,0],[0,1],[1,0],[1,1]], y = [[0],[1],[1],[0]]
# with 4 hidden neurons, 10,000 epochs, learning_rate = 0.1`}
        </pre>
      </Section>

      <Section title="Quiz — check your understanding">
        <ModuleQuiz questions={QUIZ} domain="dl" quizId="dl-module-2-quiz" />
      </Section>

      <Section title="What to study for the exam">
        <div className="text-sm text-nexus-muted space-y-4 leading-relaxed">
          <div>
            <p className="text-nexus-text font-medium mb-1">Must-know definitions</p>
            <p>Neuron, connection, weight, bias, propagation function, learning rule · input/hidden/output layers · forward propagation · loss function · backpropagation · gradient · stochastic gradient descent · supervised / unsupervised / reinforcement learning · feedforward network, MLP, CNN, RNN, LSTM.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Must-know formulas</p>
            <p>z = Σwᵢxᵢ + b · sigmoid yⱼ = 1/(1+e⁻ᵃʲ) · MSE = (predicted − actual)² · output delta δ₅ = y₅(1−y₅)(target−y₅) · hidden delta δⱼ = yⱼ(1−yⱼ)(w·δ_next) · weight update Δwᵢⱼ = η·δⱼ·output.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Numericals you should be able to redo by hand</p>
            <p>The email classification example (H1=0.8, H2=0, output≈0.636, spam). The 5-node backprop example's first iteration in full: a1=0.21→y3≈0.56, a2=0.315→y4≈0.59, a3=0.702→y5≈0.67, error=−0.17, δ5≈−0.0376, δ3≈−0.0027, δ4≈−0.00819, w₂,₃(new)≈0.878, w₁,₁(new)≈0.199.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Short-answer questions</p>
            <p>What are the three stages of the neural-network learning process? Distinguish supervised, unsupervised, and reinforcement learning with one example each. What is the vanishing gradient problem, and where does it come from in backpropagation's math?</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Long-answer questions</p>
            <p>Walk through the email classification example end to end, showing every weighted sum and activation. Derive one full backpropagation iteration on the 5-node network from the doc, showing the forward pass, error calculation, and every weight update — and explain why the input-to-hidden weights change by a smaller amount than the hidden-to-output weights in this particular example.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
