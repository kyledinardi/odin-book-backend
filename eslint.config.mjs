import path from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import { rules as prettierConfigRules } from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

const gitignorePath = path.resolve('.', '.gitignore');

const jsConfig = [
  { name: 'js/config', ...js.configs.recommended },
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
  rules.base.importsStrict,
];

const nodeConfig = [plugins.node, ...configs.node.recommended];

const typescriptConfig = [
  plugins.typescriptEslint,
  ...configs.base.typescript,

  ...tseslint.config(
    tseslint.configs.recommendedTypeChecked,
    { ignores: ['eslint.config.mjs'] },

    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
  ),
];

const prettierConfig = [
  { name: 'prettier/plugin/config', plugins: { prettier: prettierPlugin } },
  { name: 'prettier/config', rules: { ...prettierConfigRules } },
];

export default [
  includeIgnoreFile(gitignorePath),
  ...jsConfig,
  ...nodeConfig,
  ...typescriptConfig,
  ...prettierConfig,
];
