export interface RelationQuestion {
  id: string;
  pairA: string;
  pairB: string;
  answer: "Hypernym" | "Hyponym" | "Meronym" | "Holonym" | "Homophone";
  explanation: string;
}

export const RELATION_OPTIONS = ["Hypernym", "Hyponym", "Meronym", "Holonym", "Homophone"] as const;

// Word-pair questions are read as "A – B": what relation does A have TO B?
export const RELATION_QUESTIONS: RelationQuestion[] = [
  { id: "SEM-Q1", pairA: "Vehicle", pairB: "Car", answer: "Hypernym", explanation: "Vehicle is the broader category; Car is a specific type of it." },
  { id: "SEM-Q2", pairA: "Car", pairB: "Wheel", answer: "Holonym", explanation: "Car is the whole; Wheel is one of its parts." },
  { id: "SEM-Q3", pairA: "Wheel", pairB: "Car", answer: "Meronym", explanation: "Wheel is a part of the Car (the whole)." },
  { id: "SEM-Q4", pairA: "Flower", pairB: "Rose", answer: "Hypernym", explanation: "Flower is the broader category; Rose is a specific type." },
  { id: "SEM-Q5", pairA: "Sea", pairB: "See", answer: "Homophone", explanation: '"Sea" and "See" sound identical but are unrelated in meaning.' },
  { id: "SEM-Q6", pairA: "Animal", pairB: "Dog", answer: "Hypernym", explanation: "Animal is the broader category; Dog is a specific type." },
  { id: "SEM-Q7", pairA: "Computer", pairB: "Keyboard", answer: "Holonym", explanation: "Computer is the whole; Keyboard is one of its parts." },
  { id: "SEM-Q8", pairA: "Tree", pairB: "Branch", answer: "Holonym", explanation: "Tree is the whole; Branch is one of its parts." },
  { id: "SEM-Q9", pairA: "Fruit", pairB: "Apple", answer: "Hypernym", explanation: "Fruit is the broader category; Apple is a specific type." },
  { id: "SEM-Q10", pairA: "Right", pairB: "Write", answer: "Homophone", explanation: '"Right" and "Write" sound identical but are unrelated in meaning.' },
];
