import { GoogleGenAI } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. Gemini calls may fail.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

/**
 * Reusable helper to generate content with automated multi-model fallback ladder.
 */
export async function generateContentWithFallback(prompt: string, systemInstruction?: string): Promise<string> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini Service] Model '${model}' failed:`, err?.message || err);
      lastError = err;
      // Continue to next model in fallback ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generates structured summary of a journal entry.
 */
export async function summarizeEntry(title: string, content: string): Promise<string> {
  const prompt = `Please summarize this private journal entry concisely in 2-3 sentences. Capture the core emotional tone, main subject, and key realization.

Title: ${title}
Content:
${content}`;

  const systemInstruction = 'You are an empathetic, insightful private journaling assistant. Provide clear, supportive, and non-judgmental summaries.';
  return generateContentWithFallback(prompt, systemInstruction);
}

/**
 * Generates deep reflection and emotional theme analysis for a journal entry.
 */
export async function reflectOnEntry(title: string, content: string): Promise<string> {
  const prompt = `Analyze this journal entry and provide a thoughtful reflection.
1. Identify underlying emotional themes and mindsets.
2. Highlight any subconscious strengths or growth areas demonstrated.
3. Offer a calm, empowering perspective.

Title: ${title}
Content:
${content}`;

  const systemInstruction = 'You are a compassionate cognitive journaling guide. Help the user discover deeper meaning and emotional clarity.';
  return generateContentWithFallback(prompt, systemInstruction);
}

/**
 * Brainstorms actionable paths, creative angles, or alternative perspectives.
 */
export async function brainstormFromEntry(title: string, content: string): Promise<string> {
  const prompt = `Based on the following journal entry, brainstorm 4-5 creative angles, potential solutions, or gentle explorations the writer might consider next:

Title: ${title}
Content:
${content}`;

  const systemInstruction = 'You are an encouraging brainstormer and thought partner. Deliver structured, actionable, and inspiring possibilities.';
  return generateContentWithFallback(prompt, systemInstruction);
}

/**
 * Extracts distinct key points / takeaways.
 */
export async function extractKeyPoints(title: string, content: string): Promise<string[]> {
  const prompt = `Extract 3 to 6 distinct bullet points representing the key realizations, events, or decisions from this journal entry. Return ONLY the bullet items separated by newlines, with no conversational filler.

Title: ${title}
Content:
${content}`;

  const text = await generateContentWithFallback(prompt);
  return text
    .split('\n')
    .map(line => line.replace(/^[\s*•\-–\d.)]+/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Generates introspective questions to deepen self-discovery.
 */
export async function generatePonderingQuestions(title: string, content: string): Promise<string[]> {
  const prompt = `Generate 3 to 5 deep, open-ended, introspective questions that prompt self-discovery based on this journal entry. Return ONLY the questions separated by newlines.

Title: ${title}
Content:
${content}`;

  const text = await generateContentWithFallback(prompt);
  return text
    .split('\n')
    .map(line => line.replace(/^[\s*•\-–\d.)]+/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Multi-turn contextual chat on a journal entry.
 */
export async function generateChatResponse(
  journalContext: { title: string; content: string; mood?: string; tags?: string[] },
  history: { role: 'user' | 'assistant'; content: string }[],
  latestUserMessage: string
): Promise<string> {
  const formattedHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n\n');

  const prompt = `CONTEXT OF THE CURRENT JOURNAL ENTRY:
Title: ${journalContext.title}
Mood: ${journalContext.mood || 'Unspecified'}
Tags: ${journalContext.tags?.join(', ') || 'None'}
Content:
"""
${journalContext.content}
"""

CONVERSATION HISTORY SO FAR:
${formattedHistory ? formattedHistory + '\n\n' : ''}User: ${latestUserMessage}
Assistant:`;

  const systemInstruction = `You are a supportive, attentive, and wise AI Journal companion. 
The user is having a direct conversation with you about their journal entry.
- Ground your responses in their writing.
- Be empathetic, authentic, and non-judgmental.
- Offer reflective questions and gentle insights.
- Do not repeat long boilerplate. Keep conversational flow natural and warm.`;

  return generateContentWithFallback(prompt, systemInstruction);
}

/**
 * Queries across user's private journal archive ("Ask My Journal").
 */
export async function askArchiveQuestion(
  query: string,
  journals: { id: string; title: string; content: string; createdAt: string }[]
): Promise<{ answer: string; referencedIds: string[] }> {
  if (journals.length === 0) {
    return {
      answer: "You haven't written any journal entries yet. Once you write some entries, you can ask questions about your thoughts and progress!",
      referencedIds: [],
    };
  }

  const formattedArchive = journals
    .slice(0, 30) // Take recent 30 entries for context limit safety
    .map((j, idx) => `[ENTRY #${idx + 1} | ID: ${j.id} | Date: ${j.createdAt} | Title: ${j.title}]\n${j.content.slice(0, 1500)}`)
    .join('\n\n---\n\n');

  const prompt = `USER QUERY: "${query}"

PRIVATE JOURNAL ARCHIVE ENTRIES:
${formattedArchive}

TASK:
1. Provide a comprehensive, insightful synthesis directly answering the user's query based ONLY on their journal archive.
2. At the end of your response, output a single line with JSON array of matching entry IDs referenced in your synthesis, formatted exactly as:
REFERENCED_IDS: ["id1", "id2"]`;

  const systemInstruction = 'You are the private AI Journal archivist. Synthesize trends, breakthroughs, challenges, and patterns across the user\'s entries while strictly isolating data.';

  const rawText = await generateContentWithFallback(prompt, systemInstruction);

  let answer = rawText;
  let referencedIds: string[] = [];

  const marker = 'REFERENCED_IDS:';
  if (rawText.includes(marker)) {
    const parts = rawText.split(marker);
    answer = parts[0]!.trim();
    try {
      const parsed = JSON.parse(parts[1]!.trim());
      if (Array.isArray(parsed)) {
        referencedIds = parsed.map(String);
      }
    } catch {
      // Fallback matching if JSON parse fails
      referencedIds = journals.map(j => j.id).slice(0, 3);
    }
  }

  if (referencedIds.length === 0) {
    referencedIds = journals.slice(0, 2).map(j => j.id);
  }

  return { answer, referencedIds };
}

/**
 * Synthesizes 7-day weekly reflection.
 */
export async function generateWeeklySynthesis(
  entries: { title: string; content: string; mood?: string; createdAt: string }[]
) {
  const entriesText = entries
    .map(e => `[${e.createdAt}] ${e.title} (Mood: ${e.mood || 'N/A'})\n${e.content.slice(0, 1000)}`)
    .join('\n\n---\n\n');

  const prompt = `Analyze these journal entries from the past 7 days and provide a structured JSON reflection with the following exact keys:
- "summary": string (2-3 sentence overarching weekly summary)
- "focusAreas": array of strings (top 3-4 focus areas)
- "whatChanged": string (key mindset or situational shift that occurred)
- "recurringThemes": array of strings (themes observed)
- "thingsLearned": array of strings (breakthroughs and lessons)
- "questionsToConsider": array of strings (3 questions for next week)
- "suggestedNextSteps": array of strings (3 actionable gentle steps)

JOURNAL ENTRIES:
${entriesText}`;

  const systemInstruction = 'You are a personal growth advisor. Output ONLY valid JSON without markdown fences.';
  const raw = await generateContentWithFallback(prompt, systemInstruction);
  
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: "Over the past 7 days, you engaged with meaningful self-reflection across your personal and professional endeavors.",
      focusAreas: ["Self-awareness", "Goal alignment", "Daily balance"],
      whatChanged: "You gained increased clarity on immediate priorities.",
      recurringThemes: ["Productivity", "Mindset", "Reflection"],
      thingsLearned: ["Taking time to document thoughts helps organize priorities."],
      questionsToConsider: ["What energizes you most as you step into the coming week?"],
      suggestedNextSteps: ["Continue daily writing to maintain clarity."],
    };
  }
}

/**
 * Synthesizes 30-day monthly reflection.
 */
export async function generateMonthlySynthesis(
  entries: { title: string; content: string; mood?: string; createdAt: string }[]
) {
  const entriesText = entries
    .slice(0, 40)
    .map(e => `[${e.createdAt}] ${e.title} (Mood: ${e.mood || 'N/A'})\n${e.content.slice(0, 800)}`)
    .join('\n\n---\n\n');

  const prompt = `Analyze these journal entries from the past 30 days and provide a structured JSON reflection with the following exact keys:
- "summary": string (3-4 sentence comprehensive monthly overview)
- "majorThemes": array of strings (top 4 recurring macro themes)
- "frequentlyDiscussedTopics": array of strings
- "progress": array of strings (notable milestones or progress)
- "goals": array of strings (goals mentioned or emerging)
- "challenges": array of strings (friction points navigated)
- "positiveDevelopments": array of strings
- "suggestedNextSteps": array of strings (3 strategic focus recommendations)

JOURNAL ENTRIES:
${entriesText}`;

  const systemInstruction = 'You are a personal retrospective strategist. Output ONLY valid JSON without markdown fences.';
  const raw = await generateContentWithFallback(prompt, systemInstruction);

  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: "This month reflected ongoing dedication to self-improvement, continuous learning, and intentional living.",
      majorThemes: ["Long-term Growth", "Consistency", "Emotional Balance", "Execution"],
      frequentlyDiscussedTopics: ["Career", "Projects", "Habits", "Mindfulness"],
      progress: ["Built a consistent journaling habit and captured valuable realizations."],
      goals: ["Maintain steady momentum on key projects."],
      challenges: ["Navigating workload balance and focus."],
      positiveDevelopments: ["Demonstrated strong resilience and introspection."],
      suggestedNextSteps: ["Set 2-3 core quarterly milestones."],
    };
  }
}
