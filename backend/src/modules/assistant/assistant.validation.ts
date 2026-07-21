import { z } from 'zod'

export const askAssistantSchema = z.object({
  question: z.string().trim().min(1).max(500),
})
