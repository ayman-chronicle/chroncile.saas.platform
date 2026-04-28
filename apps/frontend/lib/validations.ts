import { z } from "zod";

// Sign-up / sign-in schemas were removed when the WorkOS migration replaced
// our custom email+password flow. Auth lives in `/api/auth/oauth/google` →
// `/api/auth/callback` now.

export const sandboxCreateSchema = z.object({
  name: z.string().trim().min(1, "Sandbox name is required"),
  description: z.string().trim(),
});

export type SandboxCreateInput = z.infer<typeof sandboxCreateSchema>;
