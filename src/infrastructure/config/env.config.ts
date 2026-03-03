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

export const ENV = {
  VERSION: pkg.version ?? '0.0.0',
  APP_NAME: pkg.name ?? 'api-service',
  ...parsed.data,
};
