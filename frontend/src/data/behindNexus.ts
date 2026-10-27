// "Behind the Nexus" content (2026-10-08 user spec, reproduced verbatim
// below for every name/role/quote/link — see the project doc for the
// full original request). This file exists so every piece of real,
// person-specific text lives in exactly ONE place, never duplicated or
// paraphrased inside a component, and so it's obvious at a glance that
// nothing here was invented: every string is either a literal quote from
// the user's own spec or one of the two official external links they
// gave us (the VIT faculty pages, the LinkedIn URL). Do NOT add anything
// to this file that isn't traceable to that spec — no fabricated
// achievements, qualifications, or bio details for either faculty
// mentor, and no exaggerated skills/experience for the builder.
export type BehindNexusNodeId = "nlp" | "dl" | "builder";

export interface MentorContent {
  id: "nlp" | "dl";
  node: "NLP" | "DEEP LEARNING";
  name: string;
  role: string;
  institution: string;
  appreciation: string;
  profileUrl: string;
  colorToken: "purple" | "gold";
}

export interface BuilderContent {
  id: "builder";
  node: "BUILDER";
  name: string;
  role: string;
  subtitle: string;
  openingLines: string[];
  skills: string[];
  linkedinUrl: string;
  colorToken: "data";
}

export const NEXUS_CORE_LABEL = "NEURONLP NEXUS";

export const MENTORS: MentorContent[] = [
  {
    id: "nlp",
    node: "NLP",
    name: "Dr. Suja Jayachandran",
    role: "NLP Faculty Mentor",
    institution: "Vidyalankar Institute of Technology",
    appreciation:
      "A sincere thank you to Dr. Suja Jayachandran for the knowledge, guidance, and perspective that helped shape my understanding of Natural Language Processing. Her emphasis on thinking beyond the textbook and applying concepts through projects became an important inspiration for this learning platform.",
    profileUrl: "https://vit.edu.in/faculty/sujajayachandran/",
    colorToken: "purple",
  },
  {
    id: "dl",
    node: "DEEP LEARNING",
    name: "Dr. Umesh Kulkarni",
    role: "Deep Learning Faculty Mentor",
    institution: "Vidyalankar Institute of Technology",
    appreciation:
      "A heartfelt thank you to Dr. Umesh Kulkarni for his guidance and academic contribution to my understanding of Deep Learning. The concepts learned through his teaching became an important foundation for the Deep Learning side of NeuroNLP Nexus.",
    profileUrl: "https://vit.edu.in/faculty/drumeshkulkarni/",
    colorToken: "gold",
  },
];

export const BUILDER: BuilderContent = {
  id: "builder",
  node: "BUILDER",
  name: "Shruti Tambade",
  role: "Concept • Design • Development",
  subtitle: "Computer Engineering Student · Builder · Learner · Designer",
  openingLines: [
    "I didn't want to build another website full of notes.",
    "I wanted to explore what happens when technical education becomes interactive — when concepts can be visualized, algorithms can be experimented with, connections can be discovered, and learning can feel like exploration rather than memorization.",
  ],
  skills: ["AI / ML", "NLP", "Deep Learning", "UI/UX", "Full-Stack Development", "Creative Technology"],
  linkedinUrl: "https://www.linkedin.com/in/shrutitambade6",
  colorToken: "data",
};

export const INSPIRATION_CARDS = [
  {
    index: "01",
    label: "LEARN",
    text: "Turning academic concepts into interactive learning experiences.",
  },
  {
    index: "02",
    label: "EXPERIMENT",
    text: "Making algorithms something students can see, run and understand.",
  },
  {
    index: "03",
    label: "CONNECT",
    text: "Showing how NLP and Deep Learning intersect instead of treating them as isolated subjects.",
  },
] as const;
