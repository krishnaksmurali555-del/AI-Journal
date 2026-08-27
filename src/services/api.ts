import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, getCurrentUserToken } from '../lib/firebase';
import { sanitizeFirestorePayload } from '../utils/sanitize';
import {
  JournalEntry,
  JournalMessage,
  JournalStats,
  AskMyJournalResponse,
  WeeklyReflectionResponse,
  MonthlyReflectionResponse,
} from '../types';

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getCurrentUserToken();
  if (!token) {
    throw new Error('You must be signed in to perform this action.');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

function getUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to perform this action.');
  }
  return user.uid;
}

export const api = {
  // 1. Get all journals with optional filtering
  async getJournals(filters?: { tag?: string; favorite?: boolean; q?: string }): Promise<JournalEntry[]> {
    const uid = getUserId();
    const journalsRef = collection(db, 'users', uid, 'journals');
    const qSnap = await getDocs(query(journalsRef, orderBy('updatedAt', 'desc')));

    let journals: JournalEntry[] = qSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      const content = data.content || '';
      return {
        id: docSnap.id,
        userId: uid,
        title: data.title || '',
        content,
        wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
        mood: data.mood || 'neutral',
        tags: Array.isArray(data.tags) ? data.tags : [],
        favorite: !!data.favorite,
        summary: data.summary,
        reflection: data.reflection,
        brainstorm: data.brainstorm,
        keyPoints: data.keyPoints,
        questions: data.questions,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        messages: [],
      };
    });

    if (filters?.tag) {
      const targetTag = filters.tag.toLowerCase();
      journals = journals.filter((j) => (j.tags || []).some((t) => t.toLowerCase() === targetTag));
    }

    if (filters?.favorite) {
      journals = journals.filter((j) => j.favorite);
    }

    if (filters?.q) {
      const searchQuery = filters.q.toLowerCase();
      journals = journals.filter(
        (j) =>
          j.title.toLowerCase().includes(searchQuery) ||
          j.content.toLowerCase().includes(searchQuery) ||
          (j.tags || []).some((t) => t.toLowerCase().includes(searchQuery))
      );
    }

    return journals;
  },

  // 2. Get single journal with messages subcollection
  async getJournal(journalId: string): Promise<JournalEntry> {
    const uid = getUserId();
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    const snap = await getDoc(journalRef);

    if (!snap.exists()) {
      throw new Error('Journal entry not found.');
    }

    const data = snap.data();
    const content = data.content || '';
    const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
    const messagesSnap = await getDocs(query(messagesRef, orderBy('createdAt', 'asc')));

    const messages: JournalMessage[] = messagesSnap.docs.map((msgDoc) => {
      const msgData = msgDoc.data();
      return {
        id: msgDoc.id,
        role: msgData.role || 'assistant',
        content: msgData.content || '',
        createdAt: msgData.createdAt || new Date().toISOString(),
      };
    });

    return {
      id: snap.id,
      userId: uid,
      title: data.title || '',
      content,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      mood: data.mood || 'neutral',
      tags: Array.isArray(data.tags) ? data.tags : [],
      favorite: !!data.favorite,
      summary: data.summary,
      reflection: data.reflection,
      brainstorm: data.brainstorm,
      keyPoints: data.keyPoints,
      questions: data.questions,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      messages,
    };
  },

  // 3. Create journal entry
  async createJournal(payload: Partial<JournalEntry>): Promise<JournalEntry> {
    const uid = getUserId();
    const now = new Date().toISOString();
    const content = payload.content || '';
    const rawData = {
      userId: uid,
      title: payload.title?.trim() || 'Untitled Journal',
      content,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      mood: payload.mood || 'neutral',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      favorite: !!payload.favorite,
      summary: payload.summary,
      reflection: payload.reflection,
      brainstorm: payload.brainstorm,
      keyPoints: payload.keyPoints,
      questions: payload.questions,
      createdAt: now,
      updatedAt: now,
    };

    const cleanData = sanitizeFirestorePayload(rawData);
    try {
      const docRef = await addDoc(collection(db, 'users', uid, 'journals'), cleanData);
      return {
        id: docRef.id,
        ...rawData,
        messages: [],
      };
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error(
          `Firestore permission denied. Please ensure Firestore Security Rules in your Firebase Console (ai-journal-c2e5f) allow read and write access for authenticated users.`
        );
      }
      throw err;
    }
  },

  // 4. Update journal entry
  async updateJournal(journalId: string, payload: Partial<JournalEntry>): Promise<JournalEntry> {
    const uid = getUserId();
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    const now = new Date().toISOString();

    const updateFields: any = {
      ...payload,
      updatedAt: now,
    };
    if (typeof payload.content === 'string') {
      updateFields.wordCount = payload.content.trim() ? payload.content.trim().split(/\s+/).length : 0;
    }
    delete updateFields.id;
    delete updateFields.messages;

    const cleanData = sanitizeFirestorePayload(updateFields);
    try {
      await updateDoc(journalRef, cleanData);
      return await this.getJournal(journalId);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error(
          `Firestore permission denied. Please ensure Firestore Security Rules in your Firebase Console allow updates for user ${uid}.`
        );
      }
      throw err;
    }
  },

  // 5. Delete journal entry
  async deleteJournal(journalId: string): Promise<void> {
    const uid = getUserId();
    const journalRef = doc(db, 'users', uid, 'journals', journalId);

    // Delete subcollection messages first if present
    try {
      const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
      const messagesSnap = await getDocs(messagesRef);
      for (const msgDoc of messagesSnap.docs) {
        await deleteDoc(msgDoc.ref).catch(() => {});
      }
    } catch (err) {
      console.warn('Subcollection messages clean-up skipped:', err);
    }

    try {
      await deleteDoc(journalRef);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error(
          `Firestore permission denied while deleting. Please check Firestore Rules in Firebase Console for project ai-journal-c2e5f.`
        );
      }
      throw err;
    }
  },

  // 6. Send message to Gemini for this journal
  async sendMessage(
    journalId: string,
    content: string
  ): Promise<{ userMessage: JournalMessage; assistantMessage: JournalMessage }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);
    const now = new Date().toISOString();

    const userMsgData = {
      role: 'user' as const,
      content,
      createdAt: now,
    };

    const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
    const userDocRef = await addDoc(messagesRef, sanitizeFirestorePayload(userMsgData));
    const userMessage: JournalMessage = {
      id: userDocRef.id,
      ...userMsgData,
    };

    // Prepare history for AI
    const history = (journal.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call server-side Gemini chat
    const aiRes = await fetchWithAuth<{ response: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        journalContext: {
          title: journal.title,
          content: journal.content,
          mood: journal.mood,
          tags: journal.tags,
        },
        history,
        message: content,
      }),
    });

    const assistantMsgData = {
      role: 'assistant' as const,
      content: aiRes.response,
      createdAt: new Date().toISOString(),
    };

    const assistantDocRef = await addDoc(messagesRef, sanitizeFirestorePayload(assistantMsgData));
    const assistantMessage: JournalMessage = {
      id: assistantDocRef.id,
      ...assistantMsgData,
    };

    // Update journal updatedAt
    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      updatedAt: new Date().toISOString(),
    });

    return { userMessage, assistantMessage };
  },

  // 7. Summarize
  async summarizeJournal(journalId: string): Promise<{ id: string; summary: string }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);

    const aiRes = await fetchWithAuth<{ summary: string }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({
        title: journal.title,
        content: journal.content,
      }),
    });

    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      summary: aiRes.summary,
      updatedAt: new Date().toISOString(),
    });

    return { id: journalId, summary: aiRes.summary };
  },

  // 8. Reflect
  async reflectJournal(journalId: string): Promise<{ id: string; reflection: string }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);

    const aiRes = await fetchWithAuth<{ reflection: string }>('/api/ai/reflect', {
      method: 'POST',
      body: JSON.stringify({
        title: journal.title,
        content: journal.content,
      }),
    });

    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      reflection: aiRes.reflection,
      updatedAt: new Date().toISOString(),
    });

    return { id: journalId, reflection: aiRes.reflection };
  },

  // 9. Brainstorm
  async brainstormJournal(journalId: string): Promise<{ id: string; brainstorm: string }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);

    const aiRes = await fetchWithAuth<{ brainstorm: string }>('/api/ai/brainstorm', {
      method: 'POST',
      body: JSON.stringify({
        title: journal.title,
        content: journal.content,
      }),
    });

    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      brainstorm: aiRes.brainstorm,
      updatedAt: new Date().toISOString(),
    });

    return { id: journalId, brainstorm: aiRes.brainstorm };
  },

  // 10. Key Points
  async keyPointsJournal(journalId: string): Promise<{ id: string; keyPoints: string[] }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);

    const aiRes = await fetchWithAuth<{ keyPoints: string[] }>('/api/ai/key-points', {
      method: 'POST',
      body: JSON.stringify({
        title: journal.title,
        content: journal.content,
      }),
    });

    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      keyPoints: aiRes.keyPoints,
      updatedAt: new Date().toISOString(),
    });

    return { id: journalId, keyPoints: aiRes.keyPoints };
  },

  // 11. Questions
  async questionsJournal(journalId: string): Promise<{ id: string; questions: string[] }> {
    const uid = getUserId();
    const journal = await this.getJournal(journalId);

    const aiRes = await fetchWithAuth<{ questions: string[] }>('/api/ai/questions', {
      method: 'POST',
      body: JSON.stringify({
        title: journal.title,
        content: journal.content,
      }),
    });

    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      questions: aiRes.questions,
      updatedAt: new Date().toISOString(),
    });

    return { id: journalId, questions: aiRes.questions };
  },

  // 12. Toggle Favorite
  async toggleFavorite(journalId: string, favorite: boolean): Promise<boolean> {
    const uid = getUserId();
    await updateDoc(doc(db, 'users', uid, 'journals', journalId), {
      favorite,
      updatedAt: new Date().toISOString(),
    });
    return favorite;
  },

  // 13. Ask My Journal (synthesize across private archive)
  async askMyJournal(queryText: string): Promise<AskMyJournalResponse> {
    const journals = await this.getJournals();
    const journalsData = journals.map((j) => ({
      id: j.id,
      title: j.title,
      content: j.content,
      createdAt: j.createdAt,
    }));

    const aiRes = await fetchWithAuth<{ answer: string; referencedIds: string[] }>('/api/ai/ask-archive', {
      method: 'POST',
      body: JSON.stringify({
        query: queryText,
        journals: journalsData,
      }),
    });

    const referencedJournals = (aiRes.referencedIds || [])
      .map((id) => {
        const found = journals.find((j) => j.id === id);
        if (!found) return null;
        return {
          id: found.id,
          title: found.title,
          snippet: found.content.slice(0, 180) + (found.content.length > 180 ? '...' : ''),
          createdAt: found.createdAt,
        };
      })
      .filter(Boolean) as { id: string; title: string; snippet: string; createdAt: string }[];

    return {
      answer: aiRes.answer,
      referencedJournals,
    };
  },

  // 14. Real-time calculated user stats
  async getStats(): Promise<JournalStats> {
    const journals = await this.getJournals();

    const totalJournals = journals.length;
    const favoriteCount = journals.filter((j) => j.favorite).length;

    let wordsWritten = 0;
    const moodBreakdown: Record<string, number> = {
      happy: 0,
      good: 0,
      neutral: 0,
      worried: 0,
      sad: 0,
      angry: 0,
    };
    const tagCountMap: Record<string, number> = {};

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let entriesThisWeek = 0;

    const entryDates = new Set<string>();

    journals.forEach((j) => {
      // Word count
      const words = j.content.trim().split(/\s+/).filter(Boolean).length;
      wordsWritten += words;

      // Mood count
      if (j.mood && moodBreakdown[j.mood] !== undefined) {
        moodBreakdown[j.mood] = (moodBreakdown[j.mood] || 0) + 1;
      }

      // Tags count
      if (Array.isArray(j.tags)) {
        j.tags.forEach((t) => {
          const cleanTag = t.trim().toLowerCase();
          if (cleanTag) {
            tagCountMap[cleanTag] = (tagCountMap[cleanTag] || 0) + 1;
          }
        });
      }

      // Date calculations
      const entryDate = new Date(j.createdAt);
      if (!isNaN(entryDate.getTime())) {
        if (entryDate >= oneWeekAgo) {
          entriesThisWeek++;
        }
        entryDates.add(entryDate.toISOString().split('T')[0]);
      }
    });

    // Calculate streak
    let streak = 0;
    const checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (entryDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today has no entry yet, check yesterday to keep streak alive
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          if (entryDates.has(yesterdayStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    const topTags = Object.entries(tagCountMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalJournals,
      wordsWritten,
      favoriteCount,
      entriesThisWeek,
      writingStreak: streak,
      moodBreakdown,
      topTags,
    };
  },

  // 15. Weekly reflection
  async getWeeklyReflection(): Promise<WeeklyReflectionResponse> {
    const journals = await this.getJournals();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = journals
      .filter((j) => new Date(j.createdAt) >= oneWeekAgo)
      .map((j) => ({
        title: j.title,
        content: j.content,
        mood: j.mood,
        createdAt: j.createdAt,
      }));

    return await fetchWithAuth<WeeklyReflectionResponse>('/api/ai/reflections/weekly', {
      method: 'POST',
      body: JSON.stringify({ entries: recent }),
    });
  },

  // 16. Monthly reflection
  async getMonthlyReflection(): Promise<MonthlyReflectionResponse> {
    const journals = await this.getJournals();
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = journals
      .filter((j) => new Date(j.createdAt) >= oneMonthAgo)
      .map((j) => ({
        title: j.title,
        content: j.content,
        mood: j.mood,
        createdAt: j.createdAt,
      }));

    return await fetchWithAuth<MonthlyReflectionResponse>('/api/ai/reflections/monthly', {
      method: 'POST',
      body: JSON.stringify({ entries: recent }),
    });
  },
};
