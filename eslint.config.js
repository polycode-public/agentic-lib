import js from "@eslint/js";
import google from "eslint-config-google";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import promise from "eslint-plugin-promise";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import importPlugin from "eslint-plugin-import";

const modifiedGoogleConfig = { ...google, rules: { ...google.rules } };
delete modifiedGoogleConfig.rules["valid-jsdoc"];
delete modifiedGoogleConfig.rules["require-jsdoc"];

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  modifiedGoogleConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      promise,
      security,
      sonarjs,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "prettier/prettier": "error",
      ...promise.configs.recommended.rules,
      "promise/avoid-new": "warn",
      "promise/no-new-statics": "error",
      "promise/valid-params": "error",
      "promise/prefer-await-to-then": "warn",

      ...sonarjs.configs.recommended.rules,
      "sonarjs/no-nested-conditional": "warn",
      "sonarjs/pseudo-random": "warn",
      "sonarjs/sonar-no-fallthrough": "off",
      "sonarjs/os-command": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/no-commented-code": "off",

      // Enabled non-recommended rules (SonarJS)
      "sonarjs/no-inverted-boolean-check": "warn",
      "sonarjs/no-useless-catch": "warn",

      // Local customizations
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-extra-semi": 2,
      "object-curly-newline": ["error", { consistent: true }],
      "array-element-newline": ["error", "consistent", { multiline: true, minItems: 10 }],
      "import/newline-after-import": ["error", { count: 1 }],
      "camelcase": "off",
      "import/no-amd": "error",
      "import/no-commonjs": "error",
      "import/no-import-module-exports": "error",
      "import/no-cycle": "error",
      "import/no-dynamic-require": "error",
      "import/no-self-import": "off",
      "import/no-unresolved": "off",
      "import/no-useless-path-segments": "error",
      "import/no-duplicates": "error",
      "sonarjs/fixme-tag": "warn",
    },
  },
  {
    files: ["**/*.js"],
    ignores: ["**/tests/**/*.js", "**/*.test.js", "eslint.config.js"],
    rules: {
      ...security.configs.recommended.rules,
      "security/detect-non-literal-regexp": "off",
    },
  },
  {
    files: ["bin/**/*.js", "scripts/**/*.js", "src/actions/**/*.js", "src/scripts/**/*.js"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "off",
    },
  },
  {
    ignores: ["build/", "coverage/", "dist/", "exports/", "node_modules/", "eslint.config.js"],
  },
];
