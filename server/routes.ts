import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from './authMiddleware';
import { 
  summarizeEntry, 
  reflectOnEntry, 
  brainstormFromEntry, 
  extractKeyPoints, 
  generatePonderingQuestions, 
  generateChatResponse, 
  askArchiveQuestion,
  generateWeeklySynthesis,
  generateMonthlySynthesis
} from './gemini';

export const apiRouter = Router();

// Enforce authentication on all /api routes
apiRouter.use(requireAuth);

/**
 * Health & Session status
 */
apiRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
    status: 'authenticated',
  });
});

/**
 * POST /api/ai/summarize - Summarize journal content
 */
apiRouter.post('/ai/summarize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Untitled Entry', content = '' } = req.body || {};
    if (!content.trim()) {
      return res.status(400).json({ error: 'Journal content is required for summarization.' });
    }

    const summary = await summarizeEntry(title, content);
    res.json({ summary });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

/**
 * POST /api/ai/reflect - Deep psychological/emotional reflection
 */
apiRouter.post('/ai/reflect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Untitled Entry', content = '' } = req.body || {};
    if (!content.trim()) {
      return res.status(400).json({ error: 'Journal content is required for reflection.' });
    }

    const reflection = await reflectOnEntry(title, content);
    res.json({ reflection });
  } catch (error: any) {
    console.error('Error generating reflection:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reflection' });
  }
});

/**
 * POST /api/ai/brainstorm - Brainstorm actions and angles
 */
apiRouter.post('/ai/brainstorm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Untitled Entry', content = '' } = req.body || {};
    if (!content.trim()) {
      return res.status(400).json({ error: 'Journal content is required for brainstorming.' });
    }

    const brainstorm = await brainstormFromEntry(title, content);
    res.json({ brainstorm });
  } catch (error: any) {
    console.error('Error generating brainstorm:', error);
    res.status(500).json({ error: error.message || 'Failed to generate brainstorm' });
  }
});

/**
 * POST /api/ai/key-points - Extract key takeaways
 */
apiRouter.post('/ai/key-points', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Untitled Entry', content = '' } = req.body || {};
    if (!content.trim()) {
      return res.status(400).json({ error: 'Journal content is required.' });
    }

    const keyPoints = await extractKeyPoints(title, content);
    res.json({ keyPoints });
  } catch (error: any) {
    console.error('Error extracting key points:', error);
    res.status(500).json({ error: error.message || 'Failed to extract key points' });
  }
});

/**
 * POST /api/ai/questions - Generate introspective pondering questions
 */
apiRouter.post('/ai/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Untitled Entry', content = '' } = req.body || {};
    if (!content.trim()) {
      return res.status(400).json({ error: 'Journal content is required.' });
    }

    const questions = await generatePonderingQuestions(title, content);
    res.json({ questions });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

/**
 * POST /api/ai/chat - Contextual chat on a specific journal
 */
apiRouter.post('/ai/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { journalContext = {}, history = [], message = '' } = req.body || {};
    if (!message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const response = await generateChatResponse(journalContext, history, message);
    res.json({ response });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat message' });
  }
});

/**
 * POST /api/ai/ask-archive - Cross-journal query synthesis
 */
apiRouter.post('/ai/ask-archive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query = '', journals = [] } = req.body || {};
    if (!query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const result = await askArchiveQuestion(query, journals);
    res.json(result);
  } catch (error: any) {
    console.error('Error in ask-archive:', error);
    res.status(500).json({ error: error.message || 'Failed to query journal archive' });
  }
});

/**
 * POST /api/ai/reflections/weekly - Weekly reflection synthesis
 */
apiRouter.post('/ai/reflections/weekly', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entries = [] } = req.body || {};
    const reflection = await generateWeeklySynthesis(entries);
    res.json(reflection);
  } catch (error: any) {
    console.error('Error generating weekly reflection:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize weekly reflection' });
  }
});

/**
 * POST /api/ai/reflections/monthly - Monthly reflection synthesis
 */
apiRouter.post('/ai/reflections/monthly', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entries = [] } = req.body || {};
    const reflection = await generateMonthlySynthesis(entries);
    res.json(reflection);
  } catch (error: any) {
    console.error('Error generating monthly reflection:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize monthly reflection' });
  }
});
