import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

// --- Reusable no-restricted-syntax selectors -------------------------------

const NO_RELATIVE_IMPORTS = {
  selector: 'ImportDeclaration[source.value=/^\\.\\.?\\//]',
  message:
    'Relative imports are banned. Use an absolute alias (@main, @shared, @settings, @notch, @mindlr/*).',
};

const NO_RAW_HEADINGS = {
  selector: 'JSXOpeningElement[name.name=/^(h1|h2|h3|h4|p|blockquote)$/]',
  message:
    'Use TypographyH1/H2/H3/H4/P/Blockquote from @shared/components/typography instead of raw heading/paragraph elements.',
};

const NO_RAW_PALETTE = {
  selector:
    "Literal[value=/(?:^|\\s)(?:text|bg|border|ring|from|to|via|fill|stroke|placeholder|outline|decoration|divide|shadow|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d/]",
  message:
    'Raw Tailwind palette colors (e.g. text-neutral-400, bg-emerald-500) are banned. Use semantic tokens like text-foreground, text-muted-foreground, bg-card, bg-primary, etc.',
};

const NO_RAW_COLOR_LITERALS = {
  selector:
    "Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(/]",
  message:
    'Raw color literals (hex/rgb/hsl/oklch) are banned in JSX. Add a token to globals.css and use the semantic utility.',
};

// ---------------------------------------------------------------------------

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/release/**',
      '**/*.gen.ts',
      '**/routeTree.gen.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: { window: 'readonly', document: 'readonly', console: 'readonly' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import/no-cycle': 'error',
    },
  },

  // Project-wide source files: only absolute aliases. shadcn vendored files
  // and the .gen files are exempt via separate overrides below.
  {
    files: ['apps/desktop/src/**/*.{ts,tsx}', 'packages/**/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', NO_RELATIVE_IMPORTS],
    },
  },

  // Hard cap: 200 lines for any .tsx INSIDE features/.
  {
    files: ['**/features/**/*.tsx'],
    rules: {
      'max-lines': [
        'error',
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // Business logic must live in hooks, not components.
  {
    files: ['**/features/**/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tanstack/react-query', '@tanstack/db', '@tanstack/react-db', 'convex/react'],
              message:
                'Components must not import data libraries directly. Put queries/mutations in a hook under ../hooks/.',
            },
            {
              group: ['@shared/db/*', '**/ipcClient', '**/queryKeys'],
              message:
                'Components must not reach into the IPC layer. Use a hook from ../hooks/.',
            },
          ],
        },
      ],
    },
  },

  // DS rules inside features/: bans raw heading/p, raw palette colors, raw
  // color literals. Includes the absolute-imports selector since this block
  // overrides the broader one (ESLint flat config replaces array rules).
  {
    files: ['**/features/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_RELATIVE_IMPORTS,
        NO_RAW_HEADINGS,
        NO_RAW_PALETTE,
        NO_RAW_COLOR_LITERALS,
      ],
    },
  },

  // DS folder is exempt from the 200-line cap.
  {
    files: ['**/renderer/*/components/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
    },
  },

  // shadcn-generated UI primitives — vendored. Relax unused-vars and the
  // absolute-imports rule (shadcn templates ship with ./ sibling imports).
  {
    files: ['**/renderer/*/components/ui/**/*.{ts,tsx}', '**/renderer/shared/components/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  prettier,
];
