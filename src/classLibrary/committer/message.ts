import { z } from "zod";

const CommitMessageSchema = z.object({
  type: z.string(),
  scope: z.string(),
  subject: z.string(),
  changes: z.array(z.string()),
  reason: z.string(),
});

type CommitMessage = z.infer<typeof CommitMessageSchema>;

export { CommitMessageSchema, type CommitMessage };
