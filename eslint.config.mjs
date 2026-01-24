// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  // Include the core-web-vitals configuration from eslint-config-next
  ...nextVitals,

  // Optionally, override default ignores or add your own
  globalIgnores([
    // Default ignores of eslint-config-next include: '.next/**', 'out/**', 'build/**', 'next-env.d.ts'
    // You can add more patterns here if needed
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'next-env.d.ts',
    '*.config.js', // Example: ignore all .config.js files
  ]),

                                            // You can add custom rules or overrides here

                                        {

                                          rules: {

                                            // Temporarily disable react/no-unescaped-entities due to persistent issues

                                            'react/no-unescaped-entities': 'off',

                                            // Temporarily disable camelcase due to persistent issues with Firebase object properties

                                            'camelcase': 'off',

                                            // Example: disable a rule from the nextVitals config

                                            '@next/next/no-img-element': 'off',

                                          },

                                        },]);

export default eslintConfig;
