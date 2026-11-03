import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-config-prettier';

export default defineConfig(
    { ignores: ['node_modules', 'dist', 'data', '.claude'] },
    js.configs.recommended,
    ...tseslint.configs.strict,
    sonarjs.configs.recommended,
    prettier,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    { files: ['test/**/*.ts'], rules: { 'sonarjs/no-duplicate-string': 'off' } },
);
