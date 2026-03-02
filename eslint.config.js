import globals from "globals";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Ignorar archivos de salida y config
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'vitest.config.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Reglas de calidad (ajusta a tu gusto)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['info', 'error'] }],
      // Hexagonal: permitir interfaces vacías para Domain Tags
      '@typescript-eslint/no-empty-interface': 'off',
    },
  },
  // --- CONFIGURACIÓN PARA ARCHIVOS COMMONJS (commitlint, etc.) ---
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Desactivamos reglas de TS que no aplican a archivos JS puros
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  // -------------------------------------------------------------
  // Siempre al final para sobrescribir reglas de formato
  eslintConfigPrettier,
);