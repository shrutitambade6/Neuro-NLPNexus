import type { BookChapter } from "./bookChapters";

// The real DL Book content — migrated from the Deep Learning lab pages'
// own TheoryBlock definitions, worked examples, formula sheets, and
// comparison tables (see the project doc "Digital Books content
// migration" for the exact source mapping). Every definition/example/
// formula below is reproduced from where it already lived in the app —
// much of it traceable to the user's own uploaded course documents
// (chap_01.docx, Neural_network_chap-2.docx, Autoencoders_1.docx) via the
// SyllabusBadge citations on DlModule1/2/3 — nothing here was invented to
// fill a chapter. Chapters are listed in reading order — reordering this
// array changes the book's chapter numbers but never any deep-link, since
// those target `id`.
export const DL_CHAPTERS: BookChapter[] = [
  {
    id: "introduction-to-deep-learning",
    number: "Chapter 01",
    title: "Introduction to Deep Learning",
    intro: "What Deep Learning actually is, and how the field arrived here — from one neuron in 1943 to Transformers in 2017.",
    blocks: [
      {
        kind: "definition",
        text:
          "Deep Learning is a branch of machine learning built from layers of simple computational units — artificial neurons — stacked so that each layer learns a slightly more abstract representation of the input than the one before it. \"Deep\" refers to having more than a couple of these layers.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Unlike the rule-based and statistical methods used throughout classical NLP (n-gram counts, TF-IDF, CYK parsing), a deep network doesn't have its logic written by hand — it learns its own weights from data by repeatedly measuring how wrong its predictions are and nudging itself to be less wrong. That \"measure error, then adjust\" loop — loss, gradient, gradient descent — is this book's spine.",
      },
      { kind: "subheading", text: "A brief history" },
      {
        kind: "table",
        headers: ["Year", "Milestone", "What happened"],
        rows: [
          ["1943", "McCulloch–Pitts Neuron", "Warren McCulloch and Walter Pitts publish the first mathematical model of an artificial neuron."],
          ["1958", "The Perceptron", "Frank Rosenblatt introduces the Perceptron, the first trainable neural network model."],
          ["1960s–1980s", "The Quiet Years", "Single-layer perceptrons prove unable to solve problems like XOR; progress slows (the \"AI winter\")."],
          ["1980s", "Backpropagation", "Hinton, Rumelhart, and Williams popularize backpropagation, making multi-layer network training practical."],
          ["1990s", "CNNs, RNNs, LSTMs", "Yann LeCun's CNNs excel at images; Hochreiter and Schmidhuber's LSTMs excel at sequences."],
          ["2006", "Deep Belief Networks", "Geoffrey Hinton shows deep architectures can be trained effectively, reviving interest in the field."],
          ["2012", "AlexNet", "A deep CNN wins ImageNet by a wide margin, kicking off the modern deep learning era."],
          ["2014", "GANs", "Ian Goodfellow introduces Generative Adversarial Networks."],
          ["2017", "Transformers", "Google Brain's Transformer architecture reshapes natural language processing."],
        ],
      },
      {
        kind: "thinkAboutIt",
        text: "Deep Learning replaced hand-written rules with a \"measure error, then adjust\" loop. What would have to be true about a problem for a hand-written, rule-based system to still beat a learned one?",
      },
      {
        kind: "recap",
        points: [
          "Deep Learning stacks layers of simple neurons so each layer learns a more abstract representation than the last.",
          "Its defining training loop is: measure error (loss), compute the gradient, adjust the weights — repeat.",
          "The field's history runs from a single hand-designed neuron (1943) through a decades-long slowdown (the AI winter) to backpropagation, then CNNs/RNNs/LSTMs, and finally Transformers (2017).",
        ],
      },
    ],
  },
  {
    id: "the-artificial-neuron",
    number: "Chapter 02",
    title: "The Artificial Neuron",
    intro: "One computational unit, and the arithmetic every larger network is built out of.",
    blocks: [
      {
        kind: "definition",
        text:
          "A single computational unit that takes one or more numeric inputs, multiplies each by a learned weight, adds a bias, and passes the result through an activation function to produce one output.",
      },
      {
        kind: "formula",
        label: "A Neuron's Arithmetic",
        formula: "x₁·w₁ + x₂·w₂ + ⋯ + b = z  →  activation(z) = output",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Every deep network — no matter how large — is built entirely out of neurons like this one, connected in layers. Understanding one neuron's arithmetic is understanding the network's basic unit of computation.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "The 1958 Perceptron (Rosenblatt) was an early version of this idea using a hard step-function activation; modern neurons use smooth activations (sigmoid, tanh, ReLU) specifically so gradient descent has a non-zero gradient to work with almost everywhere.",
      },
      { kind: "subheading", text: "Weights and bias" },
      {
        kind: "definition",
        text:
          "Each input xᵢ is multiplied by its own learned weight wᵢ, which controls how much that input matters. A bias b is then added — a constant that shifts the neuron's output independent of any input.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Training a neural network almost entirely means finding good values for its weights and biases — everything else about the network's structure (how many neurons, how they're connected) is usually fixed by the designer beforehand.",
      },
      { kind: "subheading", text: "Activation functions" },
      {
        kind: "paragraph",
        text:
          "An activation function takes the raw weighted sum z and squashes or reshapes it — this is what lets a network learn non-linear patterns (without it, stacking any number of layers would collapse to one big linear equation).",
      },
      {
        kind: "table",
        headers: ["Function", "Formula", "Range", "Typically used for"],
        rows: [
          ["Sigmoid", "1 / (1 + e⁻ᶻ)", "(0, 1)", "Binary output probabilities"],
          ["Tanh", "(eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ)", "(−1, 1)", "Zero-centered hidden layers"],
          ["ReLU", "max(0, z)", "[0, ∞)", "Default for most hidden layers"],
          ["Leaky ReLU", "z if z>0 else 0.01·z", "(−∞, ∞)", "Fixes ReLU's \"dead neuron\" problem"],
          ["Softmax", "eᶻⁱ / Σⱼ eᶻʲ", "(0, 1), sums to 1", "Multi-class output layer"],
        ],
      },
      {
        kind: "important",
        label: "Softmax, Specifically",
        text:
          "Softmax turns a whole vector of raw scores (logits) into a probability distribution — every output is positive and the outputs sum to exactly 1. Unlike sigmoid/tanh/ReLU, softmax's output for one element depends on every other element in the vector — doubling one logit changes every output's probability, not just its own.",
      },
      { kind: "keyTerms", terms: ["Neuron", "Weight", "Bias", "Activation Function", "Softmax"] },
      {
        kind: "thinkAboutIt",
        text: "Softmax is the only activation function in this chapter's table whose output for one element depends on every other element in the vector. What would go wrong if you tried using softmax as a hidden-layer activation instead of an output-layer one?",
      },
      {
        kind: "recap",
        points: [
          "A neuron computes a weighted sum of its inputs plus a bias, then applies an activation function.",
          "Weights control how much each input matters; bias shifts the output independent of any input.",
          "Activation functions introduce non-linearity — without one, stacking layers would collapse into one linear equation.",
          "Softmax is the standard multi-class output activation: it normalizes a whole vector into probabilities summing to 1.",
        ],
      },
    ],
  },
  {
    id: "mp-neuron-and-perceptron",
    number: "Chapter 03",
    title: "M-P Neuron & the Perceptron",
    intro: "The two earliest models of an artificial neuron, and the limitation that separates them.",
    blocks: [
      { kind: "subheading", text: "The McCulloch–Pitts (M-P) Neuron" },
      {
        kind: "definition",
        text:
          "One of the earliest mathematical models of an artificial neuron (McCulloch & Pitts, 1943). It receives several binary inputs, combines them using a weighted sum, and produces a binary output based on a fixed threshold.",
      },
      { kind: "formula", formula: "S = Σ wᵢxᵢ  →  y = 1 if S ≥ θ, else 0" },
      {
        kind: "example",
        text: "Worked example: x₁=1, x₂=1, w₁=w₂=1, θ=2 → S=2 ≥ θ → y=1.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "The M-P neuron has no learning mechanism at all — its weights and threshold must be chosen by hand. That single limitation is exactly what the Perceptron was invented to fix.",
      },
      { kind: "subheading", text: "Thresholding logic & logic gates" },
      {
        kind: "paragraph",
        text:
          "Thresholding logic is how the M-P neuron implements basic Boolean logic gates (AND, OR, NOT) purely by choosing the right weights and threshold — no training required. Threshold functions are discontinuous (a step), so their derivative is zero almost everywhere — exactly why they're unsuitable for gradient-based optimization, motivating the sigmoid neuron covered in the next chapter.",
      },
      { kind: "subheading", text: "The Perceptron" },
      {
        kind: "definition",
        text:
          "Proposed by Frank Rosenblatt (1958), the perceptron extends the M-P neuron with numeric weights, a bias term, and — critically — the ability to learn its own weights from training data.",
      },
      { kind: "formula", formula: "z = w·x + b  →  y = f(z), using the step function" },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "It's the first trainable neural network model, and its \"weighted sum → activation → output\" structure is exactly the forward-pass pattern every network in this platform still uses.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "A perceptron's decision boundary (w₁x₁ + w₂x₂ + b = 0) is always a straight line (or hyperplane in higher dimensions) — this geometric fact is exactly why it can only solve linearly separable problems.",
      },
      { kind: "subheading", text: "The Perceptron Learning Algorithm" },
      {
        kind: "definition",
        text:
          "An iterative algorithm that trains a perceptron by adjusting its weights and bias every time it makes a wrong prediction.",
      },
      { kind: "formula", label: "Weight & Bias Update", formula: "wᵢ ← wᵢ + η·(t−y)·xᵢ   and   b ← b + η·(t−y)" },
      {
        kind: "important",
        text:
          "This is the very first \"train from data\" algorithm in the history of neural networks — a direct ancestor of the gradient descent used to train every modern deep network. The Perceptron Convergence Theorem guarantees the algorithm finds a solution in finite steps only if the training data is linearly separable.",
      },
      { kind: "subheading", text: "The XOR problem" },
      {
        kind: "definition",
        text:
          "A single-layer perceptron can solve AND, OR, and NOT, but not XOR — because no straight line can separate XOR's positive and negative examples.",
      },
      {
        kind: "table",
        headers: ["x₁", "x₂", "XOR"],
        rows: [
          ["0", "0", "0"],
          ["0", "1", "1"],
          ["1", "0", "1"],
          ["1", "1", "0"],
        ],
      },
      {
        kind: "important",
        text:
          "This exact limitation (raised by Minsky & Papert in 1969) contributed to the \"AI winter\" of the 1960s–80s, and directly motivated multilayer networks — covered in the next chapter.",
      },
      { kind: "keyTerms", terms: ["M-P Neuron", "Perceptron", "Linear Separability", "Decision Boundary"] },
      {
        kind: "thinkAboutIt",
        text: "The Perceptron Learning Algorithm is only guaranteed to converge when the training data is linearly separable. What actually happens if you run it on XOR anyway — does it crash, loop forever, or something else?",
      },
      {
        kind: "recap",
        points: [
          "The M-P neuron (1943) has fixed, hand-chosen weights and threshold, and no learning mechanism.",
          "The Perceptron (1958) adds numeric weights, a bias, and a trainable weight-update rule.",
          "A perceptron's decision boundary is always a straight line/hyperplane, so it can only solve linearly separable problems — XOR is the classic counterexample.",
        ],
      },
    ],
  },
  {
    id: "mlps-and-sigmoid-neurons",
    number: "Chapter 04",
    title: "MLPs, Sigmoid Neurons & the Universal Approximation Theorem",
    intro: "How stacking layers — and softening the activation function — overcomes the single perceptron's limits.",
    blocks: [
      { kind: "subheading", text: "Multilayer Perceptrons (MLPs)" },
      {
        kind: "definition",
        text:
          "An MLP is a feedforward network with an input layer, one or more hidden layers, and an output layer — each hidden neuron applies a nonlinear activation, and stacking these lets the network represent functions no single-layer perceptron ever could, including XOR.",
      },
      {
        kind: "important",
        label: "The Universal Approximation Theorem",
        text:
          "The theorem formally guarantees that a network with even just one hidden layer — given a nonlinear activation and enough hidden neurons — can approximate a broad class of continuous functions to arbitrary accuracy.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "The theorem is an existence proof, not a training guarantee or an efficiency claim: it says a suitable network exists, not that gradient descent will easily find it, or that one hidden layer is the practical choice — deep networks often represent the same functions more efficiently with more, narrower layers.",
      },
      { kind: "subheading", text: "Sigmoid neurons" },
      {
        kind: "definition",
        text:
          "A sigmoid neuron replaces the hard step function with the smooth sigmoid function σ(z) = 1/(1+e⁻ᶻ), which squashes any real number into the open interval (0, 1).",
      },
      { kind: "formula", label: "Sigmoid & Its Derivative", formula: "σ(z) = 1 / (1 + e⁻ᶻ)      σ′(z) = σ(z)(1 − σ(z))" },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Sigmoid's derivative is smooth and simple to compute — exactly what gradient-based training (backpropagation, covered in Chapter 07) needs, and the step function could never provide.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "Sigmoid isn't perfect: for large |z|, σ′(z) ≈ 0 (the \"vanishing gradient\" problem), and its output is never zero-centered — both reasons modern hidden layers often prefer ReLU instead.",
      },
      {
        kind: "example",
        text: "σ(2) ≈ 0.8808, σ(−2) ≈ 0.1192.",
      },
      { kind: "subheading", text: "Comparison" },
      {
        kind: "table",
        headers: ["Feature", "M-P Neuron", "Perceptron", "MLP", "Sigmoid Neuron"],
        rows: [
          ["Inputs", "Binary", "Numeric", "Numeric", "Numeric"],
          ["Learning", "No", "Yes", "Yes", "Yes"],
          ["Layers", "Single", "Single", "Multiple", "Usually part of a network"],
          ["Activation", "Threshold", "Step", "Nonlinear", "Sigmoid"],
          ["Output", "Binary", "Binary", "Depends on activation", "0 to 1"],
          ["Nonlinear modeling", "Limited", "No", "Yes", "Yes"],
          ["Solves XOR", "No", "No", "Yes", "Yes, with suitable architecture"],
          ["Gradient-based training", "No", "Traditionally no", "Yes", "Yes"],
        ],
      },
      { kind: "keyTerms", terms: ["Multi-Layer Perceptron (MLP)", "Vanishing Gradient"] },
      {
        kind: "thinkAboutIt",
        text: "The Universal Approximation Theorem guarantees one hidden layer CAN represent a function — it says nothing about how easy that function is to actually train, or how many neurons it would take. Why might a deep, narrow network beat a shallow, wide one with the same total parameter count?",
      },
      {
        kind: "recap",
        points: [
          "An MLP stacks hidden layers of nonlinear neurons, letting it represent functions (like XOR) a single perceptron cannot.",
          "The Universal Approximation Theorem is an existence proof — one hidden layer can be enough in principle, but not necessarily efficient or easy to train.",
          "Sigmoid neurons replace the hard step with a smooth, differentiable curve, giving gradient descent a usable gradient almost everywhere — at the cost of the vanishing-gradient problem for large |z|.",
        ],
      },
    ],
  },
  {
    id: "neural-network-fundamentals",
    number: "Chapter 05",
    title: "Neural Network Fundamentals & Learning Types",
    intro: "The vocabulary — layers, learning types, and network families — every later chapter assumes.",
    blocks: [
      {
        kind: "definition",
        text:
          "A neural network is built from interconnected neurons, organized into layers, with weighted connections and biases between them, plus a learning rule that adjusts those weights and biases over time.",
      },
      {
        kind: "paragraph",
        text:
          "Learning follows three stages: input computation (data enters the network), output generation (the network produces an output from its current parameters), and iterative refinement (weights and biases are adjusted to improve performance).",
      },
      { kind: "subheading", text: "Layers" },
      {
        kind: "table",
        headers: ["Layer", "Role"],
        rows: [
          ["Input Layer", "Receives the input data — each input neuron corresponds to one feature."],
          ["Hidden Layer(s)", "Do most of the computational work, transforming inputs into something the output layer can use."],
          ["Output Layer", "Produces the final result — its format depends on the task (classification, regression, ...)."],
        ],
      },
      { kind: "formula", formula: "z = w₁x₁ + w₂x₂ + ⋯ + wₙxₙ + b  →  activation(z) = neuron output" },
      { kind: "subheading", text: "Three types of learning" },
      {
        kind: "table",
        headers: ["Type", "How it works"],
        rows: [
          ["Supervised Learning", "The network learns from labeled input-output pairs; comparing its outputs to known desired outputs creates an error signal it uses to improve."],
          ["Unsupervised Learning", "The data has no labeled outputs. The network models the underlying structure of the input instead — clustering and association are common techniques."],
          ["Reinforcement Learning", "The network learns by interacting with an environment, receiving rewards or penalties, and finding a strategy that maximizes cumulative reward over time."],
        ],
      },
      { kind: "subheading", text: "Types of neural networks" },
      {
        kind: "table",
        headers: ["Network", "What it is"],
        rows: [
          ["Feedforward Network", "Data moves from input to output in a single direction, with no loops."],
          ["Single-layer Perceptron", "One layer: applies weights, sums inputs, and uses an activation to produce output."],
          ["Multilayer Perceptron (MLP)", "Three or more layers: an input layer, one or more hidden layers, and an output layer."],
          ["Convolutional Neural Network (CNN)", "Uses convolutional layers to automatically learn spatial features from images."],
          ["Recurrent Neural Network (RNN)", "Handles sequential data using feedback loops that retain context over time."],
          ["Long Short-Term Memory (LSTM)", "A type of RNN with memory cells and gates that handle long-term dependencies and avoid vanishing gradients."],
        ],
      },
      { kind: "keyTerms", terms: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Feedforward Network"] },
      {
        kind: "thinkAboutIt",
        text: "Supervised learning needs labeled input-output pairs. If you had a million unlabeled emails and no spam/not-spam labels at all, which of the three learning paradigms could you still use — and what would it actually discover instead of \"spam\"?",
      },
      {
        kind: "recap",
        points: [
          "A network's learning process has three stages: input computation, output generation, iterative refinement.",
          "A network has three kinds of layers: input, hidden, output.",
          "The three learning paradigms — supervised, unsupervised, reinforcement — differ in whether and how an error/reward signal is available.",
          "CNNs specialize in spatial (image) data; RNNs and LSTMs specialize in sequential data — both get their own chapter later in this book.",
        ],
      },
    ],
  },
  {
    id: "forward-propagation-and-loss",
    number: "Chapter 06",
    title: "Forward Propagation & Loss Functions",
    intro: "How a trained network makes a prediction, and how it's scored.",
    blocks: [
      { kind: "subheading", text: "Forward propagation" },
      {
        kind: "definition",
        text:
          "The process of computing a neuron's (or a whole network's) output by passing inputs through its weights, bias, and activation function, left to right.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Forward propagation is how a trained network actually makes a prediction — everything about training (choosing weights) exists to make this step produce good outputs.",
      },
      { kind: "subheading", text: "Worked example: email spam classification" },
      {
        kind: "example",
        text:
          "An email's keyword presence (free / win / offer) is fed through a 3-input, 2-ReLU-hidden-neuron, 1-sigmoid-output network to produce a spam probability. For input vector [1, 0, 1]: H1's weighted sum passes through ReLU to give H1=0.8; H2's weighted sum is −0.1, and since ReLU(z)=max(0,z), any negative z outputs exactly 0, so H2=0. These hidden outputs feed the sigmoid output neuron, giving a final spam probability of about 0.636.",
      },
      { kind: "subheading", text: "Loss functions" },
      {
        kind: "definition",
        text:
          "A loss function measures how wrong a single prediction is compared to the true value — a small number when the prediction is close, a larger number when it's far off.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "Loss is the quantity gradient descent is trying to minimize — without a loss function, there's nothing telling the network which direction \"better\" even is.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "Mean Squared Error suits continuous-valued predictions (regression); Binary Cross-Entropy suits a single yes/no probability — using MSE on a probability, or cross-entropy on an unbounded value, both give misleading gradients.",
      },
      { kind: "formula", label: "Mean Squared Error", formula: "MSE = (predicted − actual)²" },
      { kind: "keyTerms", terms: ["Loss Function", "Forward Propagation"] },
      {
        kind: "thinkAboutIt",
        text: "In the email-classifier worked example, H2's weighted sum was negative and ReLU zeroed it out completely. Is that input's information permanently lost at that neuron, or could it still influence the final prediction some other way?",
      },
      {
        kind: "recap",
        points: [
          "Forward propagation computes a network's output by pushing inputs through weights, bias, and activation, layer by layer.",
          "ReLU clips any negative weighted sum to exactly 0 — demonstrated directly by H2 in the email-classifier example.",
          "A loss function scores how wrong one prediction is; MSE suits regression, Binary Cross-Entropy suits a single probability output.",
        ],
      },
    ],
  },
  {
    id: "backpropagation",
    number: "Chapter 07",
    title: "Backpropagation",
    intro: "The chain-rule algorithm that tells every weight in a network exactly how much it was to blame.",
    blocks: [
      {
        kind: "definition",
        text:
          "An algorithm that trains a network by computing the loss, using the chain rule to find each weight and bias's gradient (share of blame for the error), then updating every weight and bias in the direction that reduces the loss.",
      },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "It's the algorithm that makes training a multi-layer network practical — without it, there'd be no efficient way to know how to adjust hidden-layer weights, whose effect on the final error is indirect. Backpropagation has two main steps: a forward pass (computes the network's output) and a backward pass (propagates the error back through the network to update weights and biases using gradients).",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "Backpropagation propagates error backward layer by layer (output → hidden → input) precisely because each layer's gradient depends on the next layer's gradient — the chain rule, applied one layer at a time.",
      },
      { kind: "subheading", text: "Worked example: the 5-node network" },
      {
        kind: "example",
        text:
          "A 2-input, 2-hidden-neuron, 1-output network (all sigmoid, no biases), trained toward a target output of 0.5 with learning rate 1. First iteration: a1=0.21 → y3≈0.56, a2=0.315 → y4≈0.59, a3=0.702 → y5≈0.67, error = 0.5 − 0.67 = −0.17. The output unit's error term δ5 = y5(1−y5)(target−y5) = 0.67×0.33×(−0.17) ≈ −0.0376 — the sigmoid derivative times the raw output error. Hidden deltas: δ3≈−0.0027, δ4≈−0.00819.",
      },
      { kind: "formula", label: "Output & Hidden Delta", formula: "δ_output = y(1−y)(target−y)      δ_hidden = y(1−y)(w·δ_next)" },
      { kind: "formula", label: "Weight Update", formula: "Δwᵢⱼ = η·δⱼ·output" },
      {
        kind: "important",
        text:
          "Why does w₂,₃ (hidden-to-output, originally 0.9) change more in one step than w₁,₁ (input-to-hidden, originally 0.2)? Δw = η·δ·output, and w₂,₃'s delta (δ5) and its input (y4=0.59) are both larger in magnitude than w₁,₁'s delta (δ3) and input (x1=0.35) — Δw₂,₃ ≈ −0.0222 versus Δw₁,₁ ≈ −0.00095. It comes from the actual delta and input values at each connection, not a special rule tied to layer position.",
      },
      { kind: "subheading", text: "A reference implementation (for reading)" },
      {
        kind: "code",
        label: "Backpropagation for XOR (Python reference, not executed here)",
        code:
          "def feedforward(self, X):\n    self.hidden_activation = np.dot(X, self.weights_input_hidden) + self.bias_hidden\n    self.hidden_output = self.sigmoid(self.hidden_activation)\n    self.output_activation = np.dot(self.hidden_output, self.weights_hidden_output) + self.bias_output\n    self.predicted_output = self.sigmoid(self.output_activation)\n    return self.predicted_output\n\ndef backward(self, X, y, learning_rate):\n    output_error = y - self.predicted_output\n    output_delta = output_error * self.sigmoid_derivative(self.predicted_output)\n    hidden_error = np.dot(output_delta, self.weights_hidden_output.T)\n    hidden_delta = hidden_error * self.sigmoid_derivative(self.hidden_output)\n    self.weights_hidden_output += np.dot(self.hidden_output.T, output_delta) * learning_rate\n    self.weights_input_hidden += np.dot(X.T, hidden_delta) * learning_rate\n\n# Trained on X = [[0,0],[0,1],[1,0],[1,1]], y = [[0],[1],[1],[0]]\n# with 4 hidden neurons, 10,000 epochs, learning_rate = 0.1",
      },
      { kind: "keyTerms", terms: ["Backpropagation"] },
      {
        kind: "thinkAboutIt",
        text: "Using Δw = η·δ·output, what would have to be true about a connection's delta or its input for that weight to receive a zero update on a given training step — and what would that mean in practice?",
      },
      {
        kind: "recap",
        points: [
          "Backpropagation has two steps: a forward pass (compute the output) and a backward pass (propagate error backward via the chain rule).",
          "Each unit's delta (error term) is its activation derivative times the error flowing into it from the next layer.",
          "A weight's update is proportional to its own delta times its input — this is exactly why different weights in the same network update by different amounts in one step.",
        ],
      },
    ],
  },
  {
    id: "gradient-descent",
    number: "Chapter 08",
    title: "Gradient Descent & Training Mechanics",
    intro: "The update rule that actually trains a network, and the knobs (epoch, batch size, learning rate) that control it.",
    blocks: [
      {
        kind: "definition",
        text:
          "An iterative optimization algorithm that repeatedly nudges each weight and the bias a small step in the direction that reduces the loss, using the gradient computed by backpropagation.",
      },
      { kind: "formula", label: "The Update Rule", formula: "new_weight = old_weight − learning_rate × gradient" },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "This is the actual training loop — everything before it (forward pass, loss, gradient via backpropagation) exists to make this one update rule possible.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "Too high a learning rate can overshoot and diverge instead of converging; too low makes training painfully slow — a real, demonstrable trade-off, not just a rule of thumb.",
      },
      { kind: "subheading", text: "Epochs, batch size, and learning rate" },
      {
        kind: "table",
        headers: ["Term", "Meaning"],
        rows: [
          ["Epoch", "One complete pass through the entire training dataset."],
          ["Batch size", "How many training examples are averaged together before one weight update. A batch size of 1 updates after every single example; real networks usually average over a batch of dozens to thousands of examples per update for a smoother, less noisy gradient."],
          ["Learning rate", "How large a step gradient descent takes on each update. It's the single most sensitive hyperparameter in most networks."],
        ],
      },
      { kind: "keyTerms", terms: ["Gradient Descent", "Epoch", "Learning Rate"] },
      {
        kind: "thinkAboutIt",
        text: "If a very small learning rate is always safer than a large one, why wouldn't every network just use the smallest learning rate possible?",
      },
      {
        kind: "recap",
        points: [
          "Gradient descent updates each weight by subtracting learning_rate × gradient, repeatedly.",
          "An epoch is one full pass over the training data; batch size controls how many examples are averaged per update.",
          "Learning rate is the most sensitive hyperparameter — too high diverges, too low is painfully slow.",
        ],
      },
    ],
  },
  {
    id: "cnn",
    number: "Chapter 09",
    title: "Convolutional Neural Networks",
    intro: "How a network learns to see — by sliding small filters across an image instead of looking at every pixel independently.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "A CNN's real forward pass runs: Image → Convolution → Feature Map → Activation → Pooling → Flatten → Dense → Classification. Every stage is a genuine computation: a real 2D convolution (multiply-and-add over each kernel window), real ReLU/sigmoid/tanh applied cell by cell, real max/average pooling, and a real dense + softmax classification head over randomly initialized weights (no training happens in the interactive lab — the same honest scope as the Neural Network Playground).",
      },
      { kind: "flow", steps: ["Image", "Convolution", "Feature Map", "Activation", "Pooling", "Flatten", "Dense", "Classification"] },
      {
        kind: "definition",
        label: "Convolution",
        text: "Sliding a small kernel across a grid (like an image), computing a real dot-product at each position to produce a feature map that highlights where a pattern appears.",
      },
      {
        kind: "definition",
        label: "Pooling",
        text: "Downsampling a feature map by summarizing each small window with its max or average value, reducing spatial size while keeping the strongest signal.",
      },
      {
        kind: "table",
        headers: ["Model", "Introduced", "Key mechanism", "Limitations"],
        rows: [
          ["CNN for Text/Images", "2014 (text); earlier for vision", "Slides small filters over the input, detecting local patterns anywhere in it.", "A single layer only sees a fixed local window; longer-range structure needs stacking layers."],
        ],
      },
      {
        kind: "important",
        label: "Where This Shows Up",
        text:
          "Image Classification: CNNs turn a grid of pixels into a class label by learning convolutional filters that detect edges, textures, and shapes at increasing scale (photo tagging, medical imaging, quality inspection). Object Detection & Vision: the same convolution → feature map → pooling pipeline, applied at multiple scales, underlies most real-time vision systems (self-driving perception, surveillance, AR filters).",
      },
      { kind: "keyTerms", terms: ["Convolution", "Pooling"] },
      {
        kind: "thinkAboutIt",
        text: "Pooling deliberately throws away most of the information in a feature map, keeping only the max or average of each small window. Why would discarding information ever make a network perform better rather than worse?",
      },
      {
        kind: "recap",
        points: [
          "A CNN's pipeline is: convolution → activation → pooling → flatten → dense → classification.",
          "Convolution slides a small kernel across the input, computing a real dot-product at each position.",
          "Pooling downsamples a feature map, keeping the strongest (max) or average signal in each window.",
        ],
      },
    ],
  },
  {
    id: "rnn-and-lstm",
    number: "Chapter 10",
    title: "Recurrent Networks & LSTM",
    intro: "How a network handles a sequence by carrying a running memory forward, one step at a time.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "A real recurrent forward pass runs over a short sequence. In Simple RNN mode, each step's real previous hidden state genuinely feeds back into the next: hₜ = activation(W_xh·xₜ + W_hh·hₜ₋₁ + b_h). In LSTM mode, all four real gates — forget, input, candidate, output — are computed at every step from the real previous hidden and cell state, and genuinely update the cell state before deriving the new hidden state.",
      },
      {
        kind: "definition",
        label: "Recurrence",
        text: "Carrying a hidden state forward from one sequence step to the next, so each step's computation genuinely depends on everything the model has processed so far.",
      },
      { kind: "formula", label: "Simple RNN Step", formula: "hₜ = activation(W_xh·xₜ + W_hh·hₜ₋₁ + b_h)" },
      {
        kind: "definition",
        label: "LSTM Gate",
        text: "One of an LSTM cell's four learned sigmoid/tanh units — forget, input, candidate, and output — that together control what old memory to discard, what new information to add, and what to expose as this step's output.",
      },
      {
        kind: "important",
        label: "Why LSTM Exists",
        text: "A plain RNN's hidden state tends to lose influence from many steps ago (the vanishing-gradient problem recurring through time). LSTM's gates let it preserve or discard memory deliberately, rather than it fading uncontrollably — a type of RNN with memory cells and gates that handle long-term dependencies and avoid vanishing gradients.",
      },
      {
        kind: "important",
        label: "Where This Shows Up",
        text:
          "Sequence Prediction: RNNs and LSTMs carry a real hidden state forward through a sequence, letting a model's prediction at each step depend on everything it's seen so far (time-series forecasting, autocomplete, music generation). Speech Recognition: audio is chopped into a sequence of frames and fed through a recurrent (or attention-based) model — the same sequence-processing idea applied to sound instead of text (voice assistants, transcription, dictation).",
      },
      {
        kind: "table",
        headers: ["Model", "Introduced", "Key mechanism", "Limitations"],
        rows: [
          ["RNN / LSTM", "RNN: 1980s · LSTM: 1997", "Carries a hidden state forward one step at a time; LSTM adds gates to control long-term memory.", "Strictly sequential processing; still struggles with very long-range dependencies vs. attention."],
        ],
      },
      { kind: "keyTerms", terms: ["Recurrence", "LSTM Gate"] },
      {
        kind: "thinkAboutIt",
        text: "An LSTM's forget gate can choose to keep nearly all of the old cell state at every single step. If it did that at every step across a 500-word sequence, is the network genuinely \"remembering\" word one by the end, or has something been lost along the way regardless?",
      },
      {
        kind: "recap",
        points: [
          "An RNN carries a hidden state forward across sequence steps, so each prediction depends on everything seen so far.",
          "LSTM adds four gates (forget, input, candidate, output) to deliberately control what memory is kept, added, or exposed — fixing the plain RNN's tendency to lose long-range influence.",
          "Both are strictly sequential — each step must wait for the previous one, unlike the attention mechanism in the next chapter.",
        ],
      },
    ],
  },
  {
    id: "attention-and-transformers",
    number: "Chapter 11",
    title: "Attention & Transformers",
    intro: "How a model decides, for every position in a sequence, how much to 'look at' every other position — and the architecture built entirely out of that idea.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "Real scaled dot-product attention: softmax(QKᵗ / √d_k)V, computed exactly over a sequence's token embeddings. Q, K, and V are real linear projections of those embeddings (not the embeddings themselves), and every row of the attention-weight matrix is a genuine probability distribution — how much each token attends to every token, including itself.",
      },
      {
        kind: "definition",
        label: "Attention",
        text: "A mechanism that computes, for each position in a sequence, a real weighted combination of every other position's Value vector — the weights (softmax over scaled Query·Key scores) genuinely sum to 1.",
      },
      { kind: "formula", label: "Scaled Dot-Product Attention", formula: "Attention(Q, K, V) = softmax(QKᵗ / √d_k) · V" },
      {
        kind: "definition",
        label: "Transformer",
        text: "A neural architecture built entirely from (multi-head) self-attention and feedforward layers, with no recurrence — every position can attend to every other position in parallel.",
      },
      {
        kind: "important",
        text:
          "This is one real attention head over a hand-sized sequence; a full transformer stacks several heads and adds positional encoding.",
      },
      {
        kind: "table",
        headers: ["Model", "Introduced", "Key mechanism", "Limitations"],
        rows: [
          ["Seq2Seq with Attention", "2014–2015", "An RNN encoder/decoder, with attention letting the decoder look back at the most relevant encoder states.", "Still fundamentally sequential — inherits the RNN's step-by-step processing."],
          ["Transformer", "2017", "Replaces recurrence with self-attention — every position attends directly to every other, in parallel.", "Attention cost grows with the square of sequence length; needs explicit positional encoding."],
          ["BERT", "2018", "Transformer encoder layers, pretrained via masked language modeling using context from both directions.", "Not naturally suited to left-to-right generation."],
          ["GPT family", "2018–present", "Transformer decoder layers, pretrained to predict the next word from preceding words only.", "Only sees preceding context at each step; can generate fluent text that is factually wrong."],
        ],
      },
      {
        kind: "important",
        label: "Where This Shows Up",
        text:
          "Neural Machine Translation: modern translation systems use attention so every output word can look back at the most relevant input words — exactly the Q/K/V mechanism, at production scale. Large Language Models: models like GPT and BERT are stacks of the same scaled dot-product attention, repeated across many layers and heads, trained on huge amounts of text.",
      },
      { kind: "keyTerms", terms: ["Attention", "Transformer", "Softmax"] },
      {
        kind: "thinkAboutIt",
        text: "A Transformer lets every token attend to every other token directly, with no recurrence at all. Given that, what does it lose that a plain RNN gets for free simply by being forced to process one step at a time?",
      },
      {
        kind: "recap",
        points: [
          "Attention computes a weighted combination of every position's Value vector, with weights from softmax over scaled Query·Key similarity scores.",
          "A Transformer is built entirely from self-attention and feedforward layers — no recurrence, so all positions process in parallel.",
          "BERT (encoder, bidirectional, masked-LM pretraining) and GPT (decoder, left-to-right generation) are the two major Transformer-pretraining families.",
        ],
      },
    ],
  },
  {
    id: "autoencoders",
    number: "Chapter 12",
    title: "Autoencoders",
    intro: "A network that learns what's essential about its input by being forced to compress it, then rebuild it.",
    blocks: [
      {
        kind: "definition",
        text:
          "An autoencoder is a neural network that learns a compact (lower-dimensional) representation of its input by encoding it into a latent representation, then decoding that representation back into a reconstruction of the original input.",
      },
      { kind: "formula", label: "Encoder / Decoder", formula: "h = f_θ(x)  (encoder)      x̂ = g_φ(h)  (decoder)      objective: x̂ ≈ x" },
      {
        kind: "important",
        label: "Why It Matters",
        text:
          "The bottleneck (latent space) forces the network to learn a compressed, useful representation rather than just memorizing — the basis for dimensionality reduction, feature learning, denoising, and anomaly detection.",
      },
      {
        kind: "paragraph",
        text:
          "Reconstruction loss: MSE for continuous data — L(x,x̂) = (1/n)Σ(xᵢ−x̂ᵢ)² — or Binary Cross-Entropy for binary data. Applications include dimensionality reduction, feature learning, data compression, image denoising, anomaly detection, and representation learning.",
      },
      { kind: "subheading", text: "Autoencoders and PCA" },
      {
        kind: "definition",
        text:
          "Principal Component Analysis (PCA) is a classical linear dimensionality-reduction technique. A single-hidden-layer autoencoder using a linear activation function and an appropriate reconstruction loss can learn a subspace equivalent to PCA's principal subspace.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text:
          "Key difference: PCA always finds a linear subspace; a nonlinear autoencoder can learn nonlinear manifold representations, making it strictly more powerful for complex datasets.",
      },
      {
        kind: "important",
        label: "Why Regularize an Autoencoder?",
        text:
          "Without some constraint, a sufficiently powerful autoencoder could just copy its input straight through (x̂=x), minimizing reconstruction loss while learning nothing useful. Regularization (covered next chapter) forces it to actually learn something.",
      },
      { kind: "keyTerms", terms: ["Autoencoder", "Overfitting"] },
      {
        kind: "thinkAboutIt",
        text: "A sufficiently powerful, unregularized autoencoder can minimize reconstruction loss perfectly by just copying its input straight through. Why would a network with a genuinely narrow bottleneck layer be unable to pull off that same trick, no matter how well it's trained?",
      },
      {
        kind: "recap",
        points: [
          "An autoencoder compresses input into a latent code, then reconstructs it — the bottleneck forces useful compression rather than memorization.",
          "A linear single-hidden-layer autoencoder is closely related to PCA; a nonlinear one can learn richer, nonlinear manifold representations.",
          "An unregularized, powerful-enough autoencoder can trivially learn the identity mapping — regularization exists specifically to prevent that shortcut.",
        ],
      },
    ],
  },
  {
    id: "regularization",
    number: "Chapter 13",
    title: "Regularization Techniques",
    intro: "The many different ways to stop a network from overfitting — memorizing instead of learning.",
    blocks: [
      {
        kind: "definition",
        text:
          "Regularization adds a penalty term R to a model's loss, constraining it so it can't simply memorize the training data (or, for an autoencoder, trivially copy its input).",
      },
      { kind: "subheading", text: "Bias–Variance Tradeoff" },
      {
        kind: "definition",
        text:
          "Total prediction error can be conceptually decomposed as Error = Bias² + Variance + Irreducible Noise. High bias means a model too simple (underfitting); high variance means a model too complex, overly sensitive to the training data (overfitting).",
      },
      {
        kind: "important",
        text: "Every regularization technique below is, at its core, a way of trading a little more bias for a lot less variance.",
      },
      { kind: "subheading", text: "Sparse & Contractive Autoencoders" },
      {
        kind: "definition",
        text:
          "A Sparse Autoencoder encourages only a small number of hidden neurons to be active for any given input, using a KL-divergence penalty comparing each neuron's actual average activation to a small target. A Contractive Autoencoder instead penalizes the Frobenius norm of the encoder's Jacobian, making the latent representation insensitive to small input changes.",
      },
      { kind: "formula", label: "Sparsity Penalty (KL-divergence)", formula: "KL(ρ‖ρ̂ⱼ) = ρ·log(ρ/ρ̂ⱼ) + (1−ρ)·log((1−ρ)/(1−ρ̂ⱼ))" },
      { kind: "subheading", text: "L2 Regularization" },
      {
        kind: "definition",
        text: "Adds a penalty based on the squared magnitude of the weights: the objective becomes L_total = L_data + (λ/2)Σwᵢ².",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text: "Differentiating the (λ/2)Σwᵢ² term gives exactly λwᵢ as the regularizer's own gradient contribution — the 1/2 is chosen specifically so this derivative comes out clean, without a leftover factor of 2.",
      },
      { kind: "subheading", text: "Early stopping" },
      {
        kind: "paragraph",
        text:
          "Stop training when validation performance stops improving, and restore the model from its best epoch — not the epoch training actually halted at. Example: validation loss falls through epoch 5 (0.29) then rises at epochs 6–7 (0.30, 0.33) — early stopping restores the epoch-5 model.",
      },
      { kind: "subheading", text: "Dataset augmentation & noise injection" },
      {
        kind: "definition",
        text:
          "Dataset augmentation artificially creates additional training examples via realistic transformations (rotation, translation, scaling, cropping, flipping, brightness, noise). Noise injection deliberately corrupts inputs to force the model to learn robust features — a Denoising Autoencoder is trained to reconstruct a clean input from a deliberately corrupted version of it.",
      },
      {
        kind: "table",
        headers: ["Noise type", "How it works"],
        rows: [
          ["Gaussian noise", "x̃ = x + ε, where ε ~ N(0, σ²)"],
          ["Masking noise", "Randomly set some input values to zero."],
          ["Salt-and-pepper noise", "Randomly replace values with extreme values."],
        ],
      },
      { kind: "subheading", text: "Parameter sharing & tying" },
      {
        kind: "definition",
        text:
          "Parameter sharing reuses the same parameters in multiple locations (CNNs reusing a filter across positions is the classic example). Parameter tying, specific to autoencoders, constrains the decoder weights to equal the encoder weights' transpose: W_d = W_eᵗ — instead of learning two independent weight matrices, the network learns one.",
      },
      { kind: "subheading", text: "Ensemble methods" },
      {
        kind: "definition",
        text:
          "Instead of relying on one model, train several models and combine their outputs — via bagging (train independently, combine), boosting (train sequentially, focusing on previous errors), voting (majority), or averaging.",
      },
      { kind: "subheading", text: "Dropout" },
      {
        kind: "definition",
        text:
          "During training, randomly selected neurons are temporarily deactivated with probability p (keep probability q=1−p). To keep the expected activation roughly unchanged, the kept neurons' outputs are scaled up by 1/q — \"inverted dropout.\" At test time, every neuron is active and no scaling is applied.",
      },
      {
        kind: "tip",
        label: "Viva Point",
        text: "Scaling by 1/q compensates for the neurons that were dropped, keeping the expected value of the layer's output roughly the same as it would be with no dropout at all.",
      },
      { kind: "subheading", text: "Comparison" },
      {
        kind: "table",
        headers: ["Technique", "Main idea", "Primary benefit"],
        rows: [
          ["L2 Regularization", "Penalize large weights", "Controls complexity"],
          ["Sparse AE", "Penalize active neurons", "Learns sparse features"],
          ["Contractive AE", "Penalize sensitivity", "Robust representation"],
          ["Early Stopping", "Stop before overfitting", "Prevents excessive training"],
          ["Data Augmentation", "Create transformed samples", "Improves generalization"],
          ["Parameter Sharing", "Reuse parameters", "Fewer parameters"],
          ["Parameter Tying", "Constrain parameters to be related", "Reduces complexity"],
          ["Noise Injection", "Train with corrupted inputs", "Robustness"],
          ["Ensemble Methods", "Combine multiple models", "Reduces variance"],
          ["Dropout", "Randomly deactivate neurons", "Prevents co-adaptation"],
        ],
      },
      { kind: "keyTerms", terms: ["Overfitting", "Dropout"] },
      {
        kind: "thinkAboutIt",
        text: "Every technique in this chapter trades bias for variance. Can you describe a model that's already underfitting (high bias) where adding dropout on top would make its performance worse, not better?",
      },
      {
        kind: "recap",
        points: [
          "Regularization trades a little more bias for a lot less variance, preventing a model from simply memorizing training data.",
          "Sparse AE penalizes active-neuron count; Contractive AE penalizes sensitivity to small input changes; L2 penalizes large weight magnitudes.",
          "Early stopping restores the best validation-epoch model, not the one training happened to stop at.",
          "Dropout randomly deactivates neurons during training (scaling survivors by 1/q) and uses the full network, unscaled, at test time.",
        ],
      },
    ],
  },
  {
    id: "dl-applications",
    number: "Chapter 14",
    title: "Deep Learning Applications & NLP Connections",
    intro: "Where the real math in this book actually shows up in production systems — and how classical NLP and Deep Learning genuinely connect.",
    blocks: [
      {
        kind: "paragraph",
        text:
          "Every classical NLP concept in the NLP Book works with symbolic or count-based representations of text. Deep Learning's contribution is a different kind of representation — dense numeric vectors — and a set of architectures for computing with them. The honest version of \"how NLP uses DL\" is a handful of concrete bridges, not a vague claim that they're related.",
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
      { kind: "subheading", text: "Real-world Deep Learning" },
      {
        kind: "table",
        headers: ["Application", "What it is"],
        rows: [
          ["Image Classification", "CNNs turn a grid of pixels into a class label by learning convolutional filters that detect edges, textures, and shapes at increasing scale. Used in photo tagging, medical imaging, quality inspection."],
          ["Object Detection & Vision", "The same convolution → feature map → pooling pipeline, applied at multiple scales, underlies most real-time vision systems — self-driving perception, surveillance, AR filters."],
          ["Sequence Prediction", "RNNs and LSTMs carry a real hidden state forward through a sequence. Used in time-series forecasting, autocomplete, music generation."],
          ["Speech Recognition", "Audio is chopped into a sequence of frames and fed through a recurrent (or attention-based) model. Used in voice assistants, transcription, dictation."],
          ["Neural Machine Translation", "Modern translation systems use attention so every output word can look back at the most relevant input words. Used in real-time translation, localization, subtitling."],
          ["Large Language Models", "Models like GPT and BERT are stacks of scaled dot-product attention, repeated across many layers and heads, trained on huge amounts of text. Used in chatbots, code assistants, text generation."],
        ],
      },
      {
        kind: "important",
        label: "Honest Scope",
        text:
          "None of the interactive DL labs in this platform run a trained image classifier, speech model, or translation model — those need real trained weights and infrastructure this project doesn't have. What they honestly offer is the real underlying computation (convolution, recurrence, attention) that those production systems are built from.",
      },
      {
        kind: "thinkAboutIt",
        text: "This chapter says cosine similarity and a neuron's weighted sum are structurally the \"same\" comparison — just a learned vector versus a hand-defined one. What has to be mathematically true about two vectors for that comparison to actually make sense in both cases?",
      },
      {
        kind: "recap",
        points: [
          "Deep Learning's core contribution to NLP is a learned, dense vector representation instead of a hand-defined symbolic one.",
          "Three concrete bridges: similarity ↔ weighted sums, n-gram counting ↔ recurrence, pronoun resolution ↔ attention.",
          "CNNs power vision applications, RNN/LSTM power sequence applications, and attention/Transformers power translation and large language models.",
        ],
      },
    ],
  },
  {
    id: "quick-revision",
    number: "Quick Revision",
    title: "Quick Revision",
    intro: "The essentials from every chapter above, condensed for a fast pass before an exam or viva — consolidated from this book's own \"What to study for the exam\" sections.",
    blocks: [
      {
        kind: "recap",
        points: [
          "Must-know definitions: M-P neuron · thresholding logic · step function · perceptron · bias · decision boundary · linear separability · weight update rule · learning rate · Perceptron Convergence Theorem · multilayer perceptron (MLP) · Universal Approximation Theorem · sigmoid neuron · vanishing gradient · neuron, connection, weight, bias · forward propagation · loss function · backpropagation · gradient · stochastic gradient descent · supervised/unsupervised/reinforcement learning · feedforward network, CNN, RNN, LSTM · autoencoder · latent representation · bottleneck · sparse/contractive autoencoder · L2 regularization · early stopping · dropout · data augmentation · parameter sharing/tying.",
          "Must-know formulas: M-P neuron S=Σwᵢxᵢ, y=1 if S≥θ else 0 · perceptron z=wᵀx+b, y=f(z) · perceptron update wᵢ_new=wᵢ_old+η(t−y)xᵢ · sigmoid σ(z)=1/(1+e⁻ᶻ) and its derivative σ(z)(1−σ(z)) · MLP h=f(W₁x+b₁), y=f(W₂h+b₂) · MSE=(predicted−actual)² · output delta δ=y(1−y)(target−y) · weight update Δw=η·δ·output · gradient descent new_weight=old_weight−learning_rate×gradient · L2 objective L_data+(λ/2)Σwᵢ².",
          "Numericals worth redoing by hand: the M-P neuron AND-gate example (S=2, y=1) · the perceptron forward pass and one PLA update step · the email-classifier forward pass (H1=0.8, H2=0, output≈0.636) · the 5-node backprop network's first iteration in full (δ5≈−0.0376, δ3≈−0.0027, δ4≈−0.00819) · sigmoid at z=±2 (σ(2)≈0.8808, σ(−2)≈0.1192).",
          "M-P neuron (1943, no learning) → Perceptron (1958, trainable, but only linearly separable problems) → MLP + sigmoid neurons (nonlinear, solves XOR, trainable via backpropagation) is the historical and conceptual spine of this whole book.",
          "CNNs specialize in spatial data via convolution + pooling; RNN/LSTM specialize in sequential data via a carried hidden state (LSTM adds gates for long-term memory); attention/Transformers process a whole sequence in parallel via Query/Key/Value weighting.",
          "Autoencoders compress then reconstruct input through a bottleneck; regularization (L2, sparsity, dropout, early stopping, augmentation, noise injection, ensembles) exists specifically to stop a model from trivially memorizing or copying its input.",
          "The bias–variance tradeoff is the unifying idea behind every regularization technique: trade a little more bias for a lot less variance.",
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
          { term: "Neuron", definition: "A unit that computes a weighted sum of its inputs plus a bias, then applies a nonlinear activation function to produce its output." },
          { term: "Activation Function", definition: "A nonlinear function applied to a neuron's weighted sum — sigmoid, tanh, ReLU, and softmax are common choices — that shapes its output range and lets stacked layers represent non-linear relationships." },
          { term: "Backpropagation", definition: "The application of the calculus chain rule to compute how much each weight in a network contributed to the current loss, layer by layer, so gradient descent knows which direction to adjust each weight." },
          { term: "Gradient Descent", definition: "An iterative optimization method that updates each weight by a small step in the direction that reduces the loss: w_new = w_old − learning_rate × gradient." },
          { term: "Convolution", definition: "Sliding a small kernel across a grid (like an image), computing a real dot-product at each position to produce a feature map that highlights where a pattern appears." },
          { term: "Pooling", definition: "Downsampling a feature map by summarizing each small window with its max or average value, reducing spatial size while keeping the strongest signal." },
          { term: "Recurrence", definition: "Carrying a hidden state forward from one sequence step to the next, so each step's computation genuinely depends on everything the model has processed so far." },
          { term: "Attention", definition: "A mechanism that computes, for each position in a sequence, a real weighted combination of every other position's Value vector — the weights (softmax over scaled Query·Key scores) genuinely sum to 1." },
          { term: "Softmax", definition: "A function that normalizes a whole vector of real numbers into a probability distribution — every output is between 0 and 1, and they all sum to exactly 1." },
          { term: "Transformer", definition: "A neural architecture built entirely from (multi-head) self-attention and feedforward layers, with no recurrence — every position can attend to every other position in parallel." },
          { term: "Weight", definition: "A learned number that scales one input's contribution to a neuron's weighted sum — how much that input matters to the result." },
          { term: "Bias", definition: "A learned constant added to a neuron's weighted sum, independent of any input — it shifts the whole result up or down before the activation function is applied." },
          { term: "Loss Function", definition: "A function that measures how wrong a single prediction is compared to the true value — small when the prediction is close, large when it's far off." },
          { term: "Learning Rate", definition: "The step size used in each gradient descent update — how far every weight moves in the direction that reduces loss." },
          { term: "Epoch", definition: "One complete pass of the entire training dataset through the network, after which every example has contributed at least one weight update." },
          { term: "Perceptron", definition: "The original (1958, Rosenblatt) single-layer neural model: a weighted sum of inputs plus a bias, passed through a hard step (threshold) activation to produce a binary output." },
          { term: "Multi-Layer Perceptron (MLP)", definition: "A network of neurons arranged in stacked layers (an input layer, one or more hidden layers, and an output layer), which — unlike a single perceptron — can represent non-linear functions." },
          { term: "Overfitting", definition: "When a model fits the training data — including its noise and quirks — so closely that it performs worse on new, unseen data than a simpler model would." },
          { term: "Dropout", definition: "A regularization technique that randomly deactivates a fraction of neurons on each training step, forcing the network to not rely too heavily on any single one of them." },
          { term: "Autoencoder", definition: "A network trained to reconstruct its own input after first compressing it through a smaller 'bottleneck' layer, which forces it to learn a compact representation of the data." },
          { term: "LSTM Gate", definition: "One of an LSTM cell's four learned sigmoid/tanh units — forget, input, candidate, and output — that together control what old memory to discard, what new information to add, and what to expose as this step's output." },
        ],
      },
    ],
  },
];
