export type MoodType = 'happy' | 'good' | 'neutral' | 'worried' | 'sad' | 'angry' | '';

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: MoodType;
  tags?: string[];
  favorite?: boolean;
  wordCount?: number;
  summary?: string;
  reflection?: string;
  brainstorm?: string;
  keyPoints?: string[];
  questions?: string[];
  messages?: JournalMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  totalJournals: number;
  wordsWritten: number;
  writingStreak: number;
  entriesThisWeek: number;
  favoriteCount: number;
  topTags: { tag: string; count: number }[];
  moodBreakdown: Record<string, number>;
}

export interface AskMyJournalResponse {
  answer: string;
  referencedJournals: {
    id: string;
    title: string;
    snippet: string;
    createdAt: string;
  }[];
}

export interface WeeklyReflectionResponse {
  timeframe: string;
  summary: string;
  focusAreas: string[];
  whatChanged: string;
  recurringThemes: string[];
  thingsLearned: string[];
  questionsToConsider: string[];
  suggestedNextSteps: string[];
}

export interface MonthlyReflectionResponse {
  timeframe: string;
  summary: string;
  majorThemes: string[];
  frequentlyDiscussedTopics: string[];
  progress: string[];
  goals: string[];
  challenges: string[];
  positiveDevelopments: string[];
  suggestedNextSteps: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
