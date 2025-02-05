import { z } from 'zod';

export const analyzeEmailSchema = z.object({
  email: z.object({
    id: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    content: z.string(),
    timestamp: z.string()
  })
});

export const suggestSubjectSchema = z.object({
  email: z.object({
    content: z.string().min(1, 'Email content is required')
  })
});

export const completeTextSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  context: z.string().optional()
}); 