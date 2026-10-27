export interface WordNetEntry {
  word: string;
  definitions: string[];
  synonyms: string[];
  hypernyms: string[];
  hyponyms: string[];
  meronyms: string[];
}

// A tiny curated dataset, NOT a live WordNet API — honestly labeled as
// "Educational Demo Data" wherever it's shown in the UI, per the brief.
export const WORDNET_DEMO: Record<string, WordNetEntry> = {
  dog: {
    word: "dog",
    definitions: ["A domesticated carnivorous mammal, often kept as a pet or working animal."],
    synonyms: ["canine", "hound"],
    hypernyms: ["animal", "mammal"],
    hyponyms: ["labrador", "bulldog", "poodle"],
    meronyms: ["tail", "paw", "snout"],
  },
  bank: {
    word: "bank",
    definitions: [
      "A financial institution that accepts deposits and channels money into lending activities.",
      "The land alongside a river or lake.",
    ],
    synonyms: ["financial institution"],
    hypernyms: ["institution", "landform"],
    hyponyms: ["savings bank", "riverbank"],
    meronyms: [],
  },
  car: {
    word: "car",
    definitions: ["A road vehicle, typically with four wheels, powered by an engine or motor."],
    synonyms: ["automobile", "vehicle"],
    hypernyms: ["vehicle"],
    hyponyms: ["sedan", "hatchback", "suv"],
    meronyms: ["wheel", "engine", "door"],
  },
  book: {
    word: "book",
    definitions: [
      "A written or printed work consisting of pages bound together.",
      "To reserve something in advance.",
    ],
    synonyms: ["publication", "volume"],
    hypernyms: ["publication", "written work"],
    hyponyms: ["novel", "textbook"],
    meronyms: ["page", "chapter", "cover"],
  },
  flower: {
    word: "flower",
    definitions: ["The reproductive structure of a flowering plant, often colorful and used decoratively."],
    synonyms: ["bloom", "blossom"],
    hypernyms: ["plant part"],
    hyponyms: ["rose", "tulip", "lily"],
    meronyms: ["petal", "stem"],
  },
};
