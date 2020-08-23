module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
    "es2020": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-unused-vars": ["warn", { "vars": "all", "argsIgnorePattern": "^_" }],
    "no-prototype-builtins": ["warn"],
  }
};
