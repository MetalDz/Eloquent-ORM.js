/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  coverageProvider: "v8",
  roots: ["<rootDir>/src"],
  testMatch: ["**/lab_test/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app/**/*.ts",
    "!src/test/**/*.ts",
    "!src/lab_test/**/*.ts",
  ],
  coveragePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
  coverageReporters: ["text-summary", "json-summary"],
  coverageThreshold: {
    global: {
      lines: 99,
      statements: 99,
      functions: 99,
      branches: 99,
    },
  },
};

