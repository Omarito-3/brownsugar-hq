import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = [
  { ignores: ["src/generated/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
];

export default eslintConfig;
