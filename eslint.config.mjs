import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      'src/app/api/n8n/schedules/**',
      'src/app/tools/weekly-scheduler/**',
      'src/hooks/useWeeklyScheduler.ts',
    ],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['jest.setup.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    files: [
      '**/jest.config.js',
      '**/tailwind.config.js',
      '**/next.config.ts',
      '**/postcss.config.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

export default config
