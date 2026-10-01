import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist"]
  },
  js.configs.recommended,
  {
    files: ["client/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser
    }
  },
  {
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    }
  }
];
