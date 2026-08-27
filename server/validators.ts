import { z } from 'zod';

export const createJournalSchema = z.object({
  title: z.string().max(200).default('Untitled Entry'),
  content: z.string().default(''),
  mood: z.enum(['happy', 'good', 'neutral', 'worried', 'sad', 'angry', '']).optional(),
  tags: z.array(z.string().max(50)).default([]),
  favorite: z.boolean().default(false),
});

export const updateJournalSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  mood: z.enum(['happy', 'good', 'neutral', 'worried', 'sad', 'angry', '']).optional(),
  tags: z.array(z.string().max(50)).optional(),
  favorite: z.boolean().optional(),
  summary: z.string().optional(),
  reflection: z.string().optional(),
  brainstorm: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

export const askMyJournalSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(1000),
});
