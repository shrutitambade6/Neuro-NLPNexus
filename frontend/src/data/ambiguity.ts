export interface AmbiguityExample {
  type: string;
  description: string;
  examples: { language: "English" | "Hindi" | "Marathi"; text: string; explanation: string }[];
}

export const AMBIGUITY_TYPES: AmbiguityExample[] = [
  {
    type: "Lexical Ambiguity",
    description: "A single word has more than one possible meaning.",
    examples: [
      { language: "English", text: '"I went to the bank."', explanation: 'Bank = financial institution, or river bank.' },
      { language: "Hindi", text: '"वह आम खाता है।"', explanation: '"आम" can mean "mango" (noun) or "common/usual" (adjective).' },
      { language: "Marathi", text: '"त्याने पान खाल्लं."', explanation: '"पान" can mean "betel leaf" or, in some contexts, a page — context resolves it.' },
    ],
  },
  {
    type: "Syntactic Ambiguity",
    description: "A sentence can be parsed into more than one valid grammatical structure.",
    examples: [
      { language: "English", text: '"I saw the man with the telescope."', explanation: 'Did I use a telescope to see him, or did he have the telescope?' },
      { language: "Hindi", text: '"राधा ने चश्मे से किताब देखी।"', explanation: 'Similar attachment ambiguity: did Radha use glasses to see the book, or is "चश्मे से" describing the book?' },
      { language: "Marathi", text: '"रोहनने दुर्बिणीने पक्षी पाहिला."', explanation: 'Was the binocular the instrument Rohan used, or attached to the bird?' },
    ],
  },
  {
    type: "Semantic Ambiguity",
    description: "A sentence has multiple possible meanings even with one grammatical structure.",
    examples: [
      { language: "English", text: '"Visiting relatives can be annoying."', explanation: 'Are the relatives who visit annoying, or is the act of visiting them annoying?' },
      { language: "Hindi", text: '"वह हर किसी से प्यार करता है।"', explanation: 'Does he love every specific person, or people in general as a category?' },
      { language: "Marathi", text: '"ती सर्वांशी प्रेमाने वागते."', explanation: 'Similar generic/specific reading ambiguity around "सर्वांशी" (everyone).' },
    ],
  },
  {
    type: "Pragmatic Ambiguity",
    description: "The literal meaning is clear, but the speaker's intent depends on context.",
    examples: [
      { language: "English", text: '"Can you open the window?"', explanation: 'Literally a yes/no question about ability, pragmatically a request to act.' },
      { language: "Hindi", text: '"क्या आप दरवाज़ा बंद कर सकते हैं?"', explanation: 'Same pattern: literal capability question read as a polite request.' },
      { language: "Marathi", text: '"तुम्ही खिडकी उघडू शकता का?"', explanation: 'Again a literal-ability question functioning as a request.' },
    ],
  },
  {
    type: "Referential Ambiguity",
    description: "A pronoun or reference could point to more than one possible antecedent.",
    examples: [
      { language: "English", text: '"John told Peter that he had won."', explanation: 'Does "he" refer to John or Peter?' },
      { language: "Hindi", text: '"राम ने श्याम से कहा कि वह जीत गया।"', explanation: '"वह" (he) could refer to either राम or श्याम.' },
      { language: "Marathi", text: '"रामने श्यामला सांगितले की तो जिंकला."', explanation: '"तो" (he) is similarly ambiguous between the two names.' },
    ],
  },
];
