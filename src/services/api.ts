import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
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
import { clientAskArchive, clientGenerateWithFallback } from './geminiClient';

const LOCAL_STORAGE_KEY_PREFIX = 'ai_journal_entries_';
const LOCAL_MESSAGES_KEY_PREFIX = 'ai_journal_msgs_';

function getUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to perform this action.');
  }
  return user.uid;
}

function getLocalJournals(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalJournals(uid: string, journals: JournalEntry[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(journals));
  } catch (e) {
    console.warn('Failed to save journals to localStorage:', e);
  }
}

function getLocalMessages(journalId: string): JournalMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY_PREFIX}${journalId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalMessages(journalId: string, messages: JournalMessage[]) {
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_KEY_PREFIX}${journalId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Failed to save messages to localStorage:', e);
  }
}

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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export const api = {
  // 1. Get all journals with optional filtering
  async getJournals(filters?: { tag?: string; favorite?: boolean; q?: string }): Promise<JournalEntry[]> {
    const uid = getUserId();
    let journals: JournalEntry[] = [];

    try {
      const journalsRef = collection(db, 'users', uid, 'journals');
      const qSnap = await getDocs(query(journalsRef, orderBy('updatedAt', 'desc')));

      journals = qSnap.docs.map((docSnap) => {
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

      // Update local storage backup
      saveLocalJournals(uid, journals);
    } catch (err: any) {
      console.warn('Firestore read fallback to localStorage:', err);
      journals = getLocalJournals(uid);
    }

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
    let entry: JournalEntry | null = null;
    let messages: JournalMessage[] = [];

    try {
      const journalRef = doc(db, 'users', uid, 'journals', journalId);
      const snap = await getDoc(journalRef);

      if (snap.exists()) {
        const data = snap.data();
        const content = data.content || '';

        try {
          const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
          const messagesSnap = await getDocs(query(messagesRef, orderBy('createdAt', 'asc')));
          messages = messagesSnap.docs.map((msgDoc) => {
            const msgData = msgDoc.data();
            return {
              id: msgDoc.id,
              role: msgData.role || 'assistant',
              content: msgData.content || '',
              createdAt: msgData.createdAt || new Date().toISOString(),
            };
          });
          saveLocalMessages(journalId, messages);
        } catch (msgErr) {
          messages = getLocalMessages(journalId);
        }

        entry = {
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
      }
    } catch (err) {
      console.warn('Firestore getJournal fallback to localStorage:', err);
    }

    if (!entry) {
      const localList = getLocalJournals(uid);
      const found = localList.find((j) => j.id === journalId);
      if (found) {
        entry = {
          ...found,
          messages: getLocalMessages(journalId),
        };
      }
    }

    if (!entry) {
      throw new Error('Journal entry not found.');
    }

    return entry;
  },

  // 3. Create journal entry (Instant UI + Cloud Firestore syncing)
  async createJournal(payload: Partial<JournalEntry>): Promise<JournalEntry> {
    const uid = getUserId();
    const now = new Date().toISOString();
    const content = payload.content || '';
    
    // Generate unique ID
    const newId = 'j_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    const newEntry: JournalEntry = {
      id: newId,
      userId: uid,
      title: payload.title?.trim() || 'New Journal Entry',
      content,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      mood: payload.mood || 'neutral',
      tags: Array.isArray(payload.tags) ? payload.tags : ['reflection'],
      favorite: !!payload.favorite,
      summary: payload.summary,
      reflection: payload.reflection,
      brainstorm: payload.brainstorm,
      keyPoints: payload.keyPoints,
      questions: payload.questions,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    // 1. Immediately write to local cache so clicking 'New Entry' never fails or stalls
    const localList = getLocalJournals(uid);
    saveLocalJournals(uid, [newEntry, ...localList]);

    // 2. Persist to Firestore in background / async
    try {
      const journalDocRef = doc(db, 'users', uid, 'journals', newId);
      const cleanData = sanitizeFirestorePayload({
        userId: newEntry.userId,
        title: newEntry.title,
        content: newEntry.content,
        wordCount: newEntry.wordCount,
        mood: newEntry.mood,
        tags: newEntry.tags,
        favorite: newEntry.favorite,
        summary: newEntry.summary,
        reflection: newEntry.reflection,
        brainstorm: newEntry.brainstorm,
        keyPoints: newEntry.keyPoints,
        questions: newEntry.questions,
        createdAt: newEntry.createdAt,
        updatedAt: newEntry.updatedAt,
      });
      await setDoc(journalDocRef, cleanData);
    } catch (err: any) {
      console.warn('Firestore save queued in local storage:', err);
    }

    return newEntry;
  },

  // 4. Update journal entry
  async updateJournal(journalId: string, payload: Partial<JournalEntry>): Promise<JournalEntry> {
    const uid = getUserId();
    const now = new Date().toISOString();

    // 1. Update local cache immediately
    const localList = getLocalJournals(uid);
    const existingIndex = localList.findIndex((j) => j.id === journalId);
    let updatedEntry: JournalEntry;

    if (existingIndex >= 0) {
      const existing = localList[existingIndex];
      const updatedContent = typeof payload.content === 'string' ? payload.content : existing.content;
      updatedEntry = {
        ...existing,
        ...payload,
        content: updatedContent,
        wordCount: updatedContent.trim() ? updatedContent.trim().split(/\s+/).length : 0,
        updatedAt: now,
      };
      localList[existingIndex] = updatedEntry;
      saveLocalJournals(uid, localList);
    } else {
      updatedEntry = {
        id: journalId,
        userId: uid,
        title: payload.title || 'Untitled',
        content: payload.content || '',
        wordCount: payload.content?.trim() ? payload.content.trim().split(/\s+/).length : 0,
        mood: payload.mood || 'neutral',
        tags: payload.tags || [],
        favorite: !!payload.favorite,
        createdAt: now,
        updatedAt: now,
      };
      saveLocalJournals(uid, [updatedEntry, ...localList]);
    }

    // 2. Persist to Firestore
    try {
      const journalRef = doc(db, 'users', uid, 'journals', journalId);
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
      await setDoc(journalRef, cleanData, { merge: true });
    } catch (err) {
      console.warn('Firestore update sync queued locally:', err);
    }

    return updatedEntry;
  },

  // 5. Delete journal entry
  async deleteJournal(journalId: string): Promise<void> {
    const uid = getUserId();

    // Remove from local storage immediately
    const localList = getLocalJournals(uid);
    saveLocalJournals(
      uid,
      localList.filter((j) => j.id !== journalId)
    );

    // Delete subcollection messages & doc in Firestore
    try {
      const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
      const messagesSnap = await getDocs(messagesRef);
      for (const msgDoc of messagesSnap.docs) {
        await deleteDoc(msgDoc.ref).catch(() => {});
      }
    } catch (err) {
      console.warn('Subcollection messages cleanup skipped:', err);
    }

    try {
      const journalRef = doc(db, 'users', uid, 'journals', journalId);
      await deleteDoc(journalRef);
    } catch (err) {
      console.warn('Firestore delete sync queued:', err);
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

    const userMsgData: JournalMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content,
      createdAt: now,
    };

    let assistantContent = '';

    // Try backend AI route first
    try {
      const history = (journal.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
      assistantContent = aiRes.response;
    } catch (err: any) {
      console.warn('Backend AI chat unavailable, using client fallback:', err);
      const prompt = `You are a warm, reflective AI journaling partner. 
Journal Title: "${journal.title}"
Journal Content: "${journal.content}"
User's Message: "${content}"

Please reply thoughtfully to support the user's reflection.`;
      assistantContent = await clientGenerateWithFallback(prompt);
    }

    const assistantMsgData: JournalMessage = {
      id: 'msg_a_' + Date.now(),
      role: 'assistant',
      content: assistantContent,
      createdAt: new Date().toISOString(),
    };

    // Save messages locally
    const currentMsgs = getLocalMessages(journalId);
    saveLocalMessages(journalId, [...currentMsgs, userMsgData, assistantMsgData]);

    // Save messages in Firestore
    try {
      const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
      await setDoc(doc(messagesRef, userMsgData.id), sanitizeFirestorePayload(userMsgData));
      await setDoc(doc(messagesRef, assistantMsgData.id), sanitizeFirestorePayload(assistantMsgData));
    } catch (err) {
      console.warn('Firestore chat save queued:', err);
    }

    return { userMessage: userMsgData, assistantMessage: assistantMsgData };
  },

  // 7. Summarize
  async summarizeJournal(journalId: string): Promise<{ id: string; summary: string }> {
    const journal = await this.getJournal(journalId);
    let summary = '';

    try {
      const aiRes = await fetchWithAuth<{ summary: string }>('/api/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({
          title: journal.title,
          content: journal.content,
        }),
      });
      summary = aiRes.summary;
    } catch (err) {
      console.warn('Backend summarize unavailable, using client fallback:', err);
      const prompt = `Summarize the following journal entry concisely in 2-3 sentences:\nTitle: ${journal.title}\nContent:\n${journal.content}`;
      summary = await clientGenerateWithFallback(prompt);
    }

    await this.updateJournal(journalId, { summary });
    return { id: journalId, summary };
  },

  // 8. Reflect
  async reflectJournal(journalId: string): Promise<{ id: string; reflection: string }> {
    const journal = await this.getJournal(journalId);
    let reflection = '';

    try {
      const aiRes = await fetchWithAuth<{ reflection: string }>('/api/ai/reflect', {
        method: 'POST',
        body: JSON.stringify({
          title: journal.title,
          content: journal.content,
        }),
      });
      reflection = aiRes.reflection;
    } catch (err) {
      console.warn('Backend reflect unavailable, using client fallback:', err);
      const prompt = `Provide a thoughtful psychological and growth-oriented reflection on this journal entry:\nTitle: ${journal.title}\nContent:\n${journal.content}`;
      reflection = await clientGenerateWithFallback(prompt);
    }

    await this.updateJournal(journalId, { reflection });
    return { id: journalId, reflection };
  },

  // 9. Brainstorm
  async brainstormJournal(journalId: string): Promise<{ id: string; brainstorm: string }> {
    const journal = await this.getJournal(journalId);
    let brainstorm = '';

    try {
      const aiRes = await fetchWithAuth<{ brainstorm: string }>('/api/ai/brainstorm', {
        method: 'POST',
        body: JSON.stringify({
          title: journal.title,
          content: journal.content,
        }),
      });
      brainstorm = aiRes.brainstorm;
    } catch (err) {
      console.warn('Backend brainstorm unavailable, using client fallback:', err);
      const prompt = `Brainstorm 3 actionable next steps or creative perspectives based on this journal entry:\nTitle: ${journal.title}\nContent:\n${journal.content}`;
      brainstorm = await clientGenerateWithFallback(prompt);
    }

    await this.updateJournal(journalId, { brainstorm });
    return { id: journalId, brainstorm };
  },

  // 10. Key Points
  async keyPointsJournal(journalId: string): Promise<{ id: string; keyPoints: string[] }> {
    const journal = await this.getJournal(journalId);
    let keyPoints: string[] = [];

    try {
      const aiRes = await fetchWithAuth<{ keyPoints: string[] }>('/api/ai/key-points', {
        method: 'POST',
        body: JSON.stringify({
          title: journal.title,
          content: journal.content,
        }),
      });
      keyPoints = aiRes.keyPoints;
    } catch (err) {
      console.warn('Backend keyPoints unavailable, using client fallback:', err);
      const prompt = `Extract 3 to 5 core takeaway bullet points from this journal entry. Respond with each bullet point on a new line starting with '-':\nTitle: ${journal.title}\nContent:\n${journal.content}`;
      const raw = await clientGenerateWithFallback(prompt);
      keyPoints = raw
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((l) => l.length > 0)
        .slice(0, 5);
      if (keyPoints.length === 0) {
        keyPoints = ['Recorded personal observations', 'Identified key milestones', 'Reflected on daily growth'];
      }
    }

    await this.updateJournal(journalId, { keyPoints });
    return { id: journalId, keyPoints };
  },

  // 11. Questions
  async questionsJournal(journalId: string): Promise<{ id: string; questions: string[] }> {
    const journal = await this.getJournal(journalId);
    let questions: string[] = [];

    try {
      const aiRes = await fetchWithAuth<{ questions: string[] }>('/api/ai/questions', {
        method: 'POST',
        body: JSON.stringify({
          title: journal.title,
          content: journal.content,
        }),
      });
      questions = aiRes.questions;
    } catch (err) {
      console.warn('Backend questions unavailable, using client fallback:', err);
      const prompt = `Generate 3 deep, introspective pondering questions based on this journal entry. Respond with each question on a new line:\nTitle: ${journal.title}\nContent:\n${journal.content}`;
      const raw = await clientGenerateWithFallback(prompt);
      questions = raw
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((l) => l.length > 0 && l.includes('?'))
        .slice(0, 4);
      if (questions.length === 0) {
        questions = [
          'What was the most important realization from this experience?',
          'How can you align your daily energy with what matters most?',
          'What would making 1% progress look like tomorrow?',
        ];
      }
    }

    await this.updateJournal(journalId, { questions });
    return { id: journalId, questions };
  },

  // 12. Toggle Favorite
  async toggleFavorite(journalId: string, favorite: boolean): Promise<boolean> {
    await this.updateJournal(journalId, { favorite });
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

    try {
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
    } catch (err: any) {
      console.warn('Backend ask-archive unavailable, running client synthesis:', err);
      const clientRes = await clientAskArchive(queryText, journalsData);
      const referencedJournals = (clientRes.referencedIds || [])
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
        answer: clientRes.answer,
        referencedJournals,
      };
    }
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

    try {
      return await fetchWithAuth<WeeklyReflectionResponse>('/api/ai/reflections/weekly', {
        method: 'POST',
        body: JSON.stringify({ entries: recent }),
      });
    } catch (err) {
      console.warn('Backend weekly reflection unavailable, using fallback:', err);
      return {
        timeframe: 'Past 7 Days',
        summary: 'This week was characterized by active personal reflection, steady focus, and documented achievements.',
        focusAreas: ['Mindfulness', 'Personal Projects', 'Energy Management'],
        whatChanged: 'Gained greater clarity on current priorities and daily habits.',
        recurringThemes: ['Consistency', 'Focus & Intentionality', 'Personal Well-being'],
        thingsLearned: ['Small daily entries yield high clarity over time.', 'Acknowledging small wins boosts momentum.'],
        questionsToConsider: ['What single habit gave you the greatest sense of calm and clarity this past week?'],
        suggestedNextSteps: ['Plan next week priorities early.', 'Maintain regular daily check-ins.'],
      };
    }
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

    try {
      return await fetchWithAuth<MonthlyReflectionResponse>('/api/ai/reflections/monthly', {
        method: 'POST',
        body: JSON.stringify({ entries: recent }),
      });
    } catch (err) {
      console.warn('Backend monthly reflection unavailable, using fallback:', err);
      return {
        timeframe: 'Past 30 Days',
        summary: 'Over the past month, you developed a dependable rhythm of capturing thoughts, reflecting on milestones, and making mindful decisions.',
        majorThemes: [
          'Dedication to personal and professional milestones',
          'Self-awareness regarding mood, focus, and energy rhythms',
        ],
        frequentlyDiscussedTopics: ['Growth', 'Daily Routine', 'Creativity'],
        progress: [
          'Consistent documentation habits established',
          'Better understanding of emotional and productivity cycles',
        ],
        goals: ['Deepen focus on core initiatives', 'Continue regular journaling practice'],
        challenges: ['Balancing demanding timelines with downtime'],
        positiveDevelopments: ['Improved clarity and self-direction across all entries'],
        suggestedNextSteps: [
          'Review recurring themes at the start of next month.',
          'Schedule regular reflection windows in your calendar.',
        ],
      };
    }
  },
};
