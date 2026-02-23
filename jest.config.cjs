/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/lab_test/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
  coverageReporters: ["text-summary", "json-summary"],
  coverageThreshold: {
    global: {
      lines: 60,
      statements: 55,
      functions: 50,
      branches: 30,
    },
  },
};

