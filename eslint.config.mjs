// Flat ESLint config for Next.js 16 (next lint was removed; use the ESLint CLI).
import next from "eslint-config-next/core-web-vitals"

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...next,
  {
    rules: {
      // Advisory React-Compiler hint, not a correctness issue. Several effects
      // here legitimately seed state on mount (localStorage rehydrate, initial
      // data load); keep it as a warning rather than failing the build.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]

export default eslintConfig
