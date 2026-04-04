/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  coverageProvider: "babel",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  roots: ["<rootDir>/src"],
  testMatch: ["**/lab_test/**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
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
      lines: 100,
      statements: 100,
      functions: 100,
      branches: 100,
    },
  },
};

