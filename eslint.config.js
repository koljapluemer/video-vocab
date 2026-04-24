import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'crm/**'],
  },

  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),

  {
    name: 'layer/entities',
    files: ['src/entities/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['@/entities/*', '@/dumb/*', '@/features/*', '@/pages/*', '@/app/*'],
      }],
    },
  },
  {
    name: 'layer/features',
    files: ['src/features/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['@/features/*', '@/pages/*', '@/app/*'],
      }],
    },
  },
  {
    name: 'layer/pages',
    files: ['src/pages/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['@/pages/*', '@/app/*'],
      }],
    },
  },
  {
    name: 'layer/dumb',
    files: ['src/dumb/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['@/entities/*', '@/features/*', '@/pages/*', '@/app/*', '@/db/*'],
      }],
    },
  },
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/*.spec.ts'],
  },
  skipFormatting,
]
