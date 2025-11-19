
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  team: string;
  role: 'user' | 'admin';
  completedAt?: string; // ISO Date string
  scores?: Scores;
}