// The six guided experiments from the NER Lab Code Playground spec.
// Each one is real, runnable starter code -- loading one just fills the
// editor and input box; the user still has to press Run themselves (no
// auto-run), and every line here has actually been executed against the
// real sandbox runner (backend/app/sandbox/ner_lab_runner.py) to confirm
// it works before shipping it as a starter.
export interface PlaygroundExperiment {
  id: string;
  title: string;
  description: string;
  code: string;
  text: string;
}

const DEFAULT_TEXT = "Satya Nadella visited Microsoft headquarters in Seattle on 12 March 2026.";

export const PLAYGROUND_EXPERIMENTS: PlaygroundExperiment[] = [
  {
    id: "extract-all",
    title: "Extract all entities",
    description: "Run the model on the text and print every entity it finds, with its category.",
    text: DEFAULT_TEXT,
    code: `doc = nlp(text)

for ent in doc.ents:
    print(ent.text, ent.label_)
`,
  },
  {
    id: "only-people",
    title: "Extract only people",
    description: 'Filter the results to one category. Try changing "PERSON" to another label and running again.',
    text: DEFAULT_TEXT,
    code: `doc = nlp(text)

for ent in doc.ents:
    if ent.label_ == "PERSON":
        print(ent.text, ent.label_)
`,
  },
  {
    id: "count-types",
    title: "Count entity types",
    description: "Build a dictionary that counts how many entities fall into each category.",
    text: DEFAULT_TEXT,
    code: `doc = nlp(text)

counts = {}
for ent in doc.ents:
    counts[ent.label_] = counts.get(ent.label_, 0) + 1

print(counts)
`,
  },
  {
    id: "offsets",
    title: "Inspect character offsets",
    description: "Every entity knows exactly where it starts and ends in the original text.",
    text: DEFAULT_TEXT,
    code: `doc = nlp(text)

for ent in doc.ents:
    print(ent.text, ent.label_, ent.start_char, ent.end_char)
`,
  },
  {
    id: "change-input",
    title: "Change the input",
    description: 'Same code as "Extract all entities" -- swap the text below for your own sentence and run it again.',
    text: "Dr. A. P. J. Abdul Kalam was born in Rameswaram, and the company reported a 12% increase in revenue.",
    code: `doc = nlp(text)

for ent in doc.ents:
    print(ent.text, ent.label_)
`,
  },
  {
    id: "as-json",
    title: "Format as JSON",
    description: "Turn each entity into a plain dictionary, ready to serialize as JSON.",
    text: DEFAULT_TEXT,
    code: `import json

doc = nlp(text)

records = []
for ent in doc.ents:
    records.append({
        "text": ent.text,
        "label": ent.label_,
        "start": ent.start_char,
        "end": ent.end_char,
    })

print(json.dumps(records, indent=2))
`,
  },
];

export const DEFAULT_EXPERIMENT = PLAYGROUND_EXPERIMENTS[0];
