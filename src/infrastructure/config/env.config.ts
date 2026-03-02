import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Leemos el package.json para obtener la versión real
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

export const ENV = {
  VERSION: pkg.version || '0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  APP_NAME: pkg.name || 'api-service',
};