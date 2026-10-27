import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Eye,
  Image as ImageIcon,
  Languages,
  MessageSquareText,
  Mic,
  Repeat,
} from "lucide-react";
import { Link } from "react-router-dom";

import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";

interface AppCard {
  icon: LucideIcon;
  name: string;
  blurb: string;
  usedIn: string;
  labPath: string;
  labName: string;
}

const APPS: AppCard[] = [
  {
    icon: ImageIcon,
    name: "Image Classification",
    blurb: "CNNs turn a grid of pixels into a class label by learning convolutional filters that detect edges, textures, and shapes at increasing scale.",
    usedIn: "Photo tagging · Medical imaging · Quality inspection",
    labPath: "/cnn-lab",
    labName: "CNN Lab",
  },
  {
    icon: Eye,
    name: "Object Detection & Vision",
    blurb: "The same convolution → feature map → pooling pipeline, applied at multiple scales, underlies most real-time vision systems.",
    usedIn: "Self-driving perception · Surveillance · AR filters",
    labPath: "/cnn-lab",
    labName: "CNN Lab",
  },
  {
    icon: Repeat,
    name: "Sequence Prediction",
    blurb: "RNNs and LSTMs carry a real hidden state forward through a sequence, letting a model's prediction at each step depend on everything it's seen so far.",
    usedIn: "Time-series forecasting · Autocomplete · Music generation",
    labPath: "/rnn-lstm-lab",
    labName: "RNN & LSTM Lab",
  },
  {
    icon: Mic,
    name: "Speech Recognition",
    blurb: "Audio is chopped into a sequence of frames and fed through a recurrent (or attention-based) model, the same sequence-processing idea as the RNN/LSTM lab, applied to sound instead of text.",
    usedIn: "Voice assistants · Transcription · Dictation",
    labPath: "/rnn-lstm-lab",
    labName: "RNN & LSTM Lab",
  },
  {
    icon: Languages,
    name: "Neural Machine Translation",
    blurb: "Modern translation systems use attention so every output word can look back at the most relevant input words — exactly the Q/K/V mechanism in the Attention Lab, at production scale.",
    usedIn: "Real-time translation · Localization · Subtitling",
    labPath: "/attention-transformers",
    labName: "Attention & Transformers Lab",
  },
  {
    icon: MessageSquareText,
    name: "Large Language Models",
    blurb: "Models like GPT and BERT are stacks of the same scaled dot-product attention computed in this lab, repeated across many layers and heads, trained on huge amounts of text.",
    usedIn: "Chatbots · Code assistants · Text generation",
    labPath: "/attention-transformers",
    labName: "Attention & Transformers Lab",
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

function ConnectorRow({ nlpConcept, nlpPath, dlConcept, dlPath, note }: { nlpConcept: string; nlpPath: string; dlConcept: string; dlPath: string; note: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-nexus-border bg-nexus-surfaceAlt px-4 py-3">
      <Link to={nlpPath} className="text-sm font-medium text-nexus-accent hover:underline shrink-0">
        {nlpConcept}
      </Link>
      <ArrowRight size={14} className="text-nexus-muted shrink-0" />
      <Link to={dlPath} className="text-sm font-medium text-nexus-accent hover:underline shrink-0">
        {dlConcept}
      </Link>
      <span className="text-xs text-nexus-muted sm:ml-2">{note}</span>
    </div>
  );
}

export default function DlApplications() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Deep Learning Applications</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Where the real math in the Deep Learning labs actually shows up in production systems —
          and, since this platform started as an NLP lab, how the two domains genuinely connect
          rather than sitting side by side as unrelated sections.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="dl-applications" label="Deep Learning Applications" />
      <ReadInBookLink book="dl" chapterId="dl-applications" label="Read the full chapter in the DL Book" />

      <Section title="How NLP uses Deep Learning">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Every classical NLP lab on this platform (tokenization, n-gram language models, TF-IDF,
          WordNet similarity) works with symbolic or count-based representations of text. Deep
          Learning's contribution is a different kind of representation — dense numeric vectors —
          and a set of architectures for computing with them. The honest version of "how NLP uses
          DL" is a handful of concrete bridges, not a vague claim that they're related:
        </p>
        <div className="space-y-2">
          <ConnectorRow
            nlpConcept="Semantic Lab: cosine/TF-IDF similarity"
            nlpPath="/semantics"
            dlConcept="DL Foundations: a neuron's weighted sum"
            dlPath="/dl-foundations"
            note="— both compare vectors; DL just learns the vector instead of hand-defining it."
          />
          <ConnectorRow
            nlpConcept="Language Modeling: n-gram sequence probability"
            nlpPath="/language-modeling"
            dlConcept="RNN & LSTM Lab: sequence modeling"
            dlPath="/rnn-lstm-lab"
            note="— n-grams count fixed windows; RNNs carry a learned hidden state across the whole sequence."
          />
          <ConnectorRow
            nlpConcept="Discourse Lab: pronoun/antecedent resolution"
            nlpPath="/discourse"
            dlConcept="Attention Lab: token-to-token attention weights"
            dlPath="/attention-transformers"
            note="— both are about which earlier words a model should 'look back' at."
          />
        </div>
        <p className="text-xs text-nexus-muted">
          This is deliberately not a claim that this platform's classical NLP labs and DL labs
          share code or a trained model — they're separate, real implementations. The connection
          above is conceptual: the same underlying problem, solved with two different toolkits.
        </p>
      </Section>

      <Section title="Real-world Deep Learning">
        <p className="text-xs text-nexus-muted">
          Each card below links to the actual real lab that computes its underlying math — nothing
          here is a separate, decorative demo; "Try it" opens the genuine implementation.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {APPS.map((app) => (
            <div key={app.name} className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-2">
              <div className="flex items-center gap-2">
                <app.icon size={16} className="text-nexus-accent" />
                <h3 className="text-sm font-medium">{app.name}</h3>
              </div>
              <p className="text-xs text-nexus-muted leading-relaxed">{app.blurb}</p>
              <p className="text-[11px] text-nexus-muted">{app.usedIn}</p>
              <Link
                to={app.labPath}
                className="inline-flex items-center gap-1 text-xs text-nexus-accent hover:underline"
              >
                Try it in {app.labName} <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What this page isn't">
        <p className="text-xs text-nexus-muted leading-relaxed">
          This page doesn't run a trained image classifier, speech model, or translation model —
          those need real trained weights and infrastructure this project doesn't have. What it
          does honestly offer is the real underlying computation (convolution, recurrence,
          attention) that those production systems are built from, which you can run yourself in
          the linked labs.
        </p>
      </Section>
    </div>
  );
}
