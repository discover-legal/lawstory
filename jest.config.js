// Jest via next/jest (SWC transform, Next's module rules). Node environment by
// default; a suite that needs the DOM opts in with a @jest-environment docblock.
const nextJest = require('next/jest');

module.exports = nextJest({ dir: __dirname })({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
});
