import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * 🧰 ESLint Flat Config for EloquentJS ORM v2
 * Works with TypeScript + Node.js + ESM + CLI scripts
 */
export default [
  // Base JavaScript config (recommended defaults)
  eslint.configs.recommended,

  {
    files: ["**/*.ts", "**/*.js"],
    ignores: [
      "dist/",
      "node_modules/",
      "**/*.d.ts",
      "coverage/"
    ],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },

    plugins: {
      "@typescript-eslint": tseslint
    },

    rules: {
      /* ──────────────────────────────────────────────
       *  GENERAL TYPESCRIPT RULES
       * ────────────────────────────────────────────── */
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      /* ──────────────────────────────────────────────
       *  NODE / CLI ENVIRONMENT RULES
       * ────────────────────────────────────────────── */
      "no-undef": "off",
      "no-console": "off",

      /* ──────────────────────────────────────────────
       *  STYLISTIC PREFERENCES (OPTIONAL)
       * ────────────────────────────────────────────── */
      "semi": ["warn", "always"],
      "quotes": ["warn", "double"],
      "indent": ["warn", 2]
    }
  },

  // 🧩 Override for CLI tools inside /bin (allow CommonJS usage)
  {
    files: ["bin/**/*.js", "bin/**/*.ts"],
    rules: {
      "no-console": "off",
      "no-undef": "off",
      "@typescript-eslint/no-var-requires": "off"
    },
    languageOptions: {
      globals: {
        console: "readonly",
        require: "readonly",
        exports: "readonly",
        module: "readonly"
      }
    }
  }
];
