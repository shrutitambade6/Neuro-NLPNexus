export type RelationLabel = "Synonym" | "Antonym" | "Hypernym" | "Hyponym" | "Meronym" | "Holonym";

interface RelationPair {
  a: string;
  b: string;
  relationAtoB: RelationLabel; // "a" is a ___ of "b"
  explanation: string;
}

// A small curated dataset — this is intentionally not exhaustive. Pairs not
// found here honestly report "unable to determine" rather than guessing.
const PAIRS: RelationPair[] = [
  { a: "animal", b: "dog", relationAtoB: "Hypernym", explanation: "Animal is the broader category; dog is a specific type." },
  { a: "flower", b: "rose", relationAtoB: "Hypernym", explanation: "Flower is the broader category; rose is a specific type." },
  { a: "vehicle", b: "car", relationAtoB: "Hypernym", explanation: "Vehicle is the broader category; car is a specific type." },
  { a: "fruit", b: "apple", relationAtoB: "Hypernym", explanation: "Fruit is the broader category; apple is a specific type." },
  { a: "car", b: "wheel", relationAtoB: "Holonym", explanation: "Car is the whole; wheel is one of its parts." },
  { a: "car", b: "engine", relationAtoB: "Holonym", explanation: "Car is the whole; engine is one of its parts." },
  { a: "tree", b: "branch", relationAtoB: "Holonym", explanation: "Tree is the whole; branch is one of its parts." },
  { a: "computer", b: "keyboard", relationAtoB: "Holonym", explanation: "Computer is the whole; keyboard is one of its parts." },
  { a: "hand", b: "finger", relationAtoB: "Holonym", explanation: "Hand is the whole; finger is one of its parts." },
  { a: "happy", b: "joyful", relationAtoB: "Synonym", explanation: "Both words describe a similar positive emotional state." },
  { a: "big", b: "large", relationAtoB: "Synonym", explanation: "Both words describe similar size." },
  { a: "hot", b: "cold", relationAtoB: "Antonym", explanation: "These describe opposite temperature states." },
  { a: "happy", b: "sad", relationAtoB: "Antonym", explanation: "These describe opposite emotional states." },
  { a: "big", b: "small", relationAtoB: "Antonym", explanation: "These describe opposite sizes." },
];

export interface RelationLookupResult {
  found: boolean;
  relation?: RelationLabel;
  direction?: "a-to-b" | "b-to-a";
  explanation?: string;
}

export function lookupRelation(word1: string, word2: string): RelationLookupResult {
  const a = word1.trim().toLowerCase();
  const b = word2.trim().toLowerCase();
  if (!a || !b) return { found: false };

  for (const pair of PAIRS) {
    if (pair.a === a && pair.b === b) {
      return { found: true, relation: pair.relationAtoB, direction: "a-to-b", explanation: pair.explanation };
    }
    if (pair.a === b && pair.b === a) {
      // relation reverses direction for hypernym/hyponym/meronym/holonym
      const reversed: Record<RelationLabel, RelationLabel> = {
        Hypernym: "Hyponym",
        Hyponym: "Hypernym",
        Holonym: "Meronym",
        Meronym: "Holonym",
        Synonym: "Synonym",
        Antonym: "Antonym",
      };
      return {
        found: true,
        relation: reversed[pair.relationAtoB],
        direction: "b-to-a",
        explanation: pair.explanation,
      };
    }
  }
  return { found: false };
}
