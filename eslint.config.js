import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist", "upstream", "artifacts", "node_modules"] },
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts", "mcp/**/*.ts"],
    languageOptions: { parser: tseslint.parser, globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: { ...js.configs.recommended.rules, ...reactHooks.configs.recommended.rules, "no-undef": "off" }
  }
];
