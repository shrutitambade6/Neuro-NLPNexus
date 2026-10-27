import AutoencoderLab from "../components/dl/AutoencoderLab";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import ModuleQuiz, { type QuizQuestion } from "../components/dl/ModuleQuiz";
import RegularizationLab from "../components/dl/RegularizationLab";
import { SyllabusBadge } from "../components/dl/SyllabusBadge";

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

const REG_TECHNIQUES = [
  { name: "L2 Regularization", idea: "Penalize large weights", benefit: "Controls complexity" },
  { name: "Sparse AE", idea: "Penalize active neurons", benefit: "Learns sparse features" },
  { name: "Contractive AE", idea: "Penalize sensitivity", benefit: "Robust representation" },
  { name: "Early Stopping", idea: "Stop before overfitting", benefit: "Prevents excessive training" },
  { name: "Data Augmentation", idea: "Create transformed samples", benefit: "Improves generalization" },
  { name: "Parameter Sharing", idea: "Reuse parameters", benefit: "Fewer parameters" },
  { name: "Parameter Tying", idea: "Constrain parameters to be related", benefit: "Reduces complexity" },
  { name: "Noise Injection", idea: "Train with corrupted inputs", benefit: "Robustness" },
  { name: "Ensemble Methods", idea: "Combine multiple models", benefit: "Reduces variance" },
  { name: "Dropout", idea: "Randomly deactivate neurons", benefit: "Prevents co-adaptation" },
];

const VALIDATION_LOSS = [
  { epoch: 1, loss: 0.6 },
  { epoch: 2, loss: 0.48 },
  { epoch: 3, loss: 0.38 },
  { epoch: 4, loss: 0.31 },
  { epoch: 5, loss: 0.29 },
  { epoch: 6, loss: 0.3 },
  { epoch: 7, loss: 0.33 },
];

const QUIZ: QuizQuestion[] = [
  {
    question: "What theoretical result connects linear autoencoders and PCA (§9)?",
    options: [
      "They are unrelated techniques",
      "A single-hidden-layer autoencoder with a linear activation and appropriate reconstruction loss can learn a subspace equivalent to PCA's principal subspace",
      "PCA is a special case of a contractive autoencoder",
      "Autoencoders always outperform PCA",
    ],
    correctIndex: 1,
    explanation: "§9: this is the doc's own stated theoretical result — nonlinear autoencoders extend beyond what PCA (a purely linear technique) can represent, but a linear AE is closely related to PCA.",
  },
  {
    question: "Why would an unregularized, powerful autoencoder fail to learn anything useful (§10.1)?",
    options: [
      "It would fail to train at all",
      "It could simply learn the identity mapping x̂ = x, achieving low reconstruction error without learning meaningful features",
      "It would always overfit to noise",
      "It would only work on image data",
    ],
    correctIndex: 1,
    explanation: "§10.1: without regularization, a sufficiently powerful autoencoder can just copy its input to its output, which minimizes reconstruction loss but learns no useful representation.",
  },
  {
    question: "What is the key difference between a Sparse Autoencoder and a Contractive Autoencoder (§12.5, §26)?",
    options: [
      "Sparse AE penalizes active neurons; Contractive AE penalizes sensitivity to input changes (the encoder Jacobian)",
      "They are exactly the same technique with different names",
      "Contractive AE only works on binary data",
      "Sparse AE requires more hidden layers than Contractive AE",
    ],
    correctIndex: 0,
    explanation: "§12.5's comparison table: Sparse AE's regularization is an activation penalty encouraging few active neurons; Contractive AE's is a Jacobian penalty encouraging local invariance to small input changes.",
  },
  {
    question: "In inverted dropout, why is the output scaled by 1/q during training (§20.4)?",
    options: [
      "To make training faster",
      "So the expected activation stays approximately unchanged, since only a fraction q of neurons are kept active",
      "To prevent numerical overflow",
      "It's an arbitrary convention with no mathematical reason",
    ],
    correctIndex: 1,
    explanation: "§20.4: scaling by 1/q compensates for the neurons that were dropped, keeping the expected value of the layer's output roughly the same as it would be with no dropout at all.",
  },
  {
    question: "According to the early-stopping example in §15.3, at which epoch should the saved model come from?",
    options: ["Epoch 7, since that's when training stopped", "Epoch 1", "Epoch 5, where validation loss was at its minimum (0.29)", "Whichever epoch has the lowest training loss"],
    correctIndex: 2,
    explanation: "§15.3: validation loss bottoms out at epoch 5 (0.29) before rising again at epochs 6-7 — early stopping restores the model from the minimum-validation-loss epoch, not the epoch training actually halted at.",
  },
  {
    question: "What distinguishes Dataset Augmentation from Noise Injection (§26)?",
    options: [
      "They are identical techniques",
      "Augmentation creates realistic variations of training examples (rotation, flipping, etc.); Noise Injection deliberately corrupts inputs to force the model to learn robust features",
      "Augmentation only applies to text data",
      "Noise Injection always improves accuracy more than augmentation",
    ],
    correctIndex: 1,
    explanation: "§26: Data Augmentation's transformations aim to look like realistic new examples; Noise Injection's corruption is deliberately unrealistic, specifically to train the model to recover clean signal from corrupted input (as in denoising autoencoders, §18).",
  },
];

export default function DlModule3() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Module 3 — Autoencoders & Regularization</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Rebuilt directly from your uploaded <span className="font-mono text-xs">Autoencoders_1.docx</span> — every
          formula below (including the KL-divergence sparsity penalty and the L2 regularization objective) was
          re-extracted from the document's embedded equations to make sure nothing was approximated from memory.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="dl-module-3" label="Module 3 — Autoencoders" />

      <Section title="What is an autoencoder?" badge={<SyllabusBadge source="Autoencoders_1.docx §1-6" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Learns a compact "latent" representation of its input by encoding, then tries to reconstruct the original from it.
        </p>
        <ReadInBookLink book="dl" chapterId="autoencoders" />
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 font-mono text-xs text-nexus-muted text-center space-y-1">
          <div>h = f_θ(x) &nbsp;(encoder)</div>
          <div>x̂ = g_φ(h) &nbsp;(decoder)</div>
          <div>x̂ = g_φ(f_θ(x)) &nbsp;→&nbsp; objective: x̂ ≈ x</div>
        </div>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Reconstruction loss (§6): MSE for continuous data — L(x,x̂) = (1/n)Σ(xᵢ−x̂ᵢ)² — or Binary Cross-Entropy for
          binary data. Applications (§7) include dimensionality reduction, feature learning, data compression, image
          denoising, anomaly detection, and representation learning.
        </p>
        <AutoencoderLab />
      </Section>

      <Section title="Autoencoders and PCA" badge={<SyllabusBadge source="Autoencoders_1.docx §8-9" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          A linear autoencoder does basically the same compression job as PCA — a nonlinear one can do more.
        </p>
        <ReadInBookLink book="dl" chapterId="autoencoders" label="Read Autoencoders and PCA in the DL Book" />
      </Section>

      <Section title="Why regularize an autoencoder?" badge={<SyllabusBadge source="Autoencoders_1.docx §10" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Without a constraint, a powerful enough autoencoder could just copy its input through — regularization forces it to learn something useful.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" />
      </Section>

      <Section title="Sparse & Contractive Autoencoders" badge={<SyllabusBadge source="Autoencoders_1.docx §11-12" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Sparse AE: "only light up a few neurons at a time." Contractive AE: "similar inputs should produce similar codes."
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read Sparse & Contractive Autoencoders in the DL Book" />
        <RegularizationLab />
      </Section>

      <Section title="Bias–Variance Tradeoff" badge={<SyllabusBadge source="Autoencoders_1.docx §13" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Error = Bias² + Variance + Irreducible Noise. Every regularization technique below trades a little more bias for a lot less variance.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read the Bias–Variance Tradeoff in the DL Book" />
      </Section>

      <Section title="Early stopping, data augmentation, and parameter sharing/tying" badge={<SyllabusBadge source="Autoencoders_1.docx §15-17" />}>
        <div className="grid sm:grid-cols-1 gap-3 text-sm">
          <div>
            <p className="text-nexus-text font-medium mb-1">Early stopping (§15)</p>
            <p className="text-nexus-muted leading-relaxed mb-2">Stop training when validation performance stops improving, and restore the model from its best epoch — not the epoch training actually halted at.</p>
            <div className="overflow-x-auto rounded-xl border border-nexus-border">
              <table className="w-full text-xs">
                <thead><tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt"><th className="py-1.5 px-3">Epoch</th><th className="py-1.5 px-3">Validation loss</th></tr></thead>
                <tbody className="text-nexus-muted">
                  {VALIDATION_LOSS.map((r) => (
                    <tr key={r.epoch} className={`border-b border-nexus-border/50 last:border-0 ${r.epoch === 5 ? "text-nexus-good font-medium" : ""}`}>
                      <td className="py-1.5 px-3 font-mono">{r.epoch}</td>
                      <td className="py-1.5 px-3 font-mono">{r.loss.toFixed(2)}{r.epoch === 5 ? " ← minimum, restore this model" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Dataset augmentation (§16)</p>
            <p className="text-nexus-muted leading-relaxed">Artificially create additional training examples via transformations (rotation, translation, scaling, cropping, flipping, brightness, noise) — reduces overfitting and increases effective dataset size, especially useful when training data is limited.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">Parameter sharing & tying (§17)</p>
            <p className="text-nexus-muted leading-relaxed">Parameter sharing reuses the same parameters in multiple locations (CNNs reusing a filter across positions is the classic example). Parameter tying, specific to autoencoders, constrains the decoder weights to equal the encoder weights' transpose: W_d = W_eᵀ — instead of learning two independent weight matrices, the network learns one.</p>
          </div>
        </div>
      </Section>

      <Section title="L2 regularization — try it yourself" badge={<SyllabusBadge source="Autoencoders_1.docx §14" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Adds a cost for large weights: L_total = L_data + (λ/2)Σwᵢ² — smaller weights tend to mean a less overfit model.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read L2 Regularization in the DL Book" />
        <p className="text-xs text-nexus-muted">The calculator for this is combined into the Sparse/Contractive section above (part B) so all three regularization calculators sit together.</p>
      </Section>

      <Section title="Injecting noise & denoising autoencoders" badge={<SyllabusBadge source="Autoencoders_1.docx §18" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Trained to reconstruct a clean input from a deliberately corrupted version — this forces robust, meaningful features.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read Denoising Autoencoders in the DL Book" />
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3"><p className="text-nexus-text font-medium mb-1">Gaussian noise</p><p className="text-xs text-nexus-muted">x̃ = x + ε, where ε ~ N(0, σ²)</p></div>
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3"><p className="text-nexus-text font-medium mb-1">Masking noise</p><p className="text-xs text-nexus-muted">Randomly set some input values to zero.</p></div>
          <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3"><p className="text-nexus-text font-medium mb-1">Salt-and-pepper noise</p><p className="text-xs text-nexus-muted">Randomly replace values with extreme values.</p></div>
        </div>
      </Section>

      <Section title="Ensemble methods" badge={<SyllabusBadge source="Autoencoders_1.docx §19" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Train several models and combine their outputs (bagging, boosting, voting, averaging) instead of trusting just one.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read Ensemble Methods in the DL Book" />
      </Section>

      <Section title="Dropout" badge={<SyllabusBadge source="Autoencoders_1.docx §20" />}>
        <p className="text-sm text-nexus-muted leading-relaxed">
          Randomly deactivates neurons during training (scaling survivors by 1/q) so the network can't lean on any one of them — then uses the full network at test time.
        </p>
        <ReadInBookLink book="dl" chapterId="regularization" label="Read Dropout in the DL Book" />
      </Section>

      <Section title="Comparison of regularization techniques" badge={<SyllabusBadge source="Autoencoders_1.docx §21" />}>
        <div className="overflow-x-auto rounded-xl border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                <th className="py-2 px-3">Technique</th>
                <th className="py-2 px-3">Main idea</th>
                <th className="py-2 px-3">Primary benefit</th>
              </tr>
            </thead>
            <tbody className="text-nexus-muted">
              {REG_TECHNIQUES.map((r) => (
                <tr key={r.name} className="border-b border-nexus-border/50 last:border-0">
                  <td className="py-2 px-3 text-nexus-text font-medium">{r.name}</td>
                  <td className="py-2 px-3">{r.idea}</td>
                  <td className="py-2 px-3">{r.benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Quiz — check your understanding">
        <ModuleQuiz questions={QUIZ} domain="dl" quizId="dl-module-3-quiz" />
      </Section>

      <Section title="What to study for the exam" badge={<SyllabusBadge source="Autoencoders_1.docx §28" />}>
        <p className="text-xs text-nexus-muted mb-2">
          This document uniquely already contains its own "Key Examination Questions" section (§28), organized by
          mark value — reproduced faithfully below rather than reworded.
        </p>
        <div className="text-sm text-nexus-muted space-y-4 leading-relaxed">
          <div>
            <p className="text-nexus-text font-medium mb-1">2 marks</p>
            <p>Define an autoencoder. What is a latent representation? What is the purpose of the bottleneck layer? Define a sparse autoencoder. What is a contractive autoencoder? Define L2 regularization. What is early stopping? What is dropout? What is data augmentation? What is parameter sharing?</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">5 marks</p>
            <p>Explain the architecture of an autoencoder. Explain the relationship between PCA and linear autoencoders. Explain sparse autoencoders. Explain contractive autoencoders. Explain bias–variance tradeoff. Explain L2 regularization. Explain early stopping with a diagram. Explain denoising autoencoders. Explain dropout. Explain ensemble methods.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">10 marks</p>
            <p>(1) Explain the architecture and working of an autoencoder. Discuss its relationship with PCA and explain how nonlinear autoencoders extend the capabilities of PCA. (2) Explain sparse and contractive autoencoders. Compare their objectives, regularization methods, and applications. (3) Explain the bias–variance tradeoff and discuss L2 regularization, early stopping, and dropout as methods for reducing overfitting. (4) Explain denoising autoencoders and input noise injection. Discuss how parameter sharing, parameter tying, and dataset augmentation improve generalization.</p>
          </div>
          <div>
            <p className="text-nexus-text font-medium mb-1">20 marks</p>
            <p>Explain in detail the concept of autoencoders and regularization techniques used in deep learning. Describe the architecture and working of autoencoders, their relationship with PCA, sparse autoencoders, contractive autoencoders, bias–variance tradeoff, L2 regularization, early stopping, dataset augmentation, parameter sharing and tying, input noise injection, ensemble methods, and dropout. Include suitable diagrams, mathematical formulations, advantages, limitations, and real-world applications.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
