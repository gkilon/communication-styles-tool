
export interface QuestionPair {
  id: string;
  pair: [string, string];
  descriptions: [string, string]; // New field for short definitions
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

export interface BackgroundData {
  gender: 'male' | 'female' | 'other' | '';
  isManager: 'yes' | 'no' | '';
  goal: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  team: string; // This will now refer to the Team Name
  teamId?: string;
  role: 'user' | 'admin';
  completedAt?: string; // ISO Date string
  scores?: Scores;
  backgroundData?: BackgroundData;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
}
