import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'build/',
      'next-env.d.ts',
      '*.config.js',
    ],
  },
  {
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/utils',
          message: 'Import from a specific module instead. Available: @/lib/utils/format, @/lib/utils/image, @/lib/utils/serialization, @/lib/utils/url, @/lib/utils/ui. See docs/utils-migration.md for the mapping.'
        }]
      }],
      'react/no-unescaped-entities': 'off',
      'camelcase': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['src/lib/utils.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;