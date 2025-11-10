
export interface QuestionPair {
  id: string;
  pair: [string, string];
  columns: [keyof Scores, keyof Scores];
}

export interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface Profile {
  name: string;
  color: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
}
