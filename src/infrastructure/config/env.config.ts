import 'dotenv/config';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string; name?: string };

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('localhost'),
  DEEPGRAM_API_KEY: z.string().min(1),
  // ── Voice Agent mode (default) or legacy pipeline ─────────────────────────
  AGENT_MODE: z.enum(['voice-agent', 'pipeline']).default('voice-agent'),
  // ── Pipeline-only settings ─────────────────────────────────────────────────
  RESPONSE_MODE: z.enum(['text', 'voice']).default('text'),
  AI_PROVIDER: z.enum(['anthropic', 'gemini']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\nCheck your .env file against .env.example');
  process.exit(1);
}

const { AGENT_MODE, AI_PROVIDER, ANTHROPIC_API_KEY, GEMINI_API_KEY } = parsed.data;

// LLM keys are only required in pipeline mode
if (AGENT_MODE === 'pipeline') {
  if (AI_PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) {
    console.error('Missing required environment variable: ANTHROPIC_API_KEY');
    console.error('Set ANTHROPIC_API_KEY when AI_PROVIDER=anthropic.');
    process.exit(1);
  }

  if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
    console.error('Missing required environment variable: GEMINI_API_KEY');
    console.error('Set GEMINI_API_KEY when AI_PROVIDER=gemini.');
    process.exit(1);
  }
}

export const ENV = {
  VERSION: pkg.version ?? '0.0.0',
  APP_NAME: pkg.name ?? 'api-service',
  ...parsed.data,
};
